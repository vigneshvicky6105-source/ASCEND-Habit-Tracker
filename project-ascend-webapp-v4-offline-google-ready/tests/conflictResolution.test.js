import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveRecordConflict,
  reconcileEntityList,
  isDeleted,
  getCanonicalString,
  ENTITY_SCHEMAS
} from "../src/lib/conflict.js";

describe("ASCEND Deterministic Conflict Resolution Engine", () => {

  // SCENARIO 1: Laptop changes → Phone
  test("Scenario 1: Laptop changes -> Phone (Cloud newer timestamp wins)", () => {
    const localPhoneTask = {
      id: "task-100",
      user_id: "user-1",
      title: "Old Task Title (Phone)",
      xp: 10,
      updated_at: "2026-09-22T10:00:00.000Z"
    };

    const cloudLaptopTask = {
      id: "task-100",
      user_id: "user-1",
      title: "Updated Task Title (Laptop)",
      xp: 25,
      updated_at: "2026-09-22T11:00:00.000Z"
    };

    const winner = resolveRecordConflict(localPhoneTask, cloudLaptopTask);
    assert.equal(winner.title, "Updated Task Title (Laptop)");
    assert.equal(winner.xp, 25);
  });

  // SCENARIO 2: Phone changes → Laptop
  test("Scenario 2: Phone changes -> Laptop (Local newer timestamp wins & pushes to cloud)", () => {
    const localPhoneBook = {
      id: "book-200",
      user_id: "user-1",
      title: "Atomic Habits",
      current_page: 150,
      updated_at: "2026-09-22T12:00:00.000Z"
    };

    const cloudLaptopBook = {
      id: "book-200",
      user_id: "user-1",
      title: "Atomic Habits",
      current_page: 50,
      updated_at: "2026-09-22T10:00:00.000Z"
    };

    const winner = resolveRecordConflict(localPhoneBook, cloudLaptopBook);
    assert.equal(winner.current_page, 150);
    assert.equal(winner.updated_at, "2026-09-22T12:00:00.000Z");
  });

  // SCENARIO 3: Both devices change different records
  test("Scenario 3: Both devices edit different records (Clean non-overlapping merge)", () => {
    const localTasks = [
      { id: "task-1", title: "Task 1 (Phone local edit)", updated_at: "2026-09-22T12:00:00.000Z" },
      { id: "task-2", title: "Task 2 (Original)", updated_at: "2026-09-22T10:00:00.000Z" }
    ];

    const cloudTasks = [
      { id: "task-1", title: "Task 1 (Original)", updated_at: "2026-09-22T10:00:00.000Z" },
      { id: "task-2", title: "Task 2 (Laptop cloud edit)", updated_at: "2026-09-22T13:00:00.000Z" }
    ];

    const reconciled = reconcileEntityList(localTasks, cloudTasks, "id");
    assert.equal(reconciled.length, 2);

    const task1 = reconciled.find(t => t.id === "task-1");
    const task2 = reconciled.find(t => t.id === "task-2");

    assert.equal(task1.title, "Task 1 (Phone local edit)");
    assert.equal(task2.title, "Task 2 (Laptop cloud edit)");
  });

  // SCENARIO 4: Both devices edit the same record (LWW + Deterministic Tie-Breaker)
  test("Scenario 4: Both devices edit same record (Newer timestamp wins; equal timestamps use canonical tie-breaker)", () => {
    // Case 4A: Different timestamps
    const laptopWish = {
      id: "wish-1",
      item: "MacBook Pro",
      estimated_cost: 2000,
      updated_at: "2026-09-22T12:00:00.000Z"
    };

    const phoneWishNewer = {
      id: "wish-1",
      item: "MacBook Pro M4 Max",
      estimated_cost: 3500,
      updated_at: "2026-09-22T12:05:00.000Z"
    };

    const lwwWinner = resolveRecordConflict(laptopWish, phoneWishNewer);
    assert.equal(lwwWinner.item, "MacBook Pro M4 Max");

    // Case 4B: Exact same timestamp tie-breaker
    const recordA = {
      id: "wish-1",
      item: "Alpha Product",
      updated_at: "2026-09-22T12:00:00.000Z"
    };

    const recordB = {
      id: "wish-1",
      item: "Zeta Product",
      updated_at: "2026-09-22T12:00:00.000Z"
    };

    // Both Laptop and Phone evaluating (recordA vs recordB) will choose identical winner
    const winner1 = resolveRecordConflict(recordA, recordB);
    const winner2 = resolveRecordConflict(recordB, recordA);

    assert.equal(winner1, winner2);
    assert.equal(winner1.item, "Zeta Product");
  });

  // SCENARIO 5: Delete on laptop → Phone
  test("Scenario 5: Soft deletion on laptop propagates to phone and prevents resurrection", () => {
    const localPhoneTasks = [
      { id: "task-99", title: "Active Task on Phone", active: true, updated_at: "2026-09-22T10:00:00.000Z" }
    ];

    const cloudLaptopTasks = [
      { id: "task-99", title: "Active Task on Phone", active: false, deleted_at: "2026-09-22T11:00:00.000Z", updated_at: "2026-09-22T11:00:00.000Z" }
    ];

    const reconciled = reconcileEntityList(localPhoneTasks, cloudLaptopTasks, "id");
    assert.equal(reconciled.length, 0); // Filtered out, deletion wins!
  });

  // SCENARIO 6: Delete on phone → Laptop
  test("Scenario 6: Soft deletion on phone propagates to laptop", () => {
    const localPhoneBooks = [
      { id: "book-1", title: "Deleted Book", deleted_at: "2026-09-22T14:00:00.000Z", updated_at: "2026-09-22T14:00:00.000Z" }
    ];

    const cloudLaptopBooks = [
      { id: "book-1", title: "Old Active Book on Laptop", updated_at: "2026-09-22T10:00:00.000Z" }
    ];

    const reconciled = reconcileEntityList(localPhoneBooks, cloudLaptopBooks, "id");
    assert.equal(reconciled.length, 0); // Deleted on laptop as well!
  });

  // SCENARIO 7: Offline edit → Reconnect
  test("Scenario 7: Offline edit queued in outbox resolves properly upon reconnect", () => {
    const offlineQueuedMutation = {
      operationId: "op-12345",
      entity: "side_quests",
      recordId: "sq-1",
      operationType: "upsert",
      payload: [
        { id: "sq-1", title: "Offline Side Quest", completed: true, updated_at: "2026-09-22T15:00:00.000Z" }
      ],
      timestamp: "2026-09-22T15:00:00.000Z"
    };

    const staleCloudRecord = {
      id: "sq-1",
      title: "Offline Side Quest",
      completed: false,
      updated_at: "2026-09-22T10:00:00.000Z"
    };

    const winner = resolveRecordConflict(offlineQueuedMutation.payload[0], staleCloudRecord);
    assert.equal(winner.completed, true);
    assert.equal(winner.updated_at, "2026-09-22T15:00:00.000Z");
  });

  // SCENARIO 8: Repeated retry (Idempotency)
  test("Scenario 8: Idempotent operation retries without creating duplicates or corrupting data", () => {
    const originalRecord = { id: "concept-1", title: "Python Async", sort_order: 1, updated_at: "2026-09-22T10:00:00.000Z" };
    const retryUpdate = { id: "concept-1", title: "Python Async & Generators", sort_order: 1, updated_at: "2026-09-22T12:00:00.000Z" };

    // Simulate 3 retries of the exact same update
    let state = [originalRecord];
    for (let attempt = 1; attempt <= 3; attempt++) {
      state = reconcileEntityList(state, [retryUpdate], "id");
    }

    assert.equal(state.length, 1);
    assert.equal(state[0].title, "Python Async & Generators");
  });

  // SCENARIO 9: Simultaneous synchronization
  test("Scenario 9: Simultaneous sync operations yield identical deterministic state", () => {
    const threadATasks = [
      { id: "t-1", title: "Task 1 Edit A", updated_at: "2026-09-22T12:00:00.000Z" },
      { id: "t-2", title: "Task 2 Edit A", updated_at: "2026-09-22T14:00:00.000Z" }
    ];

    const threadBTasks = [
      { id: "t-1", title: "Task 1 Edit B", updated_at: "2026-09-22T13:00:00.000Z" },
      { id: "t-2", title: "Task 2 Edit B", updated_at: "2026-09-22T11:00:00.000Z" }
    ];

    const resultA = reconcileEntityList(threadATasks, threadBTasks, "id");
    const resultB = reconcileEntityList(threadBTasks, threadATasks, "id");

    assert.deepEqual(resultA, resultB);
    assert.equal(resultA.find(t => t.id === "t-1").title, "Task 1 Edit B");
    assert.equal(resultA.find(t => t.id === "t-2").title, "Task 2 Edit A");
  });

  // SCENARIO 10: Refresh during synchronization (Cache integrity)
  test("Scenario 10: State and cache remain consistent after simulated refresh during sync", () => {
    const cachedState = [
      { id: "due-1", person_name: "John", amount_paid: 100, updated_at: "2026-09-22T10:00:00.000Z" }
    ];

    const partialSyncRecord = { id: "due-1", person_name: "John", amount_paid: 200, updated_at: "2026-09-22T11:00:00.000Z" };

    // Before refresh
    const midSyncState = reconcileEntityList(cachedState, [partialSyncRecord], "id");
    assert.equal(midSyncState[0].amount_paid, 200);

    // After refresh (Re-hydrating from cache & re-reconciling)
    const postRefreshState = reconcileEntityList(midSyncState, [partialSyncRecord], "id");
    assert.equal(postRefreshState[0].amount_paid, 200);
  });

  // SCHEMA INTEGRITY TEST
  test("Schema integrity: All 9 user entities have defined identity, mutable, and immutable fields", () => {
    const requiredEntities = [
      "tasks", "task_completions", "side_quests", "books",
      "wishlist", "core_concepts", "dues", "daily_focus", "fitness_logs"
    ];

    for (const entityName of requiredEntities) {
      const schema = ENTITY_SCHEMAS[entityName];
      assert.ok(schema, `Missing schema definition for ${entityName}`);
      assert.ok(Array.isArray(schema.identity) && schema.identity.length > 0);
      assert.ok(Array.isArray(schema.immutableFields) && schema.immutableFields.length > 0);
      assert.ok(Array.isArray(schema.mutableFields) && schema.mutableFields.length > 0);
      assert.ok(typeof schema.conflictStrategy === "string" && schema.conflictStrategy.length > 0);
    }
  });
});
