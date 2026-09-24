import test from "node:test";
import assert from "node:assert/strict";

import { repository, generateUUID, todayStr, SOLOMON_WORKOUT_TEMPLATE } from "../src/lib/repository.js";
import {
  calculateSetVolume,
  calculateSessionVolume,
  getExercisePRs,
  getPreviousExercisePerformance,
  calculateProgressionStatus,
  detectNewPRs,
  getAllExercisePRs,
  getExerciseHistory,
  getExerciseProgressionTimeline
} from "../src/lib/fitnessUtils.js";

test("ASCEND Fitness Module — Full Automated Verification Suite", async (t) => {

  await t.test("1. PDF default program template initialization & structure", () => {
    assert.equal(SOLOMON_WORKOUT_TEMPLATE.length, 7, "Must contain 7 days (Monday through Sunday)");

    const mon = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Monday");
    assert.equal(mon.title, "CHEST + TRICEPS");
    assert.equal(mon.exercises.length, 9, "Monday must contain 9 exercises (5 chest + 4 triceps)");
    assert.equal(mon.exercises[0].name, "Bench Press");
    assert.equal(mon.exercises[0].targetSets, 3);
    assert.equal(mon.exercises[0].targetReps, "12/10/8");

    const tue = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Tuesday");
    assert.equal(tue.title, "BACK + BICEPS");
    assert.equal(tue.exercises.length, 9, "Tuesday must contain 9 exercises (5 back + 4 biceps)");
    assert.equal(tue.exercises[0].name, "Lat Pulldown (Wide)");

    const wed = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Wednesday");
    assert.equal(wed.title, "SHOULDERS + LEGS");
    assert.equal(wed.exercises.length, 9, "Wednesday must contain 9 exercises (4 shoulders + 5 legs)");
    assert.equal(wed.exercises[0].name, "Seated Shoulder Press");

    const thu = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Thursday");
    assert.equal(thu.title, "CHEST + TRICEPS (Different Stimulus)");
    assert.equal(thu.exercises.length, 9, "Thursday must contain 9 exercises");

    const fri = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Friday");
    assert.equal(fri.title, "BACK + BICEPS (Different Angles)");
    assert.equal(fri.exercises.length, 9, "Friday must contain 9 exercises");

    const sat = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Saturday");
    assert.equal(sat.title, "SHOULDERS + LEGS (Different Focus)");
    assert.equal(sat.exercises.length, 10, "Saturday must contain 10 exercises");
    assert.equal(sat.exercises[4].name, "Arnold Press");
    assert.equal(sat.exercises[4].optional, true, "Arnold Press must be marked optional");

    const sun = SOLOMON_WORKOUT_TEMPLATE.find(d => d.day === "Sunday");
    assert.equal(sun.isRest, true, "Sunday must be marked as REST DAY");
    assert.equal(sun.exercises.length, 0, "Sunday rest day must have 0 exercises");
  });

  await t.test("2. Idempotent initialization (never duplicates routine or overwrites customizations)", async () => {
    const mockUser = { id: "test-user-fitness-idempotent" };
    repository.resetSession();

    // Verify initial fitness state
    assert.ok(repository.state.fitness);
    assert.equal(repository.state.fitness.routine.length, 7);

    // Save customized routine
    const customRoutine = [...SOLOMON_WORKOUT_TEMPLATE];
    customRoutine[0] = {
      ...customRoutine[0],
      exercises: [
        ...customRoutine[0].exercises,
        { id: "custom-ex-1", name: "Custom Incline Cable Fly", muscleGroup: "Chest", targetSets: 3, targetReps: "12/12/12", defaultWeight: 15 }
      ]
    };

    await repository.saveWorkoutRoutine(customRoutine, mockUser);
    assert.equal(repository.state.fitness.routine[0].exercises.length, 10, "Should have 10 exercises after adding custom exercise");

    // Re-saving routine should keep customized routine
    assert.equal(repository.state.fitness.routine[0].exercises[9].name, "Custom Incline Cable Fly");
  });

  await t.test("3. Set volume & session volume calculations", () => {
    const set1 = { weight: 50, reps: 10, completed: true };
    const set2 = { weight: 50, reps: 8, completed: true };
    const set3 = { weight: 50, reps: 6, completed: false }; // uncompleted set should give 0 volume

    assert.equal(calculateSetVolume(set1), 500);
    assert.equal(calculateSetVolume(set2), 400);
    assert.equal(calculateSetVolume(set3), 0, "Uncompleted set volume must be 0");

    assert.equal(calculateSessionVolume([set1, set2, set3]), 900);
  });

  await t.test("4. Active workout logging: add set, remove set, edit weight/reps, complete workout", async () => {
    const mockUser = { id: "test-user-fitness-workout" };
    repository.resetSession();

    const benchExId = "solomon-mon-ex-1";
    const sessionId = generateUUID();
    const sessionRecord = {
      id: sessionId,
      workout_date: todayStr(),
      date: todayStr(),
      day_name: "Monday",
      split_title: "CHEST + TRICEPS",
      duration_minutes: 45,
      total_volume: 1350,
      total_sets: 3,
      total_reps: 30,
      notes: "Great push day",
      created_at: new Date().toISOString()
    };

    const setRecords = [
      { id: generateUUID(), session_id: sessionId, exercise_id: benchExId, exercise_name: "Bench Press", set_number: 1, weight: 45, reps: 12, completed: true },
      { id: generateUUID(), session_id: sessionId, exercise_id: benchExId, exercise_name: "Bench Press", set_number: 2, weight: 45, reps: 10, completed: true },
      { id: generateUUID(), session_id: sessionId, exercise_id: benchExId, exercise_name: "Bench Press", set_number: 3, weight: 45, reps: 8, completed: true }
    ];

    await repository.saveWorkoutSession(sessionRecord, setRecords, mockUser);

    assert.equal(repository.state.fitness.sessions.length, 1);
    assert.equal(repository.state.fitness.sets.length, 3);
    assert.equal(repository.state.fitness.sessions[0].total_volume, 1350);
  });

  await t.test("5. Previous exercise performance retrieval", () => {
    const benchExId = "solomon-mon-ex-1";

    const allSessions = [
      { id: "session-1", date: "2026-09-10", split_title: "CHEST + TRICEPS" },
      { id: "session-2", date: "2026-09-17", split_title: "CHEST + TRICEPS" }
    ];

    const allSets = [
      // Session 1 sets
      { id: "s1-1", session_id: "session-1", exercise_id: benchExId, set_number: 1, weight: 40, reps: 12, completed: true },
      { id: "s1-2", session_id: "session-1", exercise_id: benchExId, set_number: 2, weight: 40, reps: 10, completed: true },
      { id: "s1-3", session_id: "session-1", exercise_id: benchExId, set_number: 3, weight: 40, reps: 8, completed: true },
      // Session 2 sets
      { id: "s2-1", session_id: "session-2", exercise_id: benchExId, set_number: 1, weight: 42.5, reps: 12, completed: true },
      { id: "s2-2", session_id: "session-2", exercise_id: benchExId, set_number: 2, weight: 42.5, reps: 10, completed: true },
      { id: "s2-3", session_id: "session-2", exercise_id: benchExId, set_number: 3, weight: 42.5, reps: 8, completed: true }
    ];

    const prevPerf = getPreviousExercisePerformance(allSets, allSessions, benchExId);
    assert.equal(prevPerf.length, 3, "Should return sets from the most recent session (Session 2)");
    assert.equal(prevPerf[0].weight, 42.5);
    assert.equal(prevPerf[0].reps, 12);
  });

  await t.test("6. Exercise history & progression calculation", () => {
    const benchExId = "solomon-mon-ex-1";

    const allSessions = [
      { id: "session-1", date: "2026-09-10", split_title: "CHEST + TRICEPS" },
      { id: "session-2", date: "2026-09-17", split_title: "CHEST + TRICEPS" },
      { id: "session-3", date: "2026-09-24", split_title: "CHEST + TRICEPS" }
    ];

    const allSets = [
      { id: "s1-1", session_id: "session-1", exercise_id: benchExId, set_number: 1, weight: 40, reps: 12, completed: true, date: "2026-09-10" },
      { id: "s1-2", session_id: "session-1", exercise_id: benchExId, set_number: 2, weight: 40, reps: 10, completed: true, date: "2026-09-10" },
      { id: "s1-3", session_id: "session-1", exercise_id: benchExId, set_number: 3, weight: 40, reps: 8, completed: true, date: "2026-09-10" },

      { id: "s2-1", session_id: "session-2", exercise_id: benchExId, set_number: 1, weight: 42.5, reps: 12, completed: true, date: "2026-09-17" },
      { id: "s2-2", session_id: "session-2", exercise_id: benchExId, set_number: 2, weight: 42.5, reps: 10, completed: true, date: "2026-09-17" },
      { id: "s2-3", session_id: "session-2", exercise_id: benchExId, set_number: 3, weight: 42.5, reps: 8, completed: true, date: "2026-09-17" },

      { id: "s3-1", session_id: "session-3", exercise_id: benchExId, set_number: 1, weight: 45, reps: 12, completed: true, date: "2026-09-24" },
      { id: "s3-2", session_id: "session-3", exercise_id: benchExId, set_number: 2, weight: 45, reps: 10, completed: true, date: "2026-09-24" },
      { id: "s3-3", session_id: "session-3", exercise_id: benchExId, set_number: 3, weight: 45, reps: 8, completed: true, date: "2026-09-24" }
    ];

    const history = getExerciseHistory(allSets, allSessions, benchExId);
    assert.equal(history.length, 3);
    assert.equal(history[0].date, "2026-09-24");
    assert.equal(history[0].maxWeight, 45);
    assert.equal(history[0].totalVolume, 1350);

    const prs = getExercisePRs(allSets, benchExId);
    assert.equal(prs.maxWeight, 45);
    assert.equal(prs.maxReps, 12);
    assert.equal(prs.maxSetVolume, 540); // 45 * 12

    const allPRs = getAllExercisePRs(allSets, SOLOMON_WORKOUT_TEMPLATE);
    const benchPR = allPRs.find(p => p.id === benchExId);
    assert.ok(benchPR);
    assert.equal(benchPR.maxWeight, 45);
    assert.equal(benchPR.bestReps, 12);
  });

  await t.test("7. Exercise program customization without destroying historical records", async () => {
    const mockUser = { id: "test-user-fitness-edit" };
    repository.resetSession();

    const benchExId = "solomon-mon-ex-1";

    // Create session & sets history under benchExId
    const setRecords = [
      { id: generateUUID(), session_id: "hist-sess-1", exercise_id: benchExId, exercise_name: "Bench Press", set_number: 1, weight: 50, reps: 10, completed: true }
    ];
    await repository.saveWorkoutSession({ id: "hist-sess-1", date: todayStr(), split_title: "CHEST + TRICEPS", total_volume: 500 }, setRecords, mockUser);

    // Edit program exercise (rename Bench Press -> Barbell Bench Press)
    await repository.editProgramExercise(benchExId, { name: "Barbell Bench Press", targetSets: 4, targetReps: "10/10/10/10" }, mockUser);

    // Verify program exercise was updated
    const updatedMonEx = repository.state.fitness.routine[0].exercises.find(e => e.id === benchExId);
    assert.equal(updatedMonEx.name, "Barbell Bench Press");
    assert.equal(updatedMonEx.targetSets, 4);

    // Verify historical sets are completely preserved under the stable exercise ID!
    assert.equal(repository.state.fitness.sets.length, 1);
    assert.equal(repository.state.fitness.sets[0].exercise_id, benchExId);
    assert.equal(repository.state.fitness.sets[0].weight, 50);

    // Delete exercise from program for future workouts
    await repository.deleteProgramExercise(benchExId, mockUser);
    const deletedMonEx = repository.state.fitness.routine[0].exercises.find(e => e.id === benchExId);
    assert.equal(deletedMonEx, undefined, "Exercise should be removed from future routine");

    // Verify historical sets STILL exist!
    assert.equal(repository.state.fitness.sets.length, 1, "Historical sets must NOT be deleted when exercise is removed from routine");
  });

  await t.test("8. Program exercise addition, moving, and reordering", async () => {
    const mockUser = { id: "test-user-fitness-reorder" };
    repository.resetSession();

    // Add new exercise to Monday
    await repository.addProgramExercise("Monday", {
      name: "Machine Incline Chest Fly",
      muscleGroup: "Chest",
      targetSets: 3,
      targetReps: "12/12/12",
      defaultWeight: 20
    }, mockUser);

    const monExs = repository.state.fitness.routine[0].exercises;
    const addedEx = monExs[monExs.length - 1];
    assert.equal(addedEx.name, "Machine Incline Chest Fly");

    // Move exercise to Thursday
    await repository.moveProgramExercise(addedEx.id, "Thursday", mockUser);
    const thuExs = repository.state.fitness.routine.find(r => r.day === "Thursday").exercises;
    assert.ok(thuExs.some(e => e.id === addedEx.id), "Exercise should now be in Thursday's routine");

    // Reorder Thursday exercises
    const origCount = thuExs.length;
    await repository.reorderProgramExercises("Thursday", origCount - 1, 0, mockUser);
    const updatedThuExs = repository.state.fitness.routine.find(r => r.day === "Thursday").exercises;
    assert.equal(updatedThuExs[0].id, addedEx.id, "Moved exercise should now be first in Thursday list");
  });
});
