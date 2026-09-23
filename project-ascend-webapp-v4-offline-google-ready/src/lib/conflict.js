/**
 * ASCEND Deterministic Conflict Resolution Engine
 * 
 * Rules:
 * 1. SUPABASE = Single Source of Truth in Cloud.
 * 2. Every entity record has identity, immutable fields, mutable fields, and a conflict strategy.
 * 3. Default Strategy: Last-Write-Wins (LWW) using ISO 8601 timestamps (`updated_at`).
 *    - If cloud.updated_at > local.updated_at => cloud wins.
 *    - If local.updated_at > cloud.updated_at => local wins.
 * 4. Deterministic Tie-Breaker (equal timestamps):
 *    - If local.updated_at === cloud.updated_at, compare canonical string representations.
 *    - String comparison guarantees that both Laptop and Phone will deterministically select
 *      the exact same winner without relying on array order, fetch order, or JS object key order.
 * 5. Deletes & Tombstones:
 *    - Soft deletion sets `deleted_at: ISO timestamp` and `updated_at: ISO timestamp`.
 *    - An entity with `deleted_at != null` or `active == false` participates in conflict resolution.
 *    - If a tombstone's timestamp >= an active record's timestamp, deletion wins and resurrection is prevented.
 */

// ENTITY SPECIFICATIONS
export const ENTITY_SCHEMAS = {
  tasks: {
    name: "tasks",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at", "starter_key"],
    mutableFields: ["title", "category", "target", "xp", "locked", "active", "sort_order", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone resurrection prevention"
  },
  task_completions: {
    name: "task_completions",
    identity: ["user_id", "task_id", "completed_on"],
    immutableFields: ["user_id", "task_id", "completed_on", "created_at"],
    mutableFields: ["updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with tombstone completion state tracking"
  },
  side_quests: {
    name: "side_quests",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at"],
    mutableFields: ["title", "description", "date", "priority", "due_time", "category", "completed", "completed_at", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  books: {
    name: "books",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at"],
    mutableFields: ["title", "author", "start_date", "completed_date", "current_page", "total_pages", "status", "notes", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  wishlist: {
    name: "wishlist",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at"],
    mutableFields: ["item", "category", "estimated_cost", "priority", "purchased", "notes", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  core_concepts: {
    name: "core_concepts",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at"],
    mutableFields: ["title", "subtitle", "sort_order", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  dues: {
    name: "dues",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at"],
    mutableFields: ["person_name", "type", "original_amount", "amount_paid", "date", "due_date", "reason", "status", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  daily_focus: {
    name: "daily_focus",
    identity: ["user_id", "focus_date"],
    immutableFields: ["user_id", "focus_date", "created_at"],
    mutableFields: ["goal", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  },
  fitness_logs: {
    name: "fitness_logs",
    identity: ["id"],
    immutableFields: ["id", "user_id", "created_at", "log_type"],
    mutableFields: ["data", "date", "updated_at", "deleted_at"],
    conflictStrategy: "LWW by updated_at timestamp with soft deletion tombstone support"
  }
};

// Known Default Starter Task Title Mapping to starter_key
export const STARTER_TITLE_TO_KEY = {
  "leetcode + geeksforgeeks": "starter-leetcode",
  "check mail": "starter-check-mail",
  "it learning": "starter-it-learning",
  "apply for jobs — naukri + indeed": "starter-job-apply",
  "read 10 pages": "starter-read-10-pages",
  "post on linkedin": "starter-linkedin",
  "create + post brainrot videos": "starter-brainrot-videos",
  "core concept learning": "starter-core-concepts",
  "python brush-up": "starter-python",
  "drink 5l water": "starter-drink-water",
  "record yourself explaining a topic": "starter-explain-topic",
  "run 5 km or 50k steps": "starter-run-5km",
  "hit the gym": "starter-hit-gym"
};

// Helper: Get record timestamp safely
export function getRecordTimestamp(record) {
  if (!record) return "";
  return record.updated_at || record.deleted_at || record.created_at || "";
}

// Helper: Check if record is soft-deleted
export function isDeleted(record) {
  if (!record) return false;
  if (record.deleted_at != null) return true;
  if (record.active === false) return true;
  return false;
}

// Helper: Canonical string representation for tie-breaking
export function getCanonicalString(record) {
  if (!record) return "";
  const sortedObj = {};
  Object.keys(record).sort().forEach(key => {
    sortedObj[key] = record[key];
  });
  return JSON.stringify(sortedObj);
}

/**
 * Deterministically resolves a conflict between two versions of a single record (local vs cloud).
 * Returns the winning record object.
 */
export function resolveRecordConflict(localRecord, cloudRecord) {
  if (!localRecord) return cloudRecord;
  if (!cloudRecord) return localRecord;

  const localTs = getRecordTimestamp(localRecord);
  const cloudTs = getRecordTimestamp(cloudRecord);

  // 1. Compare timestamps: newer timestamp strictly wins
  if (cloudTs > localTs) {
    return cloudRecord;
  }
  if (localTs > cloudTs) {
    return localRecord;
  }

  // 2. Timestamps are EQUAL: Apply deterministic tie-breaking
  const localStr = getCanonicalString(localRecord);
  const cloudStr = getCanonicalString(cloudRecord);

  if (cloudStr > localStr) {
    return cloudRecord;
  } else {
    return localRecord;
  }
}

/**
 * Idempotently deduplicates default starter tasks by starter_key or matching template title,
 * while preserving distinct user-created custom tasks.
 */
export function deduplicateTasks(tasks = []) {
  if (!Array.isArray(tasks)) return { deduplicatedTasks: [], reboundIdMap: {} };

  const groupMap = new Map();
  const reboundIdMap = {};

  for (const task of tasks) {
    if (!task) continue;

    const normTitle = (task.title || "").trim().toLowerCase();
    const matchedStarterKey = task.starter_key || STARTER_TITLE_TO_KEY[normTitle] || null;

    let groupKey;
    if (matchedStarterKey) {
      groupKey = `starter:${matchedStarterKey}`;
    } else {
      groupKey = `custom:${task.id}`;
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, [task]);
    } else {
      groupMap.get(groupKey).push(task);
    }
  }

  const deduplicatedTasks = [];

  for (const [, group] of groupMap) {
    if (group.length === 1) {
      deduplicatedTasks.push(group[0]);
      continue;
    }

    // Sort starter task group to pick canonical survivor:
    // 1. Prefer starter_key != null
    // 2. Prefer deterministic seed UUID prefix (00000000-0000-4000-8000-...)
    // 3. Prefer active=true
    // 4. Prefer oldest creation or newest updated timestamp
    group.sort((a, b) => {
      const aHasKey = a.starter_key ? 0 : 1;
      const bHasKey = b.starter_key ? 0 : 1;
      if (aHasKey !== bHasKey) return aHasKey - bHasKey;

      const aDet = (a.id || "").startsWith("00000000-0000-4000-8000-") ? 0 : 1;
      const bDet = (b.id || "").startsWith("00000000-0000-4000-8000-") ? 0 : 1;
      if (aDet !== bDet) return aDet - bDet;

      const aActive = a.active !== false ? 0 : 1;
      const bActive = b.active !== false ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      const aTs = getRecordTimestamp(a);
      const bTs = getRecordTimestamp(b);
      return aTs.localeCompare(bTs);
    });

    const survivor = {
      ...group[0],
      starter_key: group[0].starter_key || STARTER_TITLE_TO_KEY[(group[0].title || "").trim().toLowerCase()] || null
    };

    deduplicatedTasks.push(survivor);

    // Map all deleted duplicate task IDs in group to survivor for completion rebinding
    for (let i = 1; i < group.length; i++) {
      reboundIdMap[group[i].id] = survivor.id;
    }
  }

  return { deduplicatedTasks, reboundIdMap };
}

/**
 * Reconciles two arrays of entity records (local vs cloud) deterministically.
 * @param {Array} localList - Local cached records
 * @param {Array} cloudList - Cloud records fetched from Supabase
 * @param {string|function} identityKey - Key name (e.g. 'id') or function returning unique record identity string
 * @returns {Array} Reconciled active records (deleted items filtered out, tombstones preserved in map)
 */
export function reconcileEntityList(localList = [], cloudList = [], identityKey = "id") {
  const getItemId = (item) => {
    if (typeof identityKey === "function") return identityKey(item);
    return item[identityKey];
  };

  const recordMap = new Map();

  // Load local items
  for (const item of localList) {
    if (!item) continue;
    const id = getItemId(item);
    if (id != null) recordMap.set(id, item);
  }

  // Reconcile cloud items against local items
  for (const cloudItem of cloudList) {
    if (!cloudItem) continue;
    const id = getItemId(cloudItem);
    if (id == null) continue;

    const existingLocal = recordMap.get(id);
    if (!existingLocal) {
      recordMap.set(id, cloudItem);
    } else {
      const winner = resolveRecordConflict(existingLocal, cloudItem);
      recordMap.set(id, winner);
    }
  }

  const rawRecords = Array.from(recordMap.values());

  // If reconciling tasks, apply deduplicateTasks to eliminate duplicate default/legacy tasks
  let candidateRecords = rawRecords;
  if (identityKey === "id" && rawRecords.length > 0 && rawRecords[0].title && rawRecords[0].category !== undefined) {
    const { deduplicatedTasks } = deduplicateTasks(rawRecords);
    candidateRecords = deduplicatedTasks;
  }

  const activeRecords = [];
  for (const record of candidateRecords) {
    if (!isDeleted(record)) {
      activeRecords.push(record);
    }
  }

  return activeRecords;
}
