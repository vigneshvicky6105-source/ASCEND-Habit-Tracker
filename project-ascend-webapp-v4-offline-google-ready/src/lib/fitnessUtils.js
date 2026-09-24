export function calculateSetVolume(set) {
  if (!set || set.completed === false) return 0;
  const weight = parseFloat(set.weight) || 0;
  const reps = parseInt(set.reps, 10) || 0;
  return weight * reps;
}

export function calculateSessionVolume(sets) {
  if (!Array.isArray(sets)) return 0;
  return sets.reduce((acc, s) => acc + calculateSetVolume(s), 0);
}

export function getExercisePRs(allSets, exerciseId) {
  if (!Array.isArray(allSets) || !exerciseId) {
    return { maxWeight: 0, maxReps: 0, maxSetVolume: 0 };
  }

  const matchingSets = allSets.filter(s => s.exercise_id === exerciseId && s.completed !== false);

  let maxWeight = 0;
  let maxReps = 0;
  let maxSetVolume = 0;

  matchingSets.forEach(s => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps, 10) || 0;
    const vol = w * r;

    if (w > maxWeight) maxWeight = w;
    if (r > maxReps) maxReps = r;
    if (vol > maxSetVolume) maxSetVolume = vol;
  });

  return { maxWeight, maxReps, maxSetVolume };
}

export function getPreviousExercisePerformance(allSets, allSessions, exerciseId, currentSessionId = null) {
  if (!Array.isArray(allSets) || !exerciseId) return [];

  // Find all sets for this exercise excluding current session if provided
  const relevantSets = allSets.filter(s => 
    s.exercise_id === exerciseId && 
    s.completed !== false &&
    (!currentSessionId || s.session_id !== currentSessionId)
  );

  if (relevantSets.length === 0) return [];

  // Group by session ID and find the session with the latest updated_at or date
  const sessionsMap = {};
  if (Array.isArray(allSessions)) {
    allSessions.forEach(s => { sessionsMap[s.id] = s; });
  }

  // Sort relevant sets by session timestamp descending
  relevantSets.sort((a, b) => {
    const timeA = sessionsMap[a.session_id]?.date || a.updated_at || a.created_at || "";
    const timeB = sessionsMap[b.session_id]?.date || b.updated_at || b.created_at || "";
    return timeB.localeCompare(timeA);
  });

  const latestSessionId = relevantSets[0].session_id;
  const previousSessionSets = relevantSets
    .filter(s => s.session_id === latestSessionId)
    .sort((a, b) => (a.set_number || 0) - (b.set_number || 0));

  return previousSessionSets;
}

export function calculateProgressionStatus(sessions, currentSession) {
  if (!Array.isArray(sessions) || !currentSession) {
    return { status: "FIRST_SESSION", volumeDiff: 0, volumePct: 0 };
  }

  // Find previous session for the same split/title
  const pastSessions = sessions.filter(s => 
    s.id !== currentSession.id &&
    (s.split_title === currentSession.split_title || s.day_name === currentSession.day_name)
  ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (pastSessions.length === 0) {
    return { status: "FIRST_SESSION", volumeDiff: 0, volumePct: 0 };
  }

  const prevSession = pastSessions[0];
  const prevVol = prevSession.total_volume || 0;
  const currVol = currentSession.total_volume || 0;
  const diff = currVol - prevVol;
  const pct = prevVol > 0 ? parseFloat(((diff / prevVol) * 100).toFixed(1)) : 0;

  let status = "MAINTAINED";
  if (diff > 0) status = "PROGRESS";
  else if (diff < 0) status = "REGRESSED";

  return { status, volumeDiff: diff, volumePct: pct, prevVolume: prevVol };
}

export function detectNewPRs(allSets, currentSessionSets, currentSessionId) {
  if (!Array.isArray(currentSessionSets) || currentSessionSets.length === 0) return [];

  const previousSets = (allSets || []).filter(s => s.session_id !== currentSessionId);
  const newPRs = [];

  // Group current sets by exercise
  const exerciseMap = {};
  currentSessionSets.forEach(s => {
    if (s.completed === false) return;
    if (!exerciseMap[s.exercise_id]) {
      exerciseMap[s.exercise_id] = { name: s.exercise_name, sets: [] };
    }
    exerciseMap[s.exercise_id].sets.push(s);
  });

  Object.keys(exerciseMap).forEach(exId => {
    const exData = exerciseMap[exId];
    const prevPRs = getExercisePRs(previousSets, exId);
    
    exData.sets.forEach(s => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      const vol = w * r;

      if (prevPRs.maxWeight > 0 && w > prevPRs.maxWeight) {
        newPRs.push({
          exercise_id: exId,
          exercise_name: exData.name,
          type: "MAX_WEIGHT",
          value: `${w} kg`,
          prevValue: `${prevPRs.maxWeight} kg`
        });
      }
      if (prevPRs.maxSetVolume > 0 && vol > prevPRs.maxSetVolume) {
        newPRs.push({
          exercise_id: exId,
          exercise_name: exData.name,
          type: "MAX_SET_VOLUME",
          value: `${vol} kg`,
          prevValue: `${prevPRs.maxSetVolume} kg`
        });
      }
    });
  });

  return newPRs;
}

export function getAllExercisePRs(allSets, routine = []) {
  if (!Array.isArray(allSets)) return [];

  const sessionsMap = {};

  // Extract all distinct exercise IDs from sets and routine
  const exerciseMeta = {};

  if (Array.isArray(routine)) {
    routine.forEach(day => {
      (day.exercises || []).forEach(ex => {
        exerciseMeta[ex.id] = { id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup };
      });
    });
  }

  const exerciseSetsMap = {};
  allSets.forEach(s => {
    if (s.completed === false || !s.exercise_id) return;
    if (!exerciseMeta[s.exercise_id]) {
      exerciseMeta[s.exercise_id] = { id: s.exercise_id, name: s.exercise_name || "Exercise", muscleGroup: "Other" };
    }
    if (!exerciseSetsMap[s.exercise_id]) exerciseSetsMap[s.exercise_id] = [];
    exerciseSetsMap[s.exercise_id].push(s);
  });

  const prList = [];

  Object.keys(exerciseMeta).forEach(exId => {
    const meta = exerciseMeta[exId];
    const sets = exerciseSetsMap[exId] || [];

    if (sets.length === 0) {
      prList.push({
        id: exId,
        name: meta.name,
        muscleGroup: meta.muscleGroup,
        maxWeight: 0,
        bestReps: 0,
        highestSetVolume: 0,
        highestSessionVolume: 0,
        prDate: null,
        totalSetsLogged: 0
      });
      return;
    }

    let maxWeight = 0;
    let bestReps = 0;
    let highestSetVolume = 0;
    let prDate = null;

    // Group sets by session to compute max session exercise volume
    const sessionVolumeMap = {};

    sets.forEach(s => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      const vol = w * r;
      const setDate = s.date || s.created_at?.slice(0, 10) || null;

      if (w > maxWeight) {
        maxWeight = w;
        bestReps = r;
        if (setDate) prDate = setDate;
      } else if (w === maxWeight && r > bestReps) {
        bestReps = r;
        if (setDate) prDate = setDate;
      }

      if (vol > highestSetVolume) {
        highestSetVolume = vol;
      }

      if (s.session_id) {
        sessionVolumeMap[s.session_id] = (sessionVolumeMap[s.session_id] || 0) + vol;
      }
    });

    const highestSessionVolume = Object.values(sessionVolumeMap).length > 0
      ? Math.max(...Object.values(sessionVolumeMap))
      : 0;

    prList.push({
      id: exId,
      name: meta.name,
      muscleGroup: meta.muscleGroup,
      maxWeight,
      bestReps,
      highestSetVolume,
      highestSessionVolume,
      prDate: prDate || "Recorded",
      totalSetsLogged: sets.length
    });
  });

  return prList;
}

export function getExerciseHistory(allSets, allSessions, exerciseId) {
  if (!Array.isArray(allSets) || !exerciseId) return [];

  const relevantSets = allSets.filter(s => s.exercise_id === exerciseId && s.completed !== false);
  if (relevantSets.length === 0) return [];

  const sessionsMap = {};
  if (Array.isArray(allSessions)) {
    allSessions.forEach(s => { sessionsMap[s.id] = s; });
  }

  const groupedBySession = {};

  relevantSets.forEach(s => {
    const sId = s.session_id || "standalone";
    if (!groupedBySession[sId]) {
      const sessionObj = sessionsMap[sId] || {};
      groupedBySession[sId] = {
        sessionId: sId,
        date: sessionObj.date || sessionObj.workout_date || s.date || s.created_at?.slice(0, 10) || "Unknown Date",
        splitTitle: sessionObj.split_title || sessionObj.day_name || "Workout Session",
        sets: []
      };
    }
    groupedBySession[sId].sets.push(s);
  });

  const historyList = Object.values(groupedBySession).map(group => {
    group.sets.sort((a, b) => (a.set_number || 0) - (b.set_number || 0));
    const totalVolume = group.sets.reduce((acc, st) => acc + calculateSetVolume(st), 0);
    const totalReps = group.sets.reduce((acc, st) => acc + (parseInt(st.reps, 10) || 0), 0);
    const maxWeight = Math.max(...group.sets.map(st => parseFloat(st.weight) || 0));
    return {
      ...group,
      totalVolume,
      totalReps,
      maxWeight
    };
  });

  historyList.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return historyList;
}

export function getExerciseProgressionTimeline(allSets, allSessions, exerciseId) {
  const history = getExerciseHistory(allSets, allSessions, exerciseId);
  return history.reverse().map(item => ({
    date: item.date,
    maxWeight: item.maxWeight,
    totalVolume: item.totalVolume,
    totalReps: item.totalReps,
    setsCount: item.sets.length
  }));
}

