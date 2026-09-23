import { supabase } from "./supabase.js";
import { repository } from "./repository.js";
import { syncEngine } from "./syncEngine.js";

let activeChannel = null;
let currentSubscribedUserId = null;
let debounceTimer = null;
let lastChannelStatus = "NOT_CONNECTED";

export function getRealtimeChannelStatus() {
  if (!activeChannel) return "NOT_CONNECTED";
  return lastChannelStatus;
}

/**
 * Handles incoming Realtime event for single record or table change.
 * Ensures REMOTE changes are merged cleanly into local state WITHOUT re-broadcasting or pushing to cloud.
 */
export function handleIncomingRealtimePayload(payload, user) {
  if (!user || !user.id) return;

  syncEngine.log("REALTIME", `Incoming ${payload.eventType} event on table ${payload.table}:`, payload);

  // Debounce rapid realtime bursts (150ms)
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      syncEngine.setStatus("SYNCING");

      const table = payload.table;
      const newRecord = payload.new;

      if (table === "tasks" && newRecord) {
        await repository.applyRemoteRecordUpdate("tasks", newRecord, user.id);
      } else if (table === "side_quests" && newRecord) {
        await repository.applyRemoteRecordUpdate("side_quests", newRecord, user.id);
      } else if (table === "books" && newRecord) {
        await repository.applyRemoteRecordUpdate("books", newRecord, user.id);
      } else if (table === "wishlist" && newRecord) {
        await repository.applyRemoteRecordUpdate("wishlist", newRecord, user.id);
      } else if (table === "core_concepts" && newRecord) {
        await repository.applyRemoteRecordUpdate("core_concepts", newRecord, user.id);
      } else if (table === "dues" && newRecord) {
        await repository.applyRemoteRecordUpdate("dues", newRecord, user.id);
      } else {
        // Fallback for full entity reconciliation
        await repository.reconcileCloud(user);
      }

      syncEngine.setStatus("SYNCED");
    } catch (err) {
      syncEngine.setStatus("ERROR", err);
    }
  }, 150);
}

export function subscribeRealtimeSync(user) {
  if (!supabase || !user || !user.id) {
    lastChannelStatus = "NOT_CONNECTED";
    return () => {};
  }

  // Prevent duplicate subscriptions for the exact same user ID
  if (activeChannel && currentSubscribedUserId === user.id) {
    return () => unsubscribeRealtimeSync();
  }

  unsubscribeRealtimeSync();
  currentSubscribedUserId = user.id;
  lastChannelStatus = "JOINING";

  syncEngine.log("REALTIME", `Subscribing to Realtime Postgres channel for user ${user.id}...`);

  activeChannel = supabase
    .channel(`user-realtime-sync-${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", filter: `user_id=eq.${user.id}` },
      (payload) => {
        handleIncomingRealtimePayload(payload, user);
      }
    )
    .subscribe((status, err) => {
      lastChannelStatus = status || "UNKNOWN";
      syncEngine.log("REALTIME", `Subscription status: ${status}`);
      if (status === "SUBSCRIBED") {
        syncEngine.setStatus("SYNCED");
      } else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
        syncEngine.setStatus("OFFLINE", err || new Error(`Realtime status: ${status}`));
      }
    });

  return () => {
    unsubscribeRealtimeSync();
  };
}

export function unsubscribeRealtimeSync() {
  if (activeChannel && supabase) {
    syncEngine.log("REALTIME", "Unsubscribing active Realtime Postgres channel...");
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    currentSubscribedUserId = null;
    lastChannelStatus = "CLOSED";
  }
}
