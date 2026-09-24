import test from "node:test";
import assert from "node:assert/strict";
import { repository, SOLOMON_WORKOUT_TEMPLATE } from "../src/lib/repository.js";
import {
  calculateSetVolume,
  calculateSessionVolume,
  getExercisePRs,
  getPreviousExercisePerformance,
  calculateProgressionStatus,
  detectNewPRs
} from "../src/lib/fitnessUtils.js";

test("Fitness Upgrade Suite - Solomon 6-Day Workout Split Import & Template Seeding", async (t) => {
  await t.test("Test 1: SOLOMON_WORKOUT_TEMPLATE contains exact 7-day structure from PDF", () => {
    assert.equal(SOLOMON_WORKOUT_TEMPLATE.length, 7);
    
    const days = SOLOMON_WORKOUT_TEMPLATE.map(d => d.day);
    assert.deepEqual(days, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

    const monday = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Monday");
    assert.equal(monday.title, "CHEST + TRICEPS");
    assert.equal(monday.exercises.length, 9);
    assert.equal(monday.exercises[0].name, "Bench Press");
    assert.equal(monday.exercises[0].targetReps, "12/10/8");

    const tuesday = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Tuesday");
    assert.equal(tuesday.title, "BACK + BICEPS");
    assert.equal(tuesday.exercises[0].name, "Lat Pulldown (Wide)");

    const sunday = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Sunday");
    assert.equal(sunday.isRest, true);
    assert.equal(sunday.exercises.length, 0);
  });

  await t.test("Test 2: Repository initializes with Solomon 6-Day template by default", async () => {
    const fakeUser = { id: "test-fitness-user-" + Date.now() };
    await repository.initSession(fakeUser);

    const fitness = repository.state.fitness;
    assert.ok(fitness);
    assert.ok(Array.isArray(fitness.routine));
    assert.equal(fitness.routine.length, 7);
    assert.equal(fitness.routine[0].exercises[0].name, "Bench Press");
  });
});

test("Fitness Upgrade Suite - Volume Math, PR Detection, and Progression Status", async (t) => {
  await t.test("Test 3: Set volume and Session total volume calculations", () => {
    const set1 = { weight: 60, reps: 12, completed: true };
    const set2 = { weight: 60, reps: 10, completed: true };
    const set3 = { weight: 65, reps: 8, completed: true };
    const uncompletedSet = { weight: 70, reps: 5, completed: false };

    assert.equal(calculateSetVolume(set1), 720);
    assert.equal(calculateSetVolume(set2), 600);
    assert.equal(calculateSetVolume(set3), 520);
    assert.equal(calculateSetVolume(uncompletedSet), 0);

    const totalVol = calculateSessionVolume([set1, set2, set3, uncompletedSet]);
    assert.equal(totalVol, 1840);
  });

  await t.test("Test 4: PR detection & Previous Performance Lookup", () => {
    const exId = "solomon-mon-ex-1"; // Bench Press
    const historicalSets = [
      { id: "s1", session_id: "sess-1", exercise_id: exId, exercise_name: "Bench Press", set_number: 1, weight: 60, reps: 12, completed: true, created_at: "2026-09-01T10:00:00Z" },
      { id: "s2", session_id: "sess-1", exercise_id: exId, exercise_name: "Bench Press", set_number: 2, weight: 60, reps: 10, completed: true, created_at: "2026-09-01T10:00:00Z" },
      { id: "s3", session_id: "sess-1", exercise_id: exId, exercise_name: "Bench Press", set_number: 3, weight: 65, reps: 8, completed: true, created_at: "2026-09-01T10:00:00Z" }
    ];
    const sessions = [
      { id: "sess-1", date: "2026-09-01", day_name: "Monday", split_title: "CHEST + TRICEPS", total_volume: 1840 }
    ];

    const prs = getExercisePRs(historicalSets, exId);
    assert.equal(prs.maxWeight, 65);
    assert.equal(prs.maxReps, 12);
    assert.equal(prs.maxSetVolume, 720);

    const prevPerf = getPreviousExercisePerformance(historicalSets, sessions, exId);
    assert.equal(prevPerf.length, 3);
    assert.equal(prevPerf[0].weight, 60);
    assert.equal(prevPerf[2].weight, 65);

    // New Session with higher weight (70kg x 8 = 560kg)
    const currentSets = [
      { id: "s4", session_id: "sess-2", exercise_id: exId, exercise_name: "Bench Press", set_number: 1, weight: 70, reps: 8, completed: true }
    ];

    const newPRs = detectNewPRs(historicalSets, currentSets, "sess-2");
    assert.equal(newPRs.length, 1);
    assert.equal(newPRs[0].type, "MAX_WEIGHT");
    assert.equal(newPRs[0].value, "70 kg");
  });

  await t.test("Test 5: Progression status comparison (PROGRESS vs REGRESSED vs MAINTAINED)", () => {
    const sessions = [
      { id: "sess-1", date: "2026-09-01", split_title: "CHEST + TRICEPS", total_volume: 1000 },
      { id: "sess-2", date: "2026-09-08", split_title: "CHEST + TRICEPS", total_volume: 1200 }
    ];

    const currentSessionProgress = { id: "sess-3", date: "2026-09-15", split_title: "CHEST + TRICEPS", total_volume: 1500 };
    const statusProg = calculateProgressionStatus(sessions, currentSessionProgress);
    assert.equal(statusProg.status, "PROGRESS");
    assert.equal(statusProg.volumeDiff, 300);
    assert.equal(statusProg.volumePct, 25);

    const currentSessionRegressed = { id: "sess-4", date: "2026-09-15", split_title: "CHEST + TRICEPS", total_volume: 900 };
    const statusReg = calculateProgressionStatus(sessions, currentSessionRegressed);
    assert.equal(statusReg.status, "REGRESSED");
    assert.equal(statusReg.volumeDiff, -300);
  });
});

test("Fitness Upgrade Suite - Program Editing & History Preservation", async (t) => {
  await t.test("Test 6: Editing an exercise in routine preserves stable exercise_id and past set history", async () => {
    const fakeUser = { id: "test-edit-user-" + Date.now() };
    await repository.initSession(fakeUser);

    const exId = "solomon-mon-ex-1"; // Bench Press
    const set1 = { id: "hist-set-1", session_id: "past-sess-1", exercise_id: exId, exercise_name: "Bench Press", weight: 60, reps: 10, completed: true };
    const session1 = { id: "past-sess-1", date: "2026-09-10", split_title: "CHEST + TRICEPS", total_volume: 600 };

    await repository.saveWorkoutSession(session1, [set1], fakeUser);

    // Now user renames Bench Press -> "Barbell Flat Bench Press" in the program editor
    const currentRoutine = repository.state.fitness.routine;
    const updatedRoutine = currentRoutine.map(dayObj => {
      if (dayObj.day === "Monday") {
        return {
          ...dayObj,
          exercises: dayObj.exercises.map(ex => {
            if (ex.id === exId) {
              return { ...ex, name: "Barbell Flat Bench Press", targetReps: "10/8/6" };
            }
            return ex;
          })
        };
      }
      return dayObj;
    });

    await repository.saveWorkoutRoutine(updatedRoutine, fakeUser);

    // Verify program has updated name
    const monEx = repository.state.fitness.routine.find(d => d.day === "Monday").exercises.find(e => e.id === exId);
    assert.equal(monEx.name, "Barbell Flat Bench Press");
    assert.equal(monEx.targetReps, "10/8/6");

    // Verify past set log is preserved with original exercise_id
    const pastSet = repository.state.fitness.sets.find(s => s.id === "hist-set-1");
    assert.ok(pastSet);
    assert.equal(pastSet.exercise_id, exId);
    assert.equal(pastSet.exercise_name, "Bench Press");
    assert.equal(pastSet.weight, 60);
  });
});
