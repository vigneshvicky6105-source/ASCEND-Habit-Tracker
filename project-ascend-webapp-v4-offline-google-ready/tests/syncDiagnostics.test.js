import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { syncEngine, SYNC_STATES } from "../src/lib/syncEngine.js";

describe("ASCEND Sync Diagnostics Panel & Health Classifier", () => {
  const mockUser = {
    id: "user-diag-123",
    email: "test.ascendant@example.com"
  };

  // TEST 1: Diagnostic Metrics Structure (15 Required Metrics)
  test("Test 1: getDiagnostics returns all 15 required diagnostic properties accurately", async () => {
    const diag = await syncEngine.getDiagnostics(mockUser);

    assert.equal(diag.userId, "user-diag-123");
    assert.equal(diag.authStatus, "Authenticated");
    assert.equal(typeof diag.supabaseConnected, "boolean");
    assert.equal(typeof diag.realtimeStatus, "string");
    assert.equal(typeof diag.syncStatus, "string");
    assert.ok(["SYNCING", "SYNCED", "OFFLINE", "ERROR"].includes(diag.syncStatus));
    assert.ok("lastSyncTime" in diag);
    assert.ok("lastPullTime" in diag);
    assert.ok("lastPushTime" in diag);
    assert.equal(typeof diag.pendingCount, "number");
    assert.equal(typeof diag.failedCount, "number");
    assert.ok("lastError" in diag);
    assert.ok("lastSuccessfulOp" in diag);
    assert.equal(typeof diag.idbStatus, "string");
    assert.equal(typeof diag.environment, "string");
    assert.equal(typeof diag.supabaseHostname, "string");
  });

  // TEST 2: Security & Credential Isolation
  test("Test 2: getDiagnostics never leaks sensitive credentials or service_role keys", async () => {
    const diag = await syncEngine.getDiagnostics(mockUser);
    const serialized = JSON.stringify(diag);

    assert.equal(serialized.includes("service_role"), false, "Must not contain service_role");
    assert.equal(serialized.includes("sbp_"), false, "Must not contain secret tokens");
    // Hostname must be clean hostname or "Not Configured"
    assert.ok(!diag.supabaseHostname.includes("apikey=") && !diag.supabaseHostname.includes("Bearer"));
  });

  // TEST 3: Problem Classification Matrix
  test("Test 3: classifyProblem accurately categorizes root cause categories", () => {
    // 1. AUTH Problem
    const authProblem = syncEngine.classifyProblem({
      userId: "Guest",
      authStatus: "Unauthenticated (Guest)",
      supabaseConnected: true,
      realtimeStatus: "SUBSCRIBED",
      syncStatus: "OFFLINE",
      lastError: "None",
      pendingCount: 0,
      failedCount: 0
    });
    assert.equal(authProblem, "AUTH");

    // 2. RLS Violation Problem
    const rlsProblem = syncEngine.classifyProblem({
      userId: "user-123",
      authStatus: "Authenticated",
      supabaseConnected: true,
      realtimeStatus: "SUBSCRIBED",
      syncStatus: "ERROR",
      lastError: "new row violates row-level security policy for table tasks",
      pendingCount: 1,
      failedCount: 1
    });
    assert.equal(rlsProblem, "RLS");

    // 3. DUPLICATE Key Violation
    const dupProblem = syncEngine.classifyProblem({
      userId: "user-123",
      authStatus: "Authenticated",
      supabaseConnected: true,
      realtimeStatus: "SUBSCRIBED",
      syncStatus: "ERROR",
      lastError: "duplicate key value violates unique constraint 23505",
      pendingCount: 0,
      failedCount: 1
    });
    assert.equal(dupProblem, "DUPLICATE");

    // 4. REALTIME Disconnection
    const realtimeProblem = syncEngine.classifyProblem({
      userId: "user-123",
      authStatus: "Authenticated",
      supabaseConnected: true,
      realtimeStatus: "CLOSED",
      syncStatus: "SYNCED",
      lastError: "None",
      pendingCount: 0,
      failedCount: 0
    });
    assert.equal(realtimeProblem, "REALTIME");

    // 5. HEALTHY State
    const healthyProblem = syncEngine.classifyProblem({
      userId: "user-123",
      authStatus: "Authenticated",
      supabaseConnected: true,
      realtimeStatus: "SUBSCRIBED",
      syncStatus: "SYNCED",
      lastError: "None",
      pendingCount: 0,
      failedCount: 0,
      idbStatus: "Ready"
    });
    assert.equal(healthyProblem, "HEALTHY");
  });

  // TEST 4: Developer Action Methods
  test("Test 4: Developer action helpers execute safely and update log history", async () => {
    const initialLogCount = syncEngine.logsHistory.length;

    // Execute actions
    await syncEngine.forcePull(mockUser);
    await syncEngine.forcePush(mockUser);
    await syncEngine.fullReconcile(mockUser);
    await syncEngine.retryFailedOperations(mockUser);
    const exportedLog = await syncEngine.exportDebugLog(mockUser);

    assert.ok(syncEngine.logsHistory.length > initialLogCount, "Logs history should record actions");
    assert.equal(exportedLog.userId, "user-diag-123");
    assert.ok(Array.isArray(exportedLog.logsHistory));
  });

  // TEST 5: Production Environment Flag Check
  test("Test 5: Unauthenticated guest diagnostics correctly reflects guest state", async () => {
    const guestDiag = await syncEngine.getDiagnostics(null);
    assert.equal(guestDiag.userId, "guest");
    assert.equal(guestDiag.authStatus, "Unauthenticated");
  });
});
