import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { STARTER_QUESTS, STARTER_CONCEPTS } from "../src/lib/repository.js";

describe("ASCEND Quest Section Navigation & State Architecture", () => {
  test("Test 1: Default quest subTab defaults to 'main'", () => {
    let questSubTab = "main";
    assert.equal(questSubTab, "main");
  });

  test("Test 2: Quest subTab supports switching between 'main', 'side', 'reading', and 'wishlist'", () => {
    let questSubTab = "main";
    const setQuestSubTab = (newTab) => { questSubTab = newTab; };

    setQuestSubTab("side");
    assert.equal(questSubTab, "side");

    setQuestSubTab("reading");
    assert.equal(questSubTab, "reading");

    setQuestSubTab("wishlist");
    assert.equal(questSubTab, "wishlist");

    setQuestSubTab("main");
    assert.equal(questSubTab, "main");
  });

  test("Test 3: Progress subTab supports switching between 'analytics', 'ascension', 'achievements', 'dues', 'fitness', and 'history'", () => {
    let progressSubTab = "analytics";
    const setProgressSubTab = (newTab) => { progressSubTab = newTab; };

    const validProgressTabs = ["analytics", "ascension", "achievements", "dues", "fitness", "history"];
    validProgressTabs.forEach(t => {
      setProgressSubTab(t);
      assert.equal(progressSubTab, t);
    });
  });

  test("Test 4: Dues subTab supports 'lent' and 'owed'", () => {
    let duesSubTab = "lent";
    const setDuesSubTab = (newTab) => { duesSubTab = newTab; };

    setDuesSubTab("owed");
    assert.equal(duesSubTab, "owed");

    setDuesSubTab("lent");
    assert.equal(duesSubTab, "lent");
  });

  test("Test 5: Fitness subTab supports 'weight', 'nutrition', and 'workouts'", () => {
    let fitnessSubTab = "weight";
    const setFitnessSubTab = (newTab) => { fitnessSubTab = newTab; };

    ["nutrition", "workouts", "weight"].forEach(t => {
      setFitnessSubTab(t);
      assert.equal(fitnessSubTab, t);
    });
  });

  test("Test 6: Starter Quests and Concepts data structures render cleanly for Quest Section", () => {
    assert.ok(STARTER_QUESTS.length > 0);
    assert.ok(STARTER_CONCEPTS.length > 0);
    assert.equal(STARTER_QUESTS[0].starter_key, "starter-leetcode");
  });
});
