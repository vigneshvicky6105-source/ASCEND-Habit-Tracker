import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deduplicateTasks, reconcileEntityList } from "../src/lib/conflict.js";
import { STARTER_QUESTS, starterQuestUuidForKey } from "../src/lib/repository.js";

describe("ASCEND Idempotent Starter Initialization & Task Deduplication", () => {

  // TEST 1: Default initialization once
  test("Test 1: Initializing default tasks once produces exact STARTER_QUESTS count (13)", () => {
    const initialList = STARTER_QUESTS.map(q => ({ ...q, user_id: "user-test-1", active: true }));
    const { deduplicatedTasks } = deduplicateTasks(initialList);
    assert.equal(deduplicatedTasks.length, 13);
  });

  // TEST 2: Default initialization 10 times
  test("Test 2: Initializing default tasks 10 times in sequence produces zero duplicates", () => {
    const singleSet = STARTER_QUESTS.map(q => ({ ...q, user_id: "user-test-1", active: true }));

    // Concatenate 10 sets of default tasks (simulating 10 initialization calls)
    let multipliedList = [];
    for (let i = 0; i < 10; i++) {
      multipliedList = [...multipliedList, ...singleSet];
    }
    assert.equal(multipliedList.length, 130);

    const { deduplicatedTasks } = deduplicateTasks(multipliedList);
    assert.equal(deduplicatedTasks.length, 13);

    // Verify all 13 starter keys are unique and intact
    const starterKeys = new Set(deduplicatedTasks.map(t => t.starter_key));
    assert.equal(starterKeys.size, 13);
  });

  // TEST 3: Cross-device & Sync idempotency (Device A + Device B)
  test("Test 3: Synchronization between Device A and Device B produces zero duplicate tasks", () => {
    const deviceATasks = STARTER_QUESTS.map(q => ({
      ...q,
      user_id: "user-123",
      active: true,
      updated_at: "2026-09-22T10:00:00.000Z"
    }));

    const deviceBTasks = STARTER_QUESTS.map(q => ({
      ...q,
      user_id: "user-123",
      active: true,
      updated_at: "2026-09-22T10:05:00.000Z"
    }));

    const reconciled = reconcileEntityList(deviceATasks, deviceBTasks, "id");
    assert.equal(reconciled.length, 13);
  });

  // TEST 4: Logout / Login & Page Refresh Idempotency
  test("Test 4: Logout/login and page refresh do not create duplicate default tasks", () => {
    const userId = "user-session-1";
    let state = STARTER_QUESTS.map(q => ({ ...q, user_id: userId, active: true }));

    // Simulate 5 consecutive login/refresh cycles
    for (let cycle = 1; cycle <= 5; cycle++) {
      const { deduplicatedTasks } = deduplicateTasks(state);
      state = deduplicatedTasks;
      assert.equal(state.length, 13);
    }
  });

  // TEST 5: Legacy Duplicate Task Cleanup with Completion History Preservation
  test("Test 5: Legacy duplicates with non-deterministic IDs are safely merged and completion history is preserved", () => {
    const canonicalLeetCodeId = starterQuestUuidForKey("starter-leetcode");
    const legacyDuplicateLeetCodeId = "legacy-random-uuid-9999";

    const inputTasks = [
      {
        id: canonicalLeetCodeId,
        starter_key: "starter-leetcode",
        title: "LeetCode + GeeksforGeeks",
        category: "Coding",
        active: true,
        updated_at: "2026-09-22T10:00:00.000Z"
      },
      {
        id: legacyDuplicateLeetCodeId,
        starter_key: null, // Legacy task missing starter_key
        title: "LeetCode + GeeksforGeeks",
        category: "Coding",
        active: true,
        updated_at: "2026-09-22T09:00:00.000Z"
      }
    ];

    const { deduplicatedTasks, reboundIdMap } = deduplicateTasks(inputTasks);

    // 1. Only 1 task survives
    assert.equal(deduplicatedTasks.length, 1);
    assert.equal(deduplicatedTasks[0].id, canonicalLeetCodeId);

    // 2. Rebound map maps legacy ID -> canonical ID
    assert.equal(reboundIdMap[legacyDuplicateLeetCodeId], canonicalLeetCodeId);

    // 3. Simulate re-keying task completions from duplicate task ID to surviving task ID
    const completions = [
      { task_id: legacyDuplicateLeetCodeId, completed_on: "2026-09-20" },
      { task_id: canonicalLeetCodeId, completed_on: "2026-09-21" }
    ];

    const reboundCompletions = completions.map(c => ({
      ...c,
      task_id: reboundIdMap[c.task_id] || c.task_id
    }));

    assert.equal(reboundCompletions[0].task_id, canonicalLeetCodeId);
    assert.equal(reboundCompletions[1].task_id, canonicalLeetCodeId);
  });

  // TEST 6: Custom User Tasks with Same Title Are Not Accidental Starters
  test("Test 6: Custom non-starter tasks with distinct IDs remain distinct if they have custom properties", () => {
    const customTask1 = {
      id: "custom-uuid-1",
      starter_key: null,
      title: "My Custom Workout Task",
      category: "Personal",
      active: true,
      updated_at: "2026-09-22T10:00:00.000Z"
    };

    const customTask2 = {
      id: "custom-uuid-2",
      starter_key: null,
      title: "My Custom Workout Task", // Same title, but different ID and distinct custom task
      category: "Fitness",
      active: true,
      updated_at: "2026-09-22T11:00:00.000Z"
    };

    const reconciled = reconcileEntityList([customTask1], [customTask2], "id");
    assert.equal(reconciled.length, 2); // Preserves both custom tasks!
  });
});
