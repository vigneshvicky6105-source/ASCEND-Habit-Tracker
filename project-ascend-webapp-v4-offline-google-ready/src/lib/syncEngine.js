import { supabase, fetchUserRecords, upsertUserRecords, deleteUserRecords } from "./supabase.js";
import {
  idbGetUserRecords,
  idbSaveUserRecords,
  idbGetMeta,
  idbSetMeta,
  idbEnqueueOutbox,
  idbGetOutbox,
  idbRemoveOutbox
} from "./db.js";
import { getRealtimeChannelStatus } from "./realtime.js";

// --- SYNC STATES MODEL ---
export const SYNC_STATES = {
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR"
};

// Toggle structured console logging (enabled in DEV mode)
const ENABLE_SYNC_LOGS = typeof import.meta !== "undefined" && import.meta.env ? !!import.meta.env.DEV : false;

class AscendSyncEngine {
  constructor() {
    this.status = typeof navigator !== "undefined" && navigator.onLine ? SYNC_STATES.SYNCED : SYNC_STATES.OFFLINE;
    this.lastError = null;
    this.listeners = new Set();
    this.maxRetries = 5;
    this.isReconciling = false;
    this.currentUser = null;

    // Diagnostic tracking metrics
    this.lastSyncTime = null;
    this.lastPullTime = null;
    this.lastPushTime = null;
    this.lastSuccessfulOp = null;
    this.logsHistory = [];

    // Listen to network status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnlineRecovery());
      window.addEventListener("offline", () => this.setStatus(SYNC_STATES.OFFLINE));
    }
  }

  log(category, message, ...args) {
    const entry = {
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      category,
      message: typeof message === "object" ? JSON.stringify(message) : String(message),
      details: args.length > 0 ? args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") : null
    };

    this.logsHistory.unshift(entry);
    if (this.logsHistory.length > 100) {
      this.logsHistory.pop();
    }

    if (ENABLE_SYNC_LOGS) {
      console.log(`[ASCEND SYNC - ${category}]`, message, ...args);
    }
  }

  recordSuccessfulOp(opName, details = null) {
    this.lastSuccessfulOp = {
      name: opName,
      details,
      timestamp: new Date().toISOString()
    };
    this.log("SUCCESS", `Op: ${opName}`, details || "");
  }

  subscribeStatus(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyStatus() {
    this.listeners.forEach(fn => fn(this.status, this.lastError));
  }

  setStatus(newStatus, error = null) {
    this.status = newStatus;
    if (error) {
      this.lastError = error.message || String(error);
      this.log("ERROR", this.lastError);
    } else if (newStatus === SYNC_STATES.SYNCED) {
      this.lastSyncTime = new Date().toISOString();
    }
    this.notifyStatus();
  }

  // --- ONLINE RECOVERY & EVENT LISTENERS ---
  async handleOnlineRecovery() {
    this.log("AUTH", "Network restored. Triggering online recovery...");
    if (this.currentUser) {
      await this.reconcile(this.currentUser);
    } else {
      this.setStatus(SYNC_STATES.SYNCED);
    }
  }

  // --- EXPLICIT SUPABASE REQUEST WRAPPER ---
  async executeSupabaseQuery(requestFn, contextTag) {
    try {
      const { data, error } = await requestFn();
      if (error) {
        this.log("ERROR", `Failed request in ${contextTag}: ${error.message}`);
        throw new Error(`[ASCEND SYNC ERROR - ${contextTag}] ${error.message}`);
      }
      this.recordSuccessfulOp(contextTag);
      return data;
    } catch (err) {
      this.setStatus(SYNC_STATES.ERROR, err);
      throw err;
    }
  }

  // --- DRAIN OUTBOX QUEUE WITH EXPONENTIAL BACKOFF & IDEMPOTENT OPERATIONS ---
  async drainOutbox(userId) {
    const pendingOutbox = await idbGetOutbox(userId).catch(() => []);
    if (!pendingOutbox || pendingOutbox.length === 0) {
      this.lastPushTime = new Date().toISOString();
      return;
    }

    this.log("PUSH", `Draining ${pendingOutbox.length} pending offline mutations...`);

    for (const item of pendingOutbox) {
      const retryCount = item.retryCount || item.attempts || 0;

      if (retryCount >= this.maxRetries) {
        this.log("ERROR", `Quarantining operation ${item.operationId || item.id} after ${retryCount} failed retries.`);
        await idbRemoveOutbox(item.id);
        continue;
      }

      if (retryCount > 0) {
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, retryCount));
        this.log("PUSH", `Retrying operation ${item.operationId || item.id} (Attempt ${retryCount + 1}/${this.maxRetries}) after ${backoffMs}ms backoff...`);
        await new Promise(r => setTimeout(r, backoffMs));
      }

      try {
        if (item.operationType === "delete" || item.action === "delete") {
          await deleteUserRecords(item.entity || item.table, item.payload || item.match);
        } else if (item.operationType === "upsert" || item.action === "upsert") {
          await upsertUserRecords(item.entity || item.table, item.payload || item.data, item.onConflict || "id");
        }
        this.recordSuccessfulOp(`PushOutbox(${item.entity || item.table})`, item.operationId || item.id);
        await idbRemoveOutbox(item.id);
      } catch (err) {
        item.retryCount = retryCount + 1;
        item.lastError = err.message || String(err);
        this.log("ERROR", `Failed outbox push for operation ${item.operationId || item.id}: ${item.lastError}`);
        await idbEnqueueOutbox(userId, item);
      }
    }
    this.lastPushTime = new Date().toISOString();
  }

  // --- FULL PULL & RECONCILIATION ---
  async reconcile(user, onStateUpdate) {
    if (!supabase || !user) {
      this.setStatus(SYNC_STATES.OFFLINE);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setStatus(SYNC_STATES.OFFLINE);
      return;
    }

    if (this.isReconciling) return;
    this.isReconciling = true;
    this.currentUser = user;
    const userId = user.id;

    this.setStatus(SYNC_STATES.SYNCING);
    this.log("PULL", `Starting reconciliation for user ${userId}...`);

    try {
      // 1. Drain pending local outbox first
      await this.drainOutbox(userId);

      // 2. Fetch cloud records for all 9 user entities with explicit error checking
      const [
        cloudTasks, cloudCompletions, cloudBooks, cloudWishlist,
        cloudSideQuests, cloudConcepts, cloudDues, cloudFitness, cloudFocus
      ] = await Promise.all([
        fetchUserRecords("tasks", userId),
        fetchUserRecords("task_completions", userId),
        fetchUserRecords("books", userId),
        fetchUserRecords("wishlist", userId),
        fetchUserRecords("side_quests", userId),
        fetchUserRecords("core_concepts", userId),
        fetchUserRecords("dues", userId),
        fetchUserRecords("fitness_logs", userId),
        fetchUserRecords("daily_focus", userId)
      ]);

      this.lastPullTime = new Date().toISOString();
      this.recordSuccessfulOp("PullCloudState", `User: ${userId}`);
      this.log("PULL", "Cloud data fetched successfully. Applying LWW conflict resolution...");

      // 3. Reconcile with UI state & Local Cache via callback
      if (onStateUpdate) {
        await onStateUpdate({
          cloudTasks, cloudCompletions, cloudBooks, cloudWishlist,
          cloudSideQuests, cloudConcepts, cloudDues, cloudFitness, cloudFocus
        });
      }

      this.setStatus(SYNC_STATES.SYNCED);
      this.log("SUCCESS", `Synchronization complete. Account ${userId} in SYNCED state.`);
    } catch (err) {
      this.setStatus(SYNC_STATES.ERROR, err);
    } finally {
      this.isReconciling = false;
    }
  }

  // --- REALTIME EVENT HANDLER ---
  handleRealtimeEvent(payload, reconcileFn) {
    this.log("REALTIME", `Incoming ${payload.eventType} event on table ${payload.table}:`, payload);
    this.setStatus(SYNC_STATES.SYNCING);
    reconcileFn()
      .then(() => this.setStatus(SYNC_STATES.SYNCED))
      .catch(err => this.setStatus(SYNC_STATES.ERROR, err));
  }

  // --- DIAGNOSTICS & DEBUGGING ACTIONS ---
  async getDiagnostics(user) {
    const userId = user?.id || "guest";
    const outbox = await idbGetOutbox(userId).catch(() => []);
    const pendingCount = outbox ? outbox.length : 0;
    const failedCount = outbox ? outbox.filter(item => (item.retryCount || 0) > 0).length : 0;

    let idbStatus = "Ready";
    if (typeof indexedDB === "undefined") {
      idbStatus = "Unsupported";
    }

    const envMode = typeof import.meta !== "undefined" && import.meta.env ? (import.meta.env.MODE || "development") : "development";

    let supabaseHostname = "Not Configured";
    const envUrl = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : null;
    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        supabaseHostname = parsed.hostname;
      } catch {
        supabaseHostname = "Invalid URL";
      }
    }

    const diag = {
      userId,
      authStatus: user && user.id ? "Authenticated" : "Unauthenticated",
      supabaseConnected: !!supabase,
      realtimeStatus: getRealtimeChannelStatus(),
      syncStatus: this.status,
      lastSyncTime: this.lastSyncTime || "Never",
      lastPullTime: this.lastPullTime || "Never",
      lastPushTime: this.lastPushTime || "Never",
      pendingCount,
      failedCount,
      lastError: this.lastError || "None",
      lastSuccessfulOp: this.lastSuccessfulOp ? `${this.lastSuccessfulOp.name} (${new Date(this.lastSuccessfulOp.timestamp).toLocaleTimeString()})` : "None",
      idbStatus,
      environment: envMode,
      supabaseHostname
    };

    diag.problemCategory = this.classifyProblem(diag, outbox);
    return diag;
  }

  classifyProblem(diag, outbox = []) {
    if (diag.authStatus && diag.authStatus.includes("Unauthenticated")) return "AUTH";
    if (!diag.supabaseConnected || diag.supabaseHostname === "Not Configured") return "DEPLOYMENT";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "NETWORK";
    
    if (diag.lastError && diag.lastError !== "None") {
      const errStr = String(diag.lastError).toLowerCase();
      if (errStr.includes("42501") || errStr.includes("row-level security") || errStr.includes("rls") || errStr.includes("permission denied")) {
        return "RLS";
      }
      if (errStr.includes("23505") || errStr.includes("duplicate") || errStr.includes("unique constraint")) {
        return "DUPLICATE";
      }
      if (errStr.includes("conflict")) {
        return "CONFLICT";
      }
      if (errStr.includes("indexeddb") || errStr.includes("idb")) {
        return "INDEXEDDB";
      }
      if (errStr.includes("fetch") || errStr.includes("network") || errStr.includes("offline")) {
        return "NETWORK";
      }
      return "APPLICATION LOGIC";
    }

    if (diag.realtimeStatus === "CLOSED" || diag.realtimeStatus === "CHANNEL_ERROR" || diag.realtimeStatus === "TIMED_OUT") {
      return "REALTIME";
    }

    if (diag.idbStatus !== "Ready" && diag.idbStatus !== "Unsupported") return "INDEXEDDB";
    if (diag.failedCount > 0) return "CONFLICT";

    return "HEALTHY";
  }

  // Diagnostic Buttons Handlers
  async forcePull(user, onStateUpdate) {
    this.log("DIAGNOSTICS", "User triggered Force Pull...");
    if (user && user.id) {
      await this.reconcile(user, onStateUpdate);
    }
  }

  async forcePush(user) {
    this.log("DIAGNOSTICS", "User triggered Force Push...");
    if (user && user.id) {
      await this.drainOutbox(user.id);
    }
  }

  async fullReconcile(user, onStateUpdate) {
    this.log("DIAGNOSTICS", "User triggered Full Reconcile...");
    if (user && user.id) {
      await this.reconcile(user, onStateUpdate);
    }
  }

  async retryFailedOperations(user) {
    this.log("DIAGNOSTICS", "Resetting retry counts on failed operations...");
    if (!user || !user.id) return;
    const outbox = await idbGetOutbox(user.id).catch(() => []);
    for (const item of outbox) {
      if ((item.retryCount || 0) > 0) {
        item.retryCount = 0;
        item.lastError = null;
        await idbEnqueueOutbox(user.id, item);
      }
    }
    await this.drainOutbox(user.id);
  }

  async clearLocalCache(user) {
    this.log("DIAGNOSTICS", "Clearing local IndexedDB cache...");
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("project_ascend_v4_db");
    }
  }

  async exportDebugLog(user) {
    const diag = await this.getDiagnostics(user);
    const outbox = user?.id ? await idbGetOutbox(user.id).catch(() => []) : [];
    
    const payload = {
      userId: user?.id || "Guest",
      exportTime: new Date().toISOString(),
      diagnostics: diag,
      logsHistory: this.logsHistory,
      pendingOutbox: outbox,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Node/Test"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    if (typeof document !== "undefined") {
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ascend-sync-debug-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
    return payload;
  }
}

export const syncEngine = new AscendSyncEngine();
