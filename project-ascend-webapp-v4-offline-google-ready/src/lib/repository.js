import { fetchUserRecords, upsertUserRecords, deleteUserRecords, supabase } from "./supabase.js";
import {
  idbGetUserRecords,
  idbSaveUserRecords,
  idbGetMeta,
  idbSetMeta,
  idbEnqueueOutbox
} from "./db.js";
import { syncEngine, SYNC_STATES } from "./syncEngine.js";
import { reconcileEntityList, resolveRecordConflict, isDeleted, deduplicateTasks } from "./conflict.js";

// --- DETERMINISTIC UUID GENERATION ---
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function starterQuestUuidForKey(starterKey) {
  let hash = 0;
  for (let i = 0; i < starterKey.length; i++) {
    hash = (hash * 31 + starterKey.charCodeAt(i)) % 1000000007;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex.slice(0, 12)}`;
}

export function starterConceptUuidForKey(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) % 1000000007;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8001-${hex.slice(0, 12)}`;
}

export function starterDueUuidForKey(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000000007;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8002-${hex.slice(0, 12)}`;
}

export function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// --- DEFAULT STARTER DATA ---
export const STARTER_QUESTS_TEMPLATE = [
  { starter_key: "starter-leetcode", title: "LeetCode + GeeksforGeeks", category: "Coding", target: "1 problem", xp: 10, locked: true },
  { starter_key: "starter-check-mail", title: "Check Mail", category: "Career/Admin", target: "1 check", xp: 5, locked: true },
  { starter_key: "starter-it-learning", title: "IT Learning", category: "Learning", target: "1 lesson", xp: 10, locked: false },
  { starter_key: "starter-job-apply", title: "Apply for Jobs — Naukri + Indeed", category: "Career", target: "1+ application", xp: 15, locked: true },
  { starter_key: "starter-read-10-pages", title: "Read 10 Pages", category: "Reading", target: "10 pages", xp: 10, locked: true },
  { starter_key: "starter-linkedin", title: "Post on LinkedIn", category: "Career/Brand", target: "1 post", xp: 8, locked: false },
  { starter_key: "starter-brainrot-videos", title: "Create + Post Brainrot Videos", category: "Content", target: "1 video", xp: 10, locked: false },
  { starter_key: "starter-core-concepts", title: "Core Concept Learning", category: "Learning", target: "1 concept", xp: 10, locked: true },
  { starter_key: "starter-python", title: "Python Brush-Up", category: "Coding", target: "30 min", xp: 10, locked: true },
  { starter_key: "starter-drink-water", title: "Drink 5L Water", category: "Health", target: "5 L", xp: 5, locked: true },
  { starter_key: "starter-explain-topic", title: "Record Yourself Explaining a Topic", category: "Communication", target: "1 video", xp: 10, locked: false },
  { starter_key: "starter-run-5km", title: "Run 5 KM or 50K Steps", category: "Fitness", target: "5 KM / 50K steps", xp: 7, locked: false },
  { starter_key: "starter-hit-gym", title: "Hit the Gym", category: "Fitness", target: "1 session", xp: 10, locked: false }
];

export const STARTER_QUESTS = STARTER_QUESTS_TEMPLATE.map((q, idx) => ({
  ...q,
  id: starterQuestUuidForKey(q.starter_key),
  sort_order: idx
}));

export const STARTER_CONCEPTS_TEMPLATE = [
  { title: "Python", subtitle: "Daily learning target" },
  { title: "SQL", subtitle: "Daily learning target" },
  { title: "AI / ML / DL", subtitle: "Daily learning target" },
  { title: "Excel", subtitle: "Daily learning target" },
  { title: "Web Development", subtitle: "Daily learning target" }
];

export const STARTER_CONCEPTS = STARTER_CONCEPTS_TEMPLATE.map((c, idx) => ({
  id: starterConceptUuidForKey(c.title),
  title: c.title,
  subtitle: c.subtitle,
  sort_order: idx
}));

export const STARTER_DUES = [
  {
    id: starterDueUuidForKey("starter-due-1"),
    person_name: "Rahul Sharma",
    type: "lent",
    original_amount: 5000,
    amount_paid: 2000,
    date: todayStr(),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    reason: "Weekend trip expense split",
    status: "Partially Paid"
  },
  {
    id: starterDueUuidForKey("starter-due-2"),
    person_name: "Ankit Verma",
    type: "owed",
    original_amount: 1200,
    amount_paid: 0,
    date: todayStr(),
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    reason: "Dinner bill split",
    status: "Pending"
  }
];

export const STARTER_CHALLENGES = [
  { id: "ch-1", title: "30-Day Coding Challenge", category: "Coding", targetDays: 30, completedDays: 12, rewardXp: 500, active: true },
  { id: "ch-2", title: "Read 10 Pages Daily for 30 Days", category: "Reading", targetDays: 30, completedDays: 8, rewardXp: 300, active: true },
  { id: "ch-3", title: "Apply to 30 Tech Jobs", category: "Career", targetDays: 30, completedDays: 15, rewardXp: 400, active: true }
];

// --- REPOSITORY SINGLETON STATE & SUBSCRIBERS ---
class AscendRepository {
  constructor() {
    this.listeners = new Set();
    this.state = {
      tasks: [],
      completions: {},
      books: [],
      wishlist: [],
      concepts: [],
      side_quests: [],
      ai_chat_history: [],
      challenges: STARTER_CHALLENGES,
      daily_focus: {},
      dues: [],
      fitness: { weights: [], nutrition: [], workouts: [] }
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  setState(updater) {
    const nextState = typeof updater === "function" ? updater(this.state) : updater;
    this.state = { ...this.state, ...nextState };
    this.notify();
  }

  resetSession() {
    this.state = {
      tasks: [],
      completions: {},
      books: [],
      wishlist: [],
      concepts: [],
      side_quests: [],
      ai_chat_history: [],
      challenges: STARTER_CHALLENGES,
      daily_focus: {},
      dues: [],
      fitness: { weights: [], nutrition: [], workouts: [] }
    };
    this.notify();
  }

  // --- SESSION INITIALIZATION & INDEXEDDB CACHE HYDRATION ---
  async initSession(user) {
    const userId = user?.id || "guest";
    syncEngine.log("AUTH", `Initializing session for user ${userId}`);

    // Always reset in-memory state first to avoid showing previous user's data
    this.resetSession();

    // 1. Read Cached State from IndexedDB for this specific user ID
    const [
      tasks, completionsArr, books, wishlist, concepts,
      sideQuestsArr, chatHistoryArr, challengesArr, dailyFocusArr,
      duesArr, fitnessArr
    ] = await Promise.all([
      idbGetUserRecords("tasks", userId),
      idbGetUserRecords("completions", userId),
      idbGetUserRecords("books", userId),
      idbGetUserRecords("wishlist", userId),
      idbGetUserRecords("concepts", userId),
      idbGetUserRecords("side_quests", userId),
      idbGetUserRecords("ai_chat_history", userId),
      idbGetUserRecords("challenges", userId),
      idbGetUserRecords("daily_focus", userId),
      idbGetUserRecords("dues", userId),
      idbGetUserRecords("fitness", userId)
    ]);

    const completionsMap = {};
    (completionsArr || []).forEach(c => {
      completionsMap[c.key || `${c.task_id}:${c.completed_on}`] = true;
    });

    const dailyFocusMap = {};
    (dailyFocusArr || []).forEach(f => {
      if (f.date) dailyFocusMap[f.date] = f.goal;
    });

    const { deduplicatedTasks: cleanTasks } = deduplicateTasks(tasks && tasks.length > 0 ? tasks : []);
    let finalTasks = cleanTasks;
    let finalConcepts = concepts || [];
    let finalDues = duesArr || [];
    let finalFitness = (fitnessArr && fitnessArr.length > 0) ? fitnessArr[0] : { weights: [], nutrition: [], workouts: [] };
    if (!finalFitness.weights) finalFitness.weights = [];
    if (!finalFitness.nutrition) finalFitness.nutrition = [];
    if (!finalFitness.workouts) finalFitness.workouts = [];

    // For guest users without cache, populate default starter tasks locally
    if (userId === "guest" && finalTasks.length === 0) {
      finalTasks = STARTER_QUESTS.map(q => ({ ...q, user_id: "guest", active: true }));
      finalConcepts = STARTER_CONCEPTS.map(c => ({ ...c, user_id: "guest" }));
      finalDues = STARTER_DUES.map(d => ({ ...d, user_id: "guest" }));
    }

    this.setState({
      tasks: finalTasks,
      completions: completionsMap,
      books: books || [],
      wishlist: wishlist || [],
      concepts: finalConcepts,
      side_quests: sideQuestsArr || [],
      ai_chat_history: chatHistoryArr || [],
      challenges: (challengesArr && challengesArr.length > 0) ? challengesArr : STARTER_CHALLENGES.map(c => ({ ...c, user_id: userId })),
      daily_focus: dailyFocusMap,
      dues: finalDues,
      fitness: finalFitness
    });

    // 2. Perform Cloud-First Check Before Default Task Seeding for Authenticated Users
    if (userId !== "guest") {
      try {
        const cloudTasks = await fetchUserRecords("tasks", userId);
        const seededFlag = await idbGetMeta(`seeded_${userId}`);

        const hasExistingTasks = (cloudTasks && cloudTasks.length > 0) || (finalTasks && finalTasks.length > 0);

        if (!seededFlag && !hasExistingTasks) {
          syncEngine.log("AUTH", `Seeding starter data once for new authenticated user ${userId}...`);
          const starterTaskUpserts = STARTER_QUESTS.map(q => ({
            id: q.id,
            starter_key: q.starter_key,
            user_id: userId,
            title: q.title,
            category: q.category,
            target: q.target,
            xp: q.xp,
            locked: q.locked,
            active: true,
            sort_order: q.sort_order,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const starterConceptUpserts = STARTER_CONCEPTS.map(c => ({
            id: c.id,
            user_id: userId,
            title: c.title,
            subtitle: c.subtitle,
            sort_order: c.sort_order,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          const starterDueUpserts = STARTER_DUES.map(d => ({
            id: d.id,
            user_id: userId,
            person_name: d.person_name,
            type: d.type,
            original_amount: d.original_amount,
            amount_paid: d.amount_paid,
            date: d.date,
            due_date: d.due_date,
            reason: d.reason,
            status: d.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          await Promise.all([
            upsertUserRecords("tasks", starterTaskUpserts),
            upsertUserRecords("core_concepts", starterConceptUpserts),
            upsertUserRecords("dues", starterDueUpserts)
          ]);

          await idbSetMeta(`seeded_${userId}`, true);
        }
      } catch (e) {
        syncEngine.log("ERROR", "Account seeding error:", e);
      }

      // 3. Trigger Reconciliation via Sync Engine
      await this.reconcileCloud(user);
    }
  }

  // --- RECONCILE CLOUD DATA (Delegated to Sync Engine) ---
  async reconcileCloud(user) {
    if (!user || !user.id) return;
    await syncEngine.reconcile(user, async (cloudData) => {
      const {
        cloudTasks, cloudCompletions, cloudBooks, cloudWishlist,
        cloudSideQuests, cloudConcepts, cloudDues, cloudFitness, cloudFocus
      } = cloudData;

      const userId = user.id;

      // 1. Reconcile Tasks with Deterministic LWW & Tombstone Resurrection Prevention
      const reconciledTasks = reconcileEntityList(this.state.tasks || [], cloudTasks || [], "id");

      // 2. Reconcile Task Completions
      const compMap = { ...(this.state.completions || {}) };
      (cloudCompletions || []).forEach(cc => {
        const key = `${cc.task_id}:${cc.completed_on}`;
        if (cc.deleted_at == null) {
          compMap[key] = true;
        } else {
          delete compMap[key];
        }
      });

      // 3. Reconcile Books
      const reconciledBooks = reconcileEntityList(this.state.books || [], cloudBooks || [], "id");

      // 4. Reconcile Wishlist
      const reconciledWishlist = reconcileEntityList(this.state.wishlist || [], cloudWishlist || [], "id");

      // 5. Reconcile Side Quests
      const reconciledSideQuests = reconcileEntityList(this.state.side_quests || [], cloudSideQuests || [], "id");

      // 6. Reconcile Core Concepts
      const reconciledConcepts = reconcileEntityList(this.state.concepts || [], cloudConcepts || [], "id");

      // 7. Reconcile Dues
      const reconciledDues = reconcileEntityList(this.state.dues || [], cloudDues || [], "id");

      // 8. Reconcile Fitness Logs
      const weights = [];
      const nutrition = [];
      const workouts = [];
      (cloudFitness || []).forEach(f => {
        if (f.deleted_at == null && f.data) {
          if (f.log_type === "weight") weights.push({ id: f.id, ...f.data });
          else if (f.log_type === "nutrition") nutrition.push({ id: f.id, ...f.data });
          else if (f.log_type === "workout") workouts.push({ id: f.id, ...f.data });
        }
      });

      const reconciledFitness = {
        weights: weights.length > 0 ? weights : this.state.fitness.weights,
        nutrition: nutrition.length > 0 ? nutrition : this.state.fitness.nutrition,
        workouts: workouts.length > 0 ? workouts : this.state.fitness.workouts
      };

      // 9. Reconcile Daily Focus
      const focusMap = { ...(this.state.daily_focus || {}) };
      (cloudFocus || []).forEach(df => {
        if (df.focus_date && df.goal && df.deleted_at == null) {
          focusMap[df.focus_date] = df.goal;
        }
      });

      // Update State & IndexedDB Cache
      this.setState({
        tasks: reconciledTasks,
        completions: compMap,
        books: reconciledBooks,
        wishlist: reconciledWishlist,
        side_quests: reconciledSideQuests,
        concepts: reconciledConcepts,
        dues: reconciledDues,
        fitness: reconciledFitness,
        daily_focus: focusMap
      });

      await Promise.all([
        idbSaveUserRecords("tasks", reconciledTasks, userId),
        idbSaveUserRecords(
          "completions",
          Object.keys(compMap).filter(k => compMap[k]).map(k => {
            const [task_id, completed_on] = k.split(":");
            return { id: `${userId}:${k}`, key: k, task_id, completed_on, user_id: userId };
          }),
          userId
        ),
        idbSaveUserRecords("books", reconciledBooks, userId),
        idbSaveUserRecords("wishlist", reconciledWishlist, userId),
        idbSaveUserRecords("side_quests", reconciledSideQuests, userId),
        idbSaveUserRecords("concepts", reconciledConcepts, userId),
        idbSaveUserRecords("dues", reconciledDues, userId),
        idbSaveUserRecords("fitness", [{ id: `fitness_${userId}`, user_id: userId, ...reconciledFitness }], userId)
      ]);
    });
  }

  // --- ENTITY CRUD ACTIONS WITH STRUCTURED OUTBOX OUTSTANDING MUTATION QUEUEING ---

  async enqueueOutbox(userId, entity, recordId, operationType, payload, onConflict = "id") {
    const mutation = {
      operationId: generateUUID(),
      entity,
      recordId,
      operationType,
      payload,
      onConflict,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      lastError: null
    };
    await idbEnqueueOutbox(userId, mutation);
  }

  async saveTask(taskData, user) {
    const isNew = taskData.isNew;
    const now = new Date().toISOString();
    let taskRecord;

    if (isNew) {
      taskRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        title: taskData.title,
        category: taskData.category || "Main Quest",
        target: taskData.target || "",
        xp: parseInt(taskData.xp, 10) || 10,
        locked: !!taskData.locked,
        active: true,
        sort_order: this.state.tasks.length,
        created_at: now,
        updated_at: now
      };
      this.setState(s => ({ ...s, tasks: [...s.tasks, taskRecord] }));
    } else {
      this.setState(s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === taskData.id ? { ...t, ...taskData, updated_at: now } : t)
      }));
      taskRecord = this.state.tasks.find(t => t.id === taskData.id);
    }

    if (user?.id) {
      const upsertRow = {
        id: taskRecord.id,
        user_id: user.id,
        starter_key: taskRecord.starter_key || null,
        title: taskRecord.title,
        category: taskRecord.category,
        target: taskRecord.target,
        xp: taskRecord.xp,
        locked: taskRecord.locked,
        active: taskRecord.active,
        sort_order: taskRecord.sort_order,
        updated_at: now
      };
      try {
        await upsertUserRecords("tasks", [upsertRow]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "tasks", taskRecord.id, "upsert", [upsertRow]);
      }
    }
  }

  async deleteTask(taskId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({
      ...s,
      tasks: s.tasks.map(t => t.id === taskId ? { ...t, active: false, deleted_at: now, updated_at: now } : t)
    }));

    if (user?.id) {
      const row = { id: taskId, user_id: user.id, active: false, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("tasks", [row]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "tasks", taskId, "upsert", [row]);
      }
    }
  }

  async toggleCompletion(task, user) {
    const key = `${task.id}:${todayStr()}`;
    const willBeCompleted = !this.state.completions[key];
    const completed_on = todayStr();

    this.setState(s => {
      const completions = { ...s.completions };
      if (willBeCompleted) completions[key] = true;
      else delete completions[key];
      return { ...s, completions };
    });

    if (user?.id) {
      if (willBeCompleted) {
        const row = { user_id: user.id, task_id: task.id, completed_on, created_at: new Date().toISOString() };
        try {
          await upsertUserRecords("task_completions", [row], "user_id,task_id,completed_on");
        } catch (err) {
          await this.enqueueOutbox(user.id, "task_completions", `${task.id}:${completed_on}`, "upsert", [row], "user_id,task_id,completed_on");
        }
      } else {
        const match = { user_id: user.id, task_id: task.id, completed_on };
        try {
          await deleteUserRecords("task_completions", match);
        } catch (err) {
          await this.enqueueOutbox(user.id, "task_completions", `${task.id}:${completed_on}`, "delete", match);
        }
      }
    }
  }

  async saveSideQuest(sqData, user) {
    const isNew = sqData.isNew;
    const now = new Date().toISOString();
    let sqRecord;

    if (isNew) {
      sqRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        title: sqData.title,
        description: sqData.description || "",
        date: sqData.date || todayStr(),
        priority: sqData.priority || "Medium",
        due_time: sqData.due_time || "",
        category: sqData.category || "General",
        completed: false,
        created_at: now,
        updated_at: now,
        completed_at: null
      };
      this.setState(s => ({ ...s, side_quests: [...(s.side_quests || []), sqRecord] }));
    } else {
      sqRecord = { ...sqData, updated_at: now };
      this.setState(s => ({
        ...s,
        side_quests: (s.side_quests || []).map(sq => sq.id === sqData.id ? { ...sq, ...sqData, updated_at: now } : sq)
      }));
    }

    if (user?.id) {
      try {
        await upsertUserRecords("side_quests", [sqRecord]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "side_quests", sqRecord.id, "upsert", [sqRecord]);
      }
    }
  }

  async toggleSideQuestCompletion(sqId, user) {
    const now = new Date().toISOString();
    let updatedSq;

    this.setState(s => ({
      ...s,
      side_quests: (s.side_quests || []).map(sq => {
        if (sq.id === sqId) {
          const nextDone = !sq.completed;
          updatedSq = {
            ...sq,
            completed: nextDone,
            completed_at: nextDone ? now : null,
            updated_at: now
          };
          return updatedSq;
        }
        return sq;
      })
    }));

    if (user?.id && updatedSq) {
      try {
        await upsertUserRecords("side_quests", [updatedSq]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "side_quests", sqId, "upsert", [updatedSq]);
      }
    }
  }

  async deleteSideQuest(sqId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({
      ...s,
      side_quests: (s.side_quests || []).filter(sq => sq.id !== sqId)
    }));

    if (user?.id) {
      const tombstone = { id: sqId, user_id: user.id, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("side_quests", [tombstone]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "side_quests", sqId, "upsert", [tombstone]);
      }
    }
  }

  async saveBook(bookData, user) {
    const isNew = bookData.isNew;
    const now = new Date().toISOString();
    let bookRecord;

    if (isNew) {
      bookRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        title: bookData.title,
        author: bookData.author || "",
        start_date: bookData.start_date || todayStr(),
        completed_date: null,
        current_page: parseInt(bookData.current_page, 10) || 0,
        total_pages: parseInt(bookData.total_pages, 10) || 0,
        status: bookData.status || "Reading",
        notes: bookData.notes || "",
        created_at: now,
        updated_at: now
      };
      this.setState(s => ({ ...s, books: [...s.books, bookRecord] }));
    } else {
      bookRecord = { ...bookData, updated_at: now };
      this.setState(s => ({
        ...s,
        books: s.books.map(b => b.id === bookData.id ? { ...b, ...bookData, updated_at: now } : b)
      }));
    }

    if (user?.id) {
      try {
        await upsertUserRecords("books", [bookRecord]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "books", bookRecord.id, "upsert", [bookRecord]);
      }
    }
  }

  async deleteBook(bookId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({ ...s, books: s.books.filter(b => b.id !== bookId) }));
    if (user?.id) {
      const tombstone = { id: bookId, user_id: user.id, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("books", [tombstone]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "books", bookId, "upsert", [tombstone]);
      }
    }
  }

  async saveWishlist(itemData, user) {
    const isNew = itemData.isNew;
    const now = new Date().toISOString();
    let wishRecord;

    if (isNew) {
      wishRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        item: itemData.item,
        category: itemData.category || "General",
        estimated_cost: parseFloat(itemData.estimated_cost) || 0,
        priority: itemData.priority || "Medium",
        purchased: false,
        notes: itemData.notes || "",
        created_at: now,
        updated_at: now
      };
      this.setState(s => ({ ...s, wishlist: [...s.wishlist, wishRecord] }));
    } else {
      wishRecord = { ...itemData, updated_at: now };
      this.setState(s => ({
        ...s,
        wishlist: s.wishlist.map(w => w.id === itemData.id ? { ...w, ...itemData, updated_at: now } : w)
      }));
    }

    if (user?.id) {
      try {
        await upsertUserRecords("wishlist", [wishRecord]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "wishlist", wishRecord.id, "upsert", [wishRecord]);
      }
    }
  }

  async deleteWishlist(itemId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({ ...s, wishlist: s.wishlist.filter(w => w.id !== itemId) }));
    if (user?.id) {
      const tombstone = { id: itemId, user_id: user.id, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("wishlist", [tombstone]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "wishlist", itemId, "upsert", [tombstone]);
      }
    }
  }

  async saveConcept(conceptData, user) {
    const isNew = conceptData.isNew;
    const now = new Date().toISOString();
    let conceptRecord;

    if (isNew) {
      conceptRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        title: conceptData.title,
        subtitle: conceptData.subtitle || "Daily learning target",
        sort_order: this.state.concepts.length,
        created_at: now,
        updated_at: now
      };
      this.setState(s => ({ ...s, concepts: [...s.concepts, conceptRecord] }));
    } else {
      conceptRecord = { ...conceptData, updated_at: now };
      this.setState(s => ({
        ...s,
        concepts: s.concepts.map(c => c.id === conceptData.id ? { ...c, ...conceptData, updated_at: now } : c)
      }));
    }

    if (user?.id) {
      try {
        await upsertUserRecords("core_concepts", [conceptRecord]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "core_concepts", conceptRecord.id, "upsert", [conceptRecord]);
      }
    }
  }

  async deleteConcept(conceptId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({ ...s, concepts: s.concepts.filter(c => c.id !== conceptId) }));
    if (user?.id) {
      const tombstone = { id: conceptId, user_id: user.id, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("core_concepts", [tombstone]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "core_concepts", conceptId, "upsert", [tombstone]);
      }
    }
  }

  async saveDue(dueData, user) {
    const isNew = dueData.isNew;
    const now = new Date().toISOString();
    const orig = parseFloat(dueData.original_amount) || 0;
    const paid = parseFloat(dueData.amount_paid) || 0;
    const status = paid >= orig ? "Paid" : paid > 0 ? "Partially Paid" : "Pending";
    let dueRecord;

    if (isNew) {
      dueRecord = {
        id: generateUUID(),
        user_id: user?.id || "guest",
        person_name: dueData.person_name,
        type: dueData.type || "lent",
        original_amount: orig,
        amount_paid: paid,
        date: dueData.date || todayStr(),
        due_date: dueData.due_date || null,
        reason: dueData.reason || "",
        status,
        created_at: now,
        updated_at: now
      };
      this.setState(s => ({ ...s, dues: [...(s.dues || []), dueRecord] }));
    } else {
      dueRecord = { ...dueData, original_amount: orig, amount_paid: paid, status, updated_at: now };
      this.setState(s => ({
        ...s,
        dues: (s.dues || []).map(d => d.id === dueData.id ? { ...d, ...dueRecord } : d)
      }));
    }

    if (user?.id) {
      try {
        await upsertUserRecords("dues", [dueRecord]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "dues", dueRecord.id, "upsert", [dueRecord]);
      }
    }
  }

  async deleteDue(dueId, user) {
    const now = new Date().toISOString();
    this.setState(s => ({ ...s, dues: (s.dues || []).filter(d => d.id !== dueId) }));
    if (user?.id) {
      const tombstone = { id: dueId, user_id: user.id, deleted_at: now, updated_at: now };
      try {
        await upsertUserRecords("dues", [tombstone]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "dues", dueId, "upsert", [tombstone]);
      }
    }
  }

  async saveDailyFocus(dateStr, goal, user) {
    const now = new Date().toISOString();
    const updatedFocus = { ...(this.state.daily_focus || {}), [dateStr]: goal };
    this.setState({ daily_focus: updatedFocus });

    if (user?.id) {
      const record = { user_id: user.id, date: dateStr, goal, updated_at: now };
      try {
        await upsertUserRecords("daily_focus", [record], "user_id,date");
      } catch (err) {
        await this.enqueueOutbox(user.id, "daily_focus", `${dateStr}`, "upsert", [record], "user_id,date");
      }
    }
  }

  async saveFitness(fitnessData, user) {
    const now = new Date().toISOString();
    const record = { ...fitnessData, updated_at: now };
    this.setState({ fitness: record });

    if (user?.id) {
      const dbRow = { id: `fitness_${user.id}`, user_id: user.id, ...record, updated_at: now };
      try {
        await upsertUserRecords("fitness_logs", [dbRow]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "fitness_logs", `fitness_${user.id}`, "upsert", [dbRow]);
      }
    }
  }

  async saveChallenge(challengeData, user) {
    const now = new Date().toISOString();
    const updatedRecord = { ...challengeData, updated_at: now };
    this.setState(s => ({
      ...s,
      challenges: (s.challenges || []).map(c => c.id === challengeData.id ? updatedRecord : c)
    }));

    if (user?.id) {
      const dbRow = { ...updatedRecord, user_id: user.id };
      try {
        await upsertUserRecords("challenges", [dbRow]);
      } catch (err) {
        await this.enqueueOutbox(user.id, "challenges", challengeData.id, "upsert", [dbRow]);
      }
    }
  }

  async toggleTaskLock(taskId, user) {
    const task = (this.state.tasks || []).find(t => t.id === taskId);
    if (task) {
      await this.saveTask({ ...task, locked: !task.locked }, user);
    }
  }

  async reorderTasks(reorderedTasks, user) {
    const now = new Date().toISOString();
    this.setState({ tasks: reorderedTasks });

    if (user?.id) {
      const updates = reorderedTasks.map((t, idx) => ({
        id: t.id,
        user_id: user.id,
        sort_order: idx,
        updated_at: now
      }));
      try {
        await upsertUserRecords("tasks", updates);
      } catch (err) {
        await this.enqueueOutbox(user.id, "tasks", `reorder_${Date.now()}`, "upsert", updates);
      }
    }
  }


  // --- INBOUND REMOTE REALTIME RECORD RECONCILIATION ---
  async applyRemoteRecordUpdate(entityName, remoteRecord, userId) {
    if (!remoteRecord || !userId) return;

    const stateKeyMap = {
      tasks: "tasks",
      side_quests: "side_quests",
      books: "books",
      wishlist: "wishlist",
      core_concepts: "concepts",
      dues: "dues"
    };

    const stateKey = stateKeyMap[entityName] || entityName;
    const currentList = this.state[stateKey] || [];

    const existingIndex = currentList.findIndex(item => item.id === remoteRecord.id);

    let updatedList;
    if (existingIndex === -1) {
      if (!isDeleted(remoteRecord)) {
        updatedList = [...currentList, remoteRecord];
      } else {
        updatedList = currentList;
      }
    } else {
      const existingRecord = currentList[existingIndex];
      const winner = resolveRecordConflict(existingRecord, remoteRecord);

      if (isDeleted(winner)) {
        updatedList = currentList.filter(item => item.id !== remoteRecord.id);
      } else {
        updatedList = [...currentList];
        updatedList[existingIndex] = winner;
      }
    }

    this.setState({ [stateKey]: updatedList });

    const idbStoreMap = {
      tasks: "tasks",
      side_quests: "side_quests",
      books: "books",
      wishlist: "wishlist",
      concepts: "concepts",
      dues: "dues"
    };

    const storeName = idbStoreMap[stateKey] || stateKey;
    await idbSaveUserRecords(storeName, updatedList, userId);
  }
}

export const repository = new AscendRepository();
