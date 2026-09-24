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
