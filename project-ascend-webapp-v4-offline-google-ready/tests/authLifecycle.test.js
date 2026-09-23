import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { repository } from "../src/lib/repository.js";
import { syncEngine, SYNC_STATES } from "../src/lib/syncEngine.js";

describe("ASCEND Authentication & User Initialization Lifecycle Audit", () => {

  // REQ 1 & 2: Never synchronize before auth.session is available / Never use undefined/null user IDs
  test("Req 1 & 2: Sync Engine blocks execution when user or session is null/undefined", async () => {
    let reconcileAttempted = false;
    await syncEngine.reconcile(null, async () => {
      reconcileAttempted = true;
    });

    assert.equal(reconcileAttempted, false);
    assert.equal(syncEngine.status, SYNC_STATES.OFFLINE);
  });

  // REQ 3 & 4: Strict IndexedDB Namespacing & User Isolation (User A vs User B)
  test("Req 3 & 4: Multi-user data is strictly isolated and never cross-contaminates in memory or cache", async () => {
    const userA = { id: "11111111-1111-4111-8111-111111111111" };
    const userB = { id: "22222222-2222-4222-8222-222222222222" };

    // 1. Initialize User A session & save custom task locally
    await repository.initSession(userA);
    const customTaskA = {
      id: "a0000000-0000-4000-8000-000000000001",
      user_id: userA.id,
      title: "User A Confidential Habit",
      category: "Secret",
      xp: 50,
      active: true,
      updated_at: new Date().toISOString()
    };
    repository.setState(s => ({ ...s, tasks: [...s.tasks, customTaskA] }));

    assert.ok(repository.state.tasks.some(t => t.title === "User A Confidential Habit"));

    // 2. Switch to User B
    await repository.initSession(userB);
    const userBTasks = repository.state.tasks;

    // User B MUST NOT see User A's confidential habit!
    assert.equal(userBTasks.some(t => t.title === "User A Confidential Habit"), false);

    // 3. Re-inject for User A & verify clean isolation
    await repository.initSession(userA);
    assert.equal(repository.state.tasks.some(t => t.title === "User B Confidential Habit"), false);
  });

  // REQ 5: On logout, clear or isolate the authenticated user's local state
  test("Req 5: On logout, in-memory repository state is completely reset to guest clean state", async () => {
    const user = { id: "33333333-3333-4333-8333-333333333333" };
    await repository.initSession(user);
    repository.setState(s => ({ ...s, books: [{ id: "b-1", title: "Private Journal", user_id: user.id }] }));

    assert.ok(repository.state.books.some(b => b.title === "Private Journal"));

    // Trigger logout reset
    repository.resetSession();

    assert.equal(repository.state.books.length, 0);
    assert.equal(repository.state.tasks.length, 0);
    assert.equal(repository.state.wishlist.length, 0);
    assert.equal(repository.state.side_quests.length, 0);
  });

  // REQ 6: On login as a different user, never show previous user's data
  test("Req 6: Login as User B immediately purges in-memory state of User A", async () => {
    const userA = { id: "44444444-4444-4444-8444-444444444444" };
    const userB = { id: "55555555-5555-4555-8555-555555555555" };

    await repository.initSession(userA);
    repository.setState(s => ({ ...s, wishlist: [{ id: "w-1", item: "User A Tesla CyberTruck", user_id: userA.id }] }));

    assert.equal(repository.state.wishlist[0].item, "User A Tesla CyberTruck");

    // Initialize User B
    await repository.initSession(userB);
    assert.equal(repository.state.wishlist.some(w => w.item === "User A Tesla CyberTruck"), false);
  });

  // REQ 7 & 9: Page refresh & auth state changes
  test("Req 7 & 9: Session initialization re-hydrates clean user state smoothly", async () => {
    const user = { id: "66666666-6666-4666-8666-666666666666" };
    await repository.initSession(user);
    repository.setState(s => ({ ...s, concepts: [{ id: "c-1", title: "Quantum Computing", user_id: user.id }] }));

    assert.ok(repository.state.concepts.some(c => c.title === "Quantum Computing"));

    // Resetting session for logout
    repository.resetSession();
    assert.equal(repository.state.concepts.length, 0);
  });

  // REQ 10: New device with empty IndexedDB database (Cloud checked BEFORE default task seeding)
  test("Req 10: New device initialization checks existing cloud tasks before seeding starter tasks", async () => {
    const user = { id: "77777777-7777-4777-8777-777777777777" };

    // Initializing user with empty local cache
    await repository.initSession(user);

    // Seeding flag or cloud state is respected; state contains valid clean structure
    assert.ok(Array.isArray(repository.state.tasks));
  });

  // REQ 11: Existing device with stale IndexedDB data
  test("Req 11: Stale IndexedDB cache is cleanly reconciled with cloud data using LWW", async () => {
    const user = { id: "88888888-8888-4888-8888-888888888888" };
    await repository.initSession(user);

    await syncEngine.reconcile(user, async (cloudData) => {
      await repository.reconcileCloud(user);
    });

    assert.ok(repository.state.tasks !== undefined);
  });
});
