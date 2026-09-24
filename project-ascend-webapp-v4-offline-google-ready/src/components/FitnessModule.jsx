import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dumbbell, Flame, Plus, CheckCircle2, Trophy, Calendar, Clock,
  BarChart2, Activity, Pencil, Trash2, ArrowUp, ArrowDown, RefreshCw,
  X, ChevronRight, Scale, AlertCircle, Play, Pause, RotateCcw, ArrowRightLeft, Layers
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";
import { repository, generateUUID, todayStr, SOLOMON_WORKOUT_TEMPLATE } from "../lib/repository";
import {
  calculateSetVolume, calculateSessionVolume, getExercisePRs,
  getPreviousExercisePerformance, calculateProgressionStatus,
  detectNewPRs, getAllExercisePRs, getExerciseHistory, getExerciseProgressionTimeline
} from "../lib/fitnessUtils";

export function FitnessModule({
  fitness,
  user,
  onFinishSessionSummary
}) {
  const routine = fitness?.routine || SOLOMON_WORKOUT_TEMPLATE;
  const sessions = fitness?.sessions || [];
  const sets = fitness?.sets || [];

  // Active Sub-Tab: "today" | "plan" | "history" | "progress" | "prs" | "program"
  const [activeTab, setActiveTab] = useState("today");

  // --- DAY NAMES & SELECTION ---
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = dayNames[new Date().getDay()];
  const [selectedDay, setSelectedDay] = useState(todayDayName);

  const activeDayRoutine = useMemo(() => {
    return routine.find(r => r.day.toLowerCase() === selectedDay.toLowerCase()) || routine[0];
  }, [routine, selectedDay]);

  // --- ACTIVE WORKOUT LOGGING STATE ---
  const [activeSession, setActiveSession] = useState(null); // null or session object
  const [sessionSetsMap, setSessionSetsMap] = useState({}); // { [exId]: Array of set records }
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState("Saved"); // "Saved" | "Saving..." | "Offline" | "Sync error"

  // Rest Timer State
  const [restTimerSec, setRestTimerSec] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const restTimerRef = useRef(null);

  // Active Workout Timer
  const workoutTimerRef = useRef(null);

  useEffect(() => {
    if (activeSession) {
      workoutTimerRef.current = setInterval(() => {
        setSessionDurationSec(prev => prev + 1);
      }, 1000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    }
    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    };
  }, [activeSession]);

  useEffect(() => {
    if (restTimerActive && restTimerSec > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimerSec(prev => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            setRestTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restTimerActive, restTimerSec]);

  const startRestTimer = (sec = 60) => {
    setRestTimerSec(sec);
    setRestTimerActive(true);
  };

  const formatTimerStr = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- START WORKOUT ACTION ---
  const handleStartWorkout = () => {
    if (!activeDayRoutine || activeDayRoutine.isRest) {
      alert("Today is marked as a Rest Day! You can select another day above to track a workout.");
      return;
    }

    const sessionId = generateUUID();
    const initialMap = {};

    (activeDayRoutine.exercises || []).forEach(ex => {
      const prevSets = getPreviousExercisePerformance(sets, sessions, ex.id);
      const targetCount = ex.targetSets || 3;
      const targetRepsArr = (ex.targetReps || "10").split("/");
      const defaultW = ex.defaultWeight || 0;

      const exerciseSets = [];
      for (let i = 0; i < targetCount; i++) {
        const prevSet = prevSets[i];
        const targetRepStr = (targetRepsArr[i] || targetRepsArr[0] || "10").trim();
        const repVal = parseInt(targetRepStr, 10) || 10;
        exerciseSets.push({
          id: generateUUID(),
          session_id: sessionId,
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_number: i + 1,
          target_reps: targetRepStr,
          weight: prevSet ? prevSet.weight : defaultW,
          reps: prevSet ? prevSet.reps : repVal,
          completed: false
        });
      }
      initialMap[ex.id] = exerciseSets;
    });

    setActiveSession({
      id: sessionId,
      day_name: activeDayRoutine.day,
      split_title: activeDayRoutine.title,
      started_at: new Date().toISOString()
    });
    setSessionSetsMap(initialMap);
    setSessionDurationSec(0);
    setSessionNotes("");
    setAutosaveStatus("Saved");
  };

  // --- AUTOSAVE & SET TRACKING HANDLERS ---
  const handleUpdateSetField = (exId, setIdx, field, value) => {
    setAutosaveStatus("Saving...");
    setSessionSetsMap(prev => {
      const exSets = [...(prev[exId] || [])];
      if (exSets[setIdx]) {
        exSets[setIdx] = { ...exSets[setIdx], [field]: value };
      }
      return { ...prev, [exId]: exSets };
    });
    setTimeout(() => {
      setAutosaveStatus(navigator.onLine ? "Saved" : "Offline");
    }, 400);
  };

  const handleToggleSetComplete = (exId, setIdx) => {
    setAutosaveStatus("Saving...");
    setSessionSetsMap(prev => {
      const exSets = [...(prev[exId] || [])];
      if (exSets[setIdx]) {
        const nextDone = !exSets[setIdx].completed;
        exSets[setIdx] = { ...exSets[setIdx], completed: nextDone };
        if (nextDone) {
          startRestTimer(60);
        }
      }
      return { ...prev, [exId]: exSets };
    });
    setTimeout(() => {
      setAutosaveStatus(navigator.onLine ? "Saved" : "Offline");
    }, 400);
  };

  const handleAddSetToExercise = (ex) => {
    setAutosaveStatus("Saving...");
    setSessionSetsMap(prev => {
      const exSets = [...(prev[ex.id] || [])];
      const nextSetNum = exSets.length + 1;
      const lastSet = exSets[exSets.length - 1];
      exSets.push({
        id: generateUUID(),
        session_id: activeSession?.id || generateUUID(),
        exercise_id: ex.id,
        exercise_name: ex.name,
        set_number: nextSetNum,
        target_reps: lastSet ? lastSet.target_reps : "10",
        weight: lastSet ? lastSet.weight : (ex.defaultWeight || 0),
        reps: lastSet ? lastSet.reps : 10,
        completed: false
      });
      return { ...prev, [ex.id]: exSets };
    });
    setTimeout(() => {
      setAutosaveStatus(navigator.onLine ? "Saved" : "Offline");
    }, 400);
  };

  const handleRemoveSetFromExercise = (exId, setIdx) => {
    setAutosaveStatus("Saving...");
    setSessionSetsMap(prev => {
      const exSets = (prev[exId] || []).filter((_, idx) => idx !== setIdx);
      const reindexed = exSets.map((s, idx) => ({ ...s, set_number: idx + 1 }));
      return { ...prev, [exId]: reindexed };
    });
    setTimeout(() => {
      setAutosaveStatus(navigator.onLine ? "Saved" : "Offline");
    }, 400);
  };

  // Active workout live metrics
  const activeWorkoutLoggedSets = useMemo(() => {
    const list = [];
    Object.values(sessionSetsMap).forEach(exSets => {
      exSets.forEach(s => {
        if (s.completed) list.push(s);
      });
    });
    return list;
  }, [sessionSetsMap]);

  const activeWorkoutTotalVolume = useMemo(() => {
    return calculateSessionVolume(activeWorkoutLoggedSets);
  }, [activeWorkoutLoggedSets]);

  const activeWorkoutTotalReps = useMemo(() => {
    return activeWorkoutLoggedSets.reduce((acc, s) => acc + (parseInt(s.reps, 10) || 0), 0);
  }, [activeWorkoutLoggedSets]);

  // Workout Summary Modal State
  const [workoutSummaryData, setWorkoutSummaryData] = useState(null);

  // --- FINISH WORKOUT ACTION ---
  const handleFinishWorkout = async () => {
    if (activeWorkoutLoggedSets.length === 0) {
      alert("Please check off at least one completed set before finishing your workout session.");
      return;
    }

    const durationMins = Math.max(1, Math.round(sessionDurationSec / 60));
    const nowIso = new Date().toISOString();

    const newSession = {
      id: activeSession.id,
      workout_date: todayStr(),
      date: todayStr(),
      day_name: activeDayRoutine.day,
      split_title: activeDayRoutine.title,
      duration_minutes: durationMins,
      total_volume: activeWorkoutTotalVolume,
      total_sets: activeWorkoutLoggedSets.length,
      total_reps: activeWorkoutTotalReps,
      notes: sessionNotes,
      status: "COMPLETED",
      started_at: activeSession.started_at,
      completed_at: nowIso,
      created_at: nowIso
    };

    const prog = calculateProgressionStatus(sessions, newSession);
    const newPRs = detectNewPRs(sets, activeWorkoutLoggedSets, activeSession.id);

    await repository.saveWorkoutSession(newSession, activeWorkoutLoggedSets, user);

    const summaryObj = {
      session: newSession,
      progression: prog,
      newPRs: newPRs,
      totalSets: activeWorkoutLoggedSets.length,
      totalReps: activeWorkoutTotalReps,
      setsList: activeWorkoutLoggedSets
    };

    setWorkoutSummaryData(summaryObj);

    if (onFinishSessionSummary) {
      onFinishSessionSummary(summaryObj);
    }

    setActiveSession(null);
    setSessionSetsMap({});
    setSessionDurationSec(0);
    setSessionNotes("");
    setRestTimerActive(false);
  };

  // --- PROGRAM EDITING MODAL STATES ---
  const [exerciseModal, setExerciseModal] = useState(null); // null | { isNew, dayName, exercise }
  const [moveModal, setMoveModal] = useState(null); // null | { exercise }
  const [selectedHistoryExercise, setSelectedHistoryExercise] = useState(null); // null | exId

  const handleResetToPDFDefault = async () => {
    if (confirm("Reset workout program to the original 6-Day Solomon Split PDF default? This will update your program routine without deleting your past workout performance records.")) {
      await repository.saveWorkoutRoutine(SOLOMON_WORKOUT_TEMPLATE, user);
    }
  };

  const handleDeleteExerciseFromProgram = async (exerciseId, exerciseName) => {
    if (confirm(`Remove "${exerciseName}" from future workout routines? Historical workout logs for this exercise will be preserved.`)) {
      await repository.deleteProgramExercise(exerciseId, user);
    }
  };

  // --- PROGRESS DASHBOARD DATA ---
  const [progressRangeDays, setProgressRangeDays] = useState(30);
  const [progressSelectedExercise, setProgressSelectedExercise] = useState(() => {
    return (routine[0]?.exercises[0]?.id) || "solomon-mon-ex-1";
  });

  const filteredSessions = useMemo(() => {
    const today = new Date();
    return sessions.filter(s => {
      if (!s.date && !s.workout_date) return false;
      const d = new Date(s.date || s.workout_date);
      const diffDays = (today - d) / (1000 * 3600 * 24);
      return progressRangeDays === 0 || diffDays <= progressRangeDays;
    });
  }, [sessions, progressRangeDays]);

  const totalProgressVolume = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.total_volume || 0), 0);
  }, [filteredSessions]);

  const totalProgressSets = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.total_sets || s.completed_sets_count || 0), 0);
  }, [filteredSessions]);

  const totalProgressReps = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.total_reps || 0), 0);
  }, [filteredSessions]);

  const allPRsList = useMemo(() => {
    return getAllExercisePRs(sets, routine);
  }, [sets, routine]);

  const exerciseHistoryData = useMemo(() => {
    if (!selectedHistoryExercise) return [];
    return getExerciseHistory(sets, sessions, selectedHistoryExercise);
  }, [sets, sessions, selectedHistoryExercise]);

  const exerciseProgressionChartData = useMemo(() => {
    if (!progressSelectedExercise) return [];
    return getExerciseProgressionTimeline(sets, sessions, progressSelectedExercise);
  }, [sets, sessions, progressSelectedExercise]);

  return (
    <main className="viewContainer fade-in">
      {/* HEADER ROW */}
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText">
            <Dumbbell size={13} /> ASCEND ATHLETICS & WORKOUT TRACKER
          </div>
          <h2 className="pageTitle">FITNESS MODULE 🏋️</h2>
          <p className="pageSubtitle">
            Track actual sets, weight, reps, progressive overload, and personal records with zero data loss.
          </p>
        </div>

        {activeSession && (
          <div className="activeSessionHeaderBadge">
            <Flame size={16} className="flameSpin" color="#f59e0b" />
            <span>Active: {activeSession.split_title} ({formatTimerStr(sessionDurationSec)})</span>
            <button className="primaryBtn small" onClick={() => setActiveTab("today")}>
              Go to Active Workout
            </button>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="subTabPills" style={{ marginBottom: 20 }}>
        <button
          className={`subTabPill ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          🔥 TODAY
        </button>
        <button
          className={`subTabPill ${activeTab === "plan" ? "active" : ""}`}
          onClick={() => setActiveTab("plan")}
        >
          📋 WORKOUT PLAN
        </button>
        <button
          className={`subTabPill ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📜 HISTORY
        </button>
        <button
          className={`subTabPill ${activeTab === "progress" ? "active" : ""}`}
          onClick={() => setActiveTab("progress")}
        >
          📈 PROGRESS
        </button>
        <button
          className={`subTabPill ${activeTab === "prs" ? "active" : ""}`}
          onClick={() => setActiveTab("prs")}
        >
          🏆 PERSONAL RECORDS
        </button>
        <button
          className={`subTabPill ${activeTab === "program" ? "active" : ""}`}
          onClick={() => setActiveTab("program")}
        >
          ⚙️ EDIT PROGRAM
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. TODAY & ACTIVE WORKOUT TAB */}
      {/* ========================================================= */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {/* DAY SWITCHER SELECTOR */}
          <div className="daySwitcherBar">
            {dayNames.map(dName => {
              const isToday = dName.toLowerCase() === todayDayName.toLowerCase();
              const isSel = dName.toLowerCase() === selectedDay.toLowerCase();
              const dRoutine = routine.find(r => r.day.toLowerCase() === dName.toLowerCase());
              return (
                <button
                  key={dName}
                  className={`daySelectBtn ${isSel ? "active" : ""} ${isToday ? "isToday" : ""}`}
                  onClick={() => setSelectedDay(dName)}
                >
                  <span className="dayBtnName">{dName.slice(0, 3)}</span>
                  {isToday && <span className="todayDot">•</span>}
                  <span className="dayBtnFocus">{dRoutine?.isRest ? "Rest" : dRoutine?.title?.split("+")[0] || "Workout"}</span>
                </button>
              );
            })}
          </div>

          {/* DAY SUMMARY BANNER */}
          <div className="glassPanel workoutDayBanner">
            <div>
              <span className="dayBannerTag">{selectedDay.toUpperCase()} {selectedDay === todayDayName ? "(TODAY)" : ""}</span>
              <h2 className="dayBannerTitle">{activeDayRoutine?.title || "REST DAY"}</h2>
              <p className="dayBannerSubtitle">{activeDayRoutine?.subtitle || "Recovery & Mobility"}</p>
            </div>

            {!activeSession && !activeDayRoutine?.isRest && (
              <button className="primaryBtn large" onClick={handleStartWorkout} style={{ padding: "14px 28px", fontSize: "16px" }}>
                <Flame size={20} /> START WORKOUT
              </button>
            )}

            {activeSession && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className={`autosaveBadge ${autosaveStatus.toLowerCase().replace(/\s+/g, "")}`}>
                  {autosaveStatus === "Saving..." && <RefreshCw size={12} className="spin" />}
                  {autosaveStatus === "Saved" && <CheckCircle2 size={12} color="#48bb78" />}
                  {autosaveStatus === "Offline" && <AlertCircle size={12} color="#f59e0b" />}
                  <span>{autosaveStatus}</span>
                </div>
                <button className="primaryBtn dangerHover" onClick={handleFinishWorkout} style={{ padding: "12px 24px" }}>
                  ✓ COMPLETE WORKOUT
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE WORKOUT METRICS TOP BAR (IF ACTIVE) */}
          {activeSession && (
            <div className="duesMetricsGrid activeWorkoutMetrics">
              <div className="metricCard">
                <div className="metricIcon gold"><Clock size={20} /></div>
                <div className="metricData">
                  <span className="metricVal">{formatTimerStr(sessionDurationSec)}</span>
                  <span className="metricLbl">Elapsed Time</span>
                </div>
              </div>
              <div className="metricCard">
                <div className="metricIcon flame"><CheckCircle2 size={20} /></div>
                <div className="metricData">
                  <span className="metricVal">{activeWorkoutLoggedSets.length} sets</span>
                  <span className="metricLbl">Completed Sets</span>
                </div>
              </div>
              <div className="metricCard">
                <div className="metricIcon gold"><Activity size={20} /></div>
                <div className="metricData">
                  <span className="metricVal">{activeWorkoutTotalReps}</span>
                  <span className="metricLbl">Total Reps</span>
                </div>
              </div>
              <div className="metricCard">
                <div className="metricIcon star"><Trophy size={20} /></div>
                <div className="metricData">
                  <span className="metricVal">{activeWorkoutTotalVolume.toLocaleString("en-IN")} kg</span>
                  <span className="metricLbl">Current Volume</span>
                </div>
              </div>
            </div>
          )}

          {/* REST TIMER CARD (IF RUNNING) */}
          {restTimerActive && (
            <div className="glassPanel restTimerCard">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Clock size={24} className="flameSpin" color="#f5b942" />
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px" }}>Rest Timer</h4>
                  <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-gold)" }}>
                    {formatTimerStr(restTimerSec)}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="secondaryBtn small" onClick={() => startRestTimer(restTimerSec + 30)}>+30s</button>
                <button className="secondaryBtn small" onClick={() => setRestTimerActive(false)}>Skip</button>
              </div>
            </div>
          )}

          {/* EXERCISES LIST */}
          {activeDayRoutine?.isRest ? (
            <div className="glassPanel emptyStateCard" style={{ padding: "40px 20px", textAlign: "center" }}>
              <Dumbbell size={40} className="goldAccentIcon" />
              <h3>Rest & Recovery Day</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
                No prescribed exercises for {selectedDay}. Rest, stretch, and refuel!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeDayRoutine?.exercises || []).map((ex, exIdx) => {
                const prevPerformanceSets = getPreviousExercisePerformance(sets, sessions, ex.id);
                const activeSets = sessionSetsMap[ex.id] || [];

                return (
                  <div key={ex.id} className="glassPanel exerciseCard">
                    {/* EXERCISE HEADER */}
                    <div className="exerciseHeaderRow">
                      <div className="exerciseTitleGroup">
                        <span className="exerciseIndex">#{exIdx + 1}</span>
                        <div>
                          <h3 className="exerciseName">
                            {ex.name}
                            {ex.optional ? <span className="optionalTag"> (Optional)</span> : ""}
                          </h3>
                          <span className="exerciseMuscleTag">{ex.muscleGroup}</span>
                        </div>
                      </div>

                      <button
                        className="secondaryBtn small"
                        onClick={() => setSelectedHistoryExercise(ex.id)}
                        title="View Complete Exercise History"
                      >
                        <Clock size={13} /> History
                      </button>
                    </div>

                    {/* TARGET & PREVIOUS PERFORMANCE SUMMARY */}
                    <div className="exerciseMetaSummaryRow">
                      <div className="targetBlock">
                        <small>TARGET SETS / REPS</small>
                        <strong>{ex.targetSets} sets × {ex.targetReps}</strong>
                      </div>

                      <div className="previousBlock">
                        <small>LAST TIME RECORDED</small>
                        <span>
                          {prevPerformanceSets.length > 0 ? (
                            prevPerformanceSets.map(p => `${p.weight}kg × ${p.reps}`).join(" | ")
                          ) : (
                            "No past history recorded"
                          )}
                        </span>
                      </div>
                    </div>

                    {/* ACTIVE SET TRACKING (WHEN IN ACTIVE WORKOUT) */}
                    {activeSession && (
                      <div className="activeSetsTableContainer">
                        <div className="setsTableHeader">
                          <span>SET</span>
                          <span>WEIGHT (KG)</span>
                          <span>REPS</span>
                          <span style={{ textAlign: "center" }}>COMPLETE</span>
                        </div>

                        {activeSets.map((s, sIdx) => (
                          <div key={s.id || sIdx} className={`setRowItem ${s.completed ? "isCompleted" : ""}`}>
                            <span className="setNumLabel">Set {s.set_number}</span>

                            {/* WEIGHT INPUT WITH STEPPERS */}
                            <div className="inputStepperGroup">
                              <button
                                className="stepperBtn"
                                type="button"
                                onClick={() => handleUpdateSetField(ex.id, sIdx, "weight", Math.max(0, (parseFloat(s.weight) || 0) - 2.5))}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                className="setNumericInput"
                                value={s.weight}
                                onChange={e => handleUpdateSetField(ex.id, sIdx, "weight", e.target.value)}
                              />
                              <button
                                className="stepperBtn"
                                type="button"
                                onClick={() => handleUpdateSetField(ex.id, sIdx, "weight", (parseFloat(s.weight) || 0) + 2.5)}
                              >
                                +
                              </button>
                            </div>

                            {/* REPS INPUT WITH STEPPERS */}
                            <div className="inputStepperGroup">
                              <button
                                className="stepperBtn"
                                type="button"
                                onClick={() => handleUpdateSetField(ex.id, sIdx, "reps", Math.max(0, (parseInt(s.reps, 10) || 0) - 1))}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                className="setNumericInput"
                                value={s.reps}
                                onChange={e => handleUpdateSetField(ex.id, sIdx, "reps", e.target.value)}
                              />
                              <button
                                className="stepperBtn"
                                type="button"
                                onClick={() => handleUpdateSetField(ex.id, sIdx, "reps", (parseInt(s.reps, 10) || 0) + 1)}
                              >
                                +
                              </button>
                            </div>

                            {/* SET COMPLETE CHECKMARK */}
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                              <button
                                type="button"
                                className={`setCheckBtn ${s.completed ? "checked" : ""}`}
                                onClick={() => handleToggleSetComplete(ex.id, sIdx)}
                              >
                                {s.completed ? <CheckCircle2 size={20} color="#48bb78" /> : <div className="uncheckedRing"></div>}
                              </button>
                              {activeSets.length > 1 && (
                                <button
                                  type="button"
                                  className="iconBtn small dangerHover"
                                  onClick={() => handleRemoveSetFromExercise(ex.id, sIdx)}
                                  title="Remove Set"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="exerciseCardActions">
                          <button type="button" className="secondaryBtn small" onClick={() => handleAddSetToExercise(ex)}>
                            <Plus size={14} /> Add Set
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. WORKOUT PLAN TAB */}
      {/* ========================================================= */}
      {activeTab === "plan" && (
        <div className="space-y-6">
          <div className="glassPanel" style={{ padding: "20px 24px" }}>
            <h3 style={{ fontSize: "18px", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={18} style={{ color: "var(--accent-gold)" }} /> SOURCE WORKOUT PROGRAM (SOLOMON SPLIT)
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
              Official preloaded 6-Day split with targeted volume, sets, and rep ranges.
            </p>
          </div>

          <div className="duesGrid">
            {routine.map((d, dIdx) => (
              <div key={d.day || dIdx} className="dueCard">
                <div className="dueHeader">
                  <div>
                    <h3 className="duePersonName">{d.day.toUpperCase()}</h3>
                    <div className="dueBadgesRow">
                      <span className={`dueTypeTag ${d.isRest ? "owed" : "lent"}`}>
                        {d.title}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {(d.exercises || []).length} Exercises
                  </span>
                </div>

                {d.isRest ? (
                  <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                    🌱 Rest & Recovery Day. No exercises.
                  </div>
                ) : (
                  <div className="space-y-2" style={{ marginTop: 12 }}>
                    {(d.exercises || []).map((ex, eIdx) => (
                      <div key={ex.id || eIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
                        <span>
                          <strong>{eIdx + 1}. {ex.name}</strong>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: 6 }}>({ex.muscleGroup})</span>
                        </span>
                        <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>
                          {ex.targetSets} × {ex.targetReps}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. HISTORY TAB */}
      {/* ========================================================= */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="glassPanel" style={{ padding: "20px 24px" }}>
            <h3 style={{ fontSize: "18px", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} style={{ color: "var(--accent-gold)" }} /> WORKOUT SESSION LOG HISTORY
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
              Review past completed workout sessions, total volume, and logged set performance.
            </p>
          </div>

          {sessions.length === 0 ? (
            <div className="glassPanel emptyStateCard" style={{ padding: "40px 20px", textAlign: "center" }}>
              <Clock size={36} className="goldAccentIcon" />
              <h3>No completed sessions found</h3>
              <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
                Start a workout from TODAY tab to record your first workout session!
              </p>
            </div>
          ) : (
            <div className="duesGrid">
              {[...sessions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((s) => {
                const sessionSets = sets.filter(st => st.session_id === s.id && st.completed !== false);
                return (
                  <div key={s.id} className="dueCard">
                    <div className="dueHeader">
                      <div>
                        <h3 className="duePersonName">🏋️ {s.split_title || s.day_name}</h3>
                        <div className="dueBadgesRow">
                          <span className="dueTypeTag lent">{s.date || s.workout_date}</span>
                          <span className="statusPill pending">⏱️ {s.duration_minutes || 45} mins</span>
                        </div>
                      </div>

                      <button
                        className="iconBtn small dangerHover"
                        onClick={async () => {
                          if (confirm("Delete this completed session and its set records?")) {
                            await repository.deleteWorkoutSession(s.id, user);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="dueAmountBlock">
                      <div className="amountCol">
                        <small>Total Volume</small>
                        <strong style={{ color: "var(--accent-gold)" }}>{(s.total_volume || 0).toLocaleString("en-IN")} kg</strong>
                      </div>
                      <div className="amountCol">
                        <small>Sets Completed</small>
                        <strong>{s.total_sets || sessionSets.length} sets</strong>
                      </div>
                      <div className="amountCol remaining">
                        <small>Total Reps</small>
                        <strong>{s.total_reps || sessionSets.reduce((acc, st) => acc + (parseInt(st.reps, 10) || 0), 0)} reps</strong>
                      </div>
                    </div>

                    {sessionSets.length > 0 && (
                      <div className="space-y-1" style={{ marginTop: 10, background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                        <small style={{ color: "var(--text-muted)", display: "block", marginBottom: 4 }}>EXERCISES PERFORMED:</small>
                        {Object.values(
                          sessionSets.reduce((acc, st) => {
                            if (!acc[st.exercise_id]) acc[st.exercise_id] = { name: st.exercise_name, sets: [] };
                            acc[st.exercise_id].sets.push(st);
                            return acc;
                          }, {})
                        ).map((exGroup, idx) => (
                          <div key={idx} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: 4 }}>
                            <span><strong>{exGroup.name}</strong> ({exGroup.sets.length} sets)</span>
                            <span>{exGroup.sets.map(st => `${st.weight}k×${st.reps}`).join(", ")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PROGRESS TAB */}
      {/* ========================================================= */}
      {activeTab === "progress" && (
        <div className="space-y-6">
          {/* RANGE FILTER BUTTONS */}
          <div className="glassPanel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 size={18} style={{ color: "var(--accent-gold)" }} /> PROGRESSIVE OVERLOAD DASHBOARD
            </h3>

            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "7 Days", days: 7 },
                { label: "30 Days", days: 30 },
                { label: "90 Days", days: 90 },
                { label: "All Time", days: 0 }
              ].map(item => (
                <button
                  key={item.label}
                  className={`subTabPill ${progressRangeDays === item.days ? "active" : ""}`}
                  onClick={() => setProgressRangeDays(item.days)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* PROGRESS METRICS GRID */}
          <div className="duesMetricsGrid">
            <div className="metricCard">
              <div className="metricIcon gold"><Trophy size={22} /></div>
              <div className="metricData">
                <span className="metricVal">{totalProgressVolume.toLocaleString("en-IN")} kg</span>
                <span className="metricLbl">Training Volume ({progressRangeDays ? `${progressRangeDays}d` : "All Time"})</span>
              </div>
            </div>
            <div className="metricCard">
              <div className="metricIcon flame"><Activity size={22} /></div>
              <div className="metricData">
                <span className="metricVal">{filteredSessions.length} sessions</span>
                <span className="metricLbl">Workout Frequency</span>
              </div>
            </div>
            <div className="metricCard">
              <div className="metricIcon gold"><CheckCircle2 size={22} /></div>
              <div className="metricData">
                <span className="metricVal">{totalProgressSets}</span>
                <span className="metricLbl">Total Sets Completed</span>
              </div>
            </div>
            <div className="metricCard">
              <div className="metricIcon star"><BarChart2 size={22} /></div>
              <div className="metricData">
                <span className="metricVal">{totalProgressReps}</span>
                <span className="metricLbl">Total Reps Logged</span>
              </div>
            </div>
          </div>

          {/* EXERCISE PROGRESSION CHART */}
          <div className="glassPanel" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ fontSize: "16px", margin: 0 }}>Exercise Progression Over Time</h3>
              <select
                className="selectInput"
                value={progressSelectedExercise}
                onChange={e => setProgressSelectedExercise(e.target.value)}
                style={{ width: "auto", minWidth: 220 }}
              >
                {allPRsList.map(pr => (
                  <option key={pr.id} value={pr.id}>{pr.name} ({pr.muscleGroup})</option>
                ))}
              </select>
            </div>

            {exerciseProgressionChartData.length > 0 ? (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseProgressionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2738" />
                    <XAxis dataKey="date" stroke="#8b96a8" fontSize={11} />
                    <YAxis stroke="#8b96a8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "#121622", borderColor: "#1f2738", borderRadius: "10px", color: "#f3f4f6", fontSize: "12px" }}
                      formatter={(val, name) => [val + (name === "maxWeight" ? " kg" : " kg volume"), name === "maxWeight" ? "Max Weight" : "Total Volume"]}
                    />
                    <Line type="monotone" dataKey="maxWeight" stroke="#f5b942" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="maxWeight" />
                    <Line type="monotone" dataKey="totalVolume" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="totalVolume" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                <BarChart2 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <p>No recorded sessions for this exercise yet. Log workouts in TODAY tab to see progress charts.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. PERSONAL RECORDS TAB */}
      {/* ========================================================= */}
      {activeTab === "prs" && (
        <div className="space-y-6">
          <div className="glassPanel" style={{ padding: "20px 24px" }}>
            <h3 style={{ fontSize: "18px", margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} style={{ color: "var(--accent-gold)" }} /> PERSONAL RECORDS (PR HALL OF FAME)
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
              Calculated strictly from actual recorded workout set data.
            </p>
          </div>

          <div className="duesGrid">
            {allPRsList.map(pr => (
              <div key={pr.id} className="dueCard">
                <div className="dueHeader">
                  <div>
                    <h3 className="duePersonName">🏆 {pr.name}</h3>
                    <span className="dueTypeTag lent">{pr.muscleGroup}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--accent-gold)", fontWeight: 700 }}>
                    {pr.totalSetsLogged} sets logged
                  </span>
                </div>

                <div className="dueAmountBlock">
                  <div className="amountCol">
                    <small>Heaviest Weight</small>
                    <strong style={{ color: "var(--accent-gold)", fontSize: "16px" }}>{pr.maxWeight > 0 ? `${pr.maxWeight} kg` : "N/A"}</strong>
                  </div>
                  <div className="amountCol">
                    <small>Best Reps</small>
                    <strong>{pr.bestReps > 0 ? `${pr.bestReps} reps @ ${pr.maxWeight}kg` : "N/A"}</strong>
                  </div>
                  <div className="amountCol remaining">
                    <small>Max Session Vol</small>
                    <strong>{pr.highestSessionVolume > 0 ? `${pr.highestSessionVolume} kg` : "N/A"}</strong>
                  </div>
                </div>

                <div className="dueDatesRow">
                  <span>PR Recorded Date: {pr.prDate || "No data"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. EDIT PROGRAM TAB */}
      {/* ========================================================= */}
      {activeTab === "program" && (
        <div className="space-y-6">
          <div className="glassPanel" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: "18px", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 8 }}>
                ⚙️ EDIT WORKOUT PROGRAM
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                Customize exercises, target sets/reps, and muscle groups for future workouts. Past history is strictly preserved.
              </p>
            </div>

            <button className="secondaryBtn dangerHover" onClick={handleResetToPDFDefault}>
              <RotateCcw size={14} /> Reset to PDF Default
            </button>
          </div>

          {/* DAY SELECTOR */}
          <div className="daySwitcherBar">
            {dayNames.filter(d => d !== "Sunday").map(dName => {
              const isSel = dName.toLowerCase() === selectedDay.toLowerCase();
              return (
                <button
                  key={dName}
                  className={`daySelectBtn ${isSel ? "active" : ""}`}
                  onClick={() => setSelectedDay(dName)}
                >
                  <span className="dayBtnName">{dName}</span>
                </button>
              );
            })}
          </div>

          {/* DAY EDIT HEADER */}
          <div className="glassPanel" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "16px" }}>
              {activeDayRoutine?.day} — {activeDayRoutine?.title}
            </h4>
            <button
              className="primaryBtn small"
              onClick={() => setExerciseModal({ isNew: true, dayName: activeDayRoutine?.day, exercise: {} })}
            >
              <Plus size={14} /> Add Exercise to Day
            </button>
          </div>

          {/* EXERCISES EDITOR LIST */}
          <div className="space-y-3">
            {(activeDayRoutine?.exercises || []).map((ex, idx) => (
              <div key={ex.id || idx} className="glassPanel" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <strong style={{ fontSize: "15px" }}>{idx + 1}. {ex.name}</strong>
                  {ex.optional && <span className="optionalTag"> (Optional)</span>}
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 4 }}>
                    Group: <strong>{ex.muscleGroup}</strong> | Target: <strong>{ex.targetSets} sets × {ex.targetReps}</strong>
                  </div>
                </div>

                <div className="cardActions" style={{ gap: 8 }}>
                  <button
                    className="iconBtn small"
                    disabled={idx === 0}
                    onClick={() => repository.reorderProgramExercises(activeDayRoutine.day, idx, idx - 1, user)}
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="iconBtn small"
                    disabled={idx === (activeDayRoutine.exercises.length - 1)}
                    onClick={() => repository.reorderProgramExercises(activeDayRoutine.day, idx, idx + 1, user)}
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    className="iconBtn small"
                    onClick={() => setMoveModal({ exercise: ex })}
                    title="Move to another day"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                  <button
                    className="iconBtn small"
                    onClick={() => setExerciseModal({ isNew: false, dayName: activeDayRoutine.day, exercise: ex })}
                    title="Edit Exercise"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="iconBtn small dangerHover"
                    onClick={() => handleDeleteExerciseFromProgram(ex.id, ex.name)}
                    title="Delete Exercise"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* ADD / EDIT EXERCISE MODAL */}
      {exerciseModal && (
        <div className="modalBackdrop">
          <div className="modalCard glassPanel">
            <div className="modalHeader">
              <h3>{exerciseModal.isNew ? "Add Exercise to Program" : "Edit Program Exercise"}</h3>
              <button className="iconBtn small" onClick={() => setExerciseModal(null)}><X size={16} /></button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const name = form.name.value.trim();
                const muscleGroup = form.muscleGroup.value;
                const targetSets = parseInt(form.targetSets.value, 10) || 3;
                const targetReps = form.targetReps.value.trim();
                const optional = form.optional.checked;

                if (!name) {
                  alert("Exercise name is required.");
                  return;
                }

                if (exerciseModal.isNew) {
                  await repository.addProgramExercise(exerciseModal.dayName, {
                    name, muscleGroup, targetSets, targetReps, optional
                  }, user);
                } else {
                  await repository.editProgramExercise(exerciseModal.exercise.id, {
                    name, muscleGroup, targetSets, targetReps, optional
                  }, user);
                }
                setExerciseModal(null);
              }}
              className="modalForm"
            >
              <div className="formGroup">
                <label>Exercise Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={exerciseModal.exercise.name || ""}
                  placeholder="e.g. Incline Bench Press"
                />
              </div>

              <div className="formRowGrid">
                <div className="formGroup">
                  <label>Muscle Group</label>
                  <select name="muscleGroup" defaultValue={exerciseModal.exercise.muscleGroup || "Chest"} className="selectInput">
                    <option value="Chest">Chest</option>
                    <option value="Back">Back</option>
                    <option value="Shoulders">Shoulders</option>
                    <option value="Triceps">Triceps</option>
                    <option value="Biceps">Biceps</option>
                    <option value="Legs">Legs</option>
                    <option value="Core">Core</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>Target Sets</label>
                  <input
                    name="targetSets"
                    type="number"
                    defaultValue={exerciseModal.exercise.targetSets || 3}
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>Target Reps (e.g., 12/10/8)</label>
                <input
                  name="targetReps"
                  type="text"
                  defaultValue={exerciseModal.exercise.targetReps || "12/10/8"}
                />
              </div>

              <div className="formGroup" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  name="optional"
                  type="checkbox"
                  id="chkOptional"
                  defaultChecked={!!exerciseModal.exercise.optional}
                />
                <label htmlFor="chkOptional" style={{ margin: 0, cursor: "pointer" }}>Mark as Optional Exercise</label>
              </div>

              <div className="modalFooter">
                <button type="button" className="secondaryBtn" onClick={() => setExerciseModal(null)}>Cancel</button>
                <button type="submit" className="primaryBtn">Save Exercise</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVE EXERCISE TO ANOTHER DAY MODAL */}
      {moveModal && (
        <div className="modalBackdrop">
          <div className="modalCard glassPanel">
            <div className="modalHeader">
              <h3>Move "{moveModal.exercise.name}"</h3>
              <button className="iconBtn small" onClick={() => setMoveModal(null)}><X size={16} /></button>
            </div>

            <div className="modalForm">
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                Select target day to move this exercise to:
              </p>

              <div className="space-y-2">
                {dayNames.filter(d => d !== "Sunday").map(dName => (
                  <button
                    key={dName}
                    className="secondaryBtn"
                    style={{ width: "100%", justifyContent: "flex-start" }}
                    onClick={async () => {
                      await repository.moveProgramExercise(moveModal.exercise.id, dName, user);
                      setMoveModal(null);
                    }}
                  >
                    📅 Move to {dName}
                  </button>
                ))}
              </div>

              <div className="modalFooter">
                <button type="button" className="secondaryBtn" onClick={() => setMoveModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXERCISE HISTORY MODAL */}
      {selectedHistoryExercise && (
        <div className="modalBackdrop">
          <div className="modalCard glassPanel" style={{ maxWidth: 650 }}>
            <div className="modalHeader">
              <h3>
                Exercise History: {routine.flatMap(r => r.exercises).find(e => e.id === selectedHistoryExercise)?.name || "Exercise"}
              </h3>
              <button className="iconBtn small" onClick={() => setSelectedHistoryExercise(null)}><X size={16} /></button>
            </div>

            <div style={{ maxHeight: "65vh", overflowY: "auto", padding: "10px 4px" }}>
              {exerciseHistoryData.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                  No historical workout records logged for this exercise yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {exerciseHistoryData.map((h, idx) => (
                    <div key={idx} className="glassPanel" style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, marginBottom: 8, color: "var(--accent-gold)" }}>
                        <span>📅 {h.date} ({h.splitTitle})</span>
                        <span>Total Vol: {h.totalVolume} kg</span>
                      </div>

                      <div className="space-y-1">
                        {h.sets.map((st, stIdx) => (
                          <div key={stIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.02)", padding: "4px 8px", borderRadius: "4px" }}>
                            <span>Set {st.set_number}: {st.weight} kg × {st.reps} reps</span>
                            <span style={{ color: "var(--text-muted)" }}>Volume: {calculateSetVolume(st)} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modalFooter">
              <button type="button" className="secondaryBtn" onClick={() => setSelectedHistoryExercise(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT SUMMARY MODAL */}
      {workoutSummaryData && (
        <div className="modalBackdrop">
          <div className="modalCard glassPanel" style={{ maxWidth: 580 }}>
            <div className="modalHeader">
              <h3>WORKOUT COMPLETE 🎉</h3>
              <button className="iconBtn small" onClick={() => setWorkoutSummaryData(null)}><X size={16} /></button>
            </div>

            <div className="modalForm">
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: "13px", color: "var(--accent-gold)", fontWeight: 700 }}>WORKOUT LOGGED</span>
                <h2 style={{ margin: "4px 0", fontSize: "22px" }}>
                  {workoutSummaryData.session.day_name} — {workoutSummaryData.session.split_title}
                </h2>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Duration: {workoutSummaryData.session.duration_minutes} mins · Date: {workoutSummaryData.session.date}
                </span>
              </div>

              {/* SUMMARY METRICS GRID */}
              <div className="duesMetricsGrid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
                <div className="metricCard" style={{ padding: "10px" }}>
                  <div className="metricData" style={{ textAlign: "center" }}>
                    <span className="metricVal" style={{ fontSize: "16px" }}>
                      {new Set(workoutSummaryData.setsList.map(s => s.exercise_id)).size}
                    </span>
                    <span className="metricLbl">Exercises</span>
                  </div>
                </div>
                <div className="metricCard" style={{ padding: "10px" }}>
                  <div className="metricData" style={{ textAlign: "center" }}>
                    <span className="metricVal" style={{ fontSize: "16px" }}>{workoutSummaryData.totalSets}</span>
                    <span className="metricLbl">Sets</span>
                  </div>
                </div>
                <div className="metricCard" style={{ padding: "10px" }}>
                  <div className="metricData" style={{ textAlign: "center" }}>
                    <span className="metricVal" style={{ fontSize: "16px" }}>{workoutSummaryData.totalReps}</span>
                    <span className="metricLbl">Reps</span>
                  </div>
                </div>
                <div className="metricCard" style={{ padding: "10px" }}>
                  <div className="metricData" style={{ textAlign: "center" }}>
                    <span className="metricVal" style={{ fontSize: "16px", color: "var(--accent-gold)" }}>
                      {workoutSummaryData.session.total_volume.toLocaleString("en-IN")} kg
                    </span>
                    <span className="metricLbl">Volume</span>
                  </div>
                </div>
              </div>

              {/* PR ALERTS IF ANY */}
              {workoutSummaryData.newPRs && workoutSummaryData.newPRs.length > 0 && (
                <div style={{ background: "rgba(245, 185, 66, 0.15)", border: "1px solid var(--accent-gold)", borderRadius: "10px", padding: "12px", marginBottom: 16 }}>
                  <strong style={{ color: "var(--accent-gold)", fontSize: "14px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Trophy size={16} /> NEW PERSONAL RECORDS ACHIEVED!
                  </strong>
                  <div className="space-y-1" style={{ marginTop: 6 }}>
                    {workoutSummaryData.newPRs.map((pr, idx) => (
                      <div key={idx} style={{ fontSize: "12px" }}>
                        🔥 <strong>{pr.exercise_name}</strong>: {pr.type === "MAX_WEIGHT" ? "Max Weight" : "Max Set Vol"} {pr.value} (Prev: {pr.prevValue})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXERCISE-LEVEL BREAKDOWN */}
              <div className="space-y-2" style={{ maxHeight: "35vh", overflowY: "auto", paddingRight: 4 }}>
                <small style={{ color: "var(--text-muted)", fontWeight: 700, display: "block" }}>EXERCISE-LEVEL SUMMARIES:</small>
                {Object.values(
                  workoutSummaryData.setsList.reduce((acc, st) => {
                    if (!acc[st.exercise_id]) acc[st.exercise_id] = { name: st.exercise_name, sets: [] };
                    acc[st.exercise_id].sets.push(st);
                    return acc;
                  }, {})
                ).map((exGroup, idx) => {
                  const exVol = exGroup.sets.reduce((acc, st) => acc + calculateSetVolume(st), 0);
                  const exReps = exGroup.sets.reduce((acc, st) => acc + (parseInt(st.reps, 10) || 0), 0);
                  return (
                    <div key={idx} className="glassPanel" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                      <div>
                        <strong>{exGroup.name}</strong>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {exGroup.sets.length} sets · {exReps} reps
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: "var(--accent-gold)" }}>
                        {exVol.toLocaleString("en-IN")} kg
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="modalFooter" style={{ marginTop: 16 }}>
                <button type="button" className="primaryBtn" style={{ width: "100%" }} onClick={() => setWorkoutSummaryData(null)}>
                  Close Summary & View History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
