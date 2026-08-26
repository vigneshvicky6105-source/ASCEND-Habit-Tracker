import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Check, Flame, Plus, Settings, BookOpen, LogIn, LogOut, WifiOff, Cloud,
  Pencil, Trash2, ArrowUp, ArrowDown, Lock, Unlock, Calendar, Trophy,
  BarChart2, Sparkles, X, ChevronRight, RefreshCw, ShoppingCart, Target,
  Layers, CheckCircle2, Circle, Swords, Shield, Clock, CalendarDays, Bell, BellOff
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart,
  Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import "./styles.css";

// --- SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- DEFAULT STARTER DATA ---
const STARTER_QUESTS = [
  { title: "LeetCode + GeeksforGeeks", category: "Coding", target: "1 problem", xp: 10, locked: true },
  { title: "Check Mail", category: "Career/Admin", target: "1 check", xp: 5, locked: true },
  { title: "IT Learning", category: "Learning", target: "1 lesson", xp: 10, locked: false },
  { title: "Apply for Jobs — Naukri + Indeed", category: "Career", target: "1+ application", xp: 15, locked: true },
  { title: "Read 10 Pages", category: "Reading", target: "10 pages", xp: 10, locked: true },
  { title: "Post on LinkedIn", category: "Career/Brand", target: "1 post", xp: 8, locked: false },
  { title: "Create + Post Brainrot Videos", category: "Content", target: "1 video", xp: 10, locked: false },
  { title: "Core Concept Learning", category: "Learning", target: "1 concept", xp: 10, locked: true },
  { title: "Python Brush-Up", category: "Coding", target: "30 min", xp: 10, locked: true },
  { title: "Drink 5L Water", category: "Health", target: "5 L", xp: 5, locked: true },
  { title: "Record Yourself Explaining a Topic", category: "Communication", target: "1 video", xp: 10, locked: false },
  { title: "Run 5 KM", category: "Fitness", target: "5 KM", xp: 7, locked: false }
];

const STARTER_CONCEPTS = [
  { title: "Python", subtitle: "Daily learning target" },
  { title: "SQL", subtitle: "Daily learning target" },
  { title: "AI / ML / DL", subtitle: "Daily learning target" },
  { title: "Excel", subtitle: "Daily learning target" },
  { title: "Web Development", subtitle: "Daily learning target" }
];

const todayStr = () => new Date().toISOString().slice(0, 10);

// --- INDEXEDDB MULTI-USER ISOLATED STORAGE ---
const DB_NAME = "project_ascend_v4_db";
const DB_VERSION = 2;
const STORES = ["tasks", "completions", "books", "wishlist", "concepts", "side_quests"];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach(s => {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: "id" });
          store.createIndex("user_id", "user_id", { unique: false });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetUserRecords(storeName, userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const index = tx.objectStore(storeName).index("user_id");
    const req = index.getAll(userId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbSaveUserRecords(storeName, records, userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const index = store.index("user_id");
    const getAllReq = index.getAllKeys(userId);
    
    getAllReq.onsuccess = () => {
      const existingKeys = getAllReq.result || [];
      existingKeys.forEach(k => store.delete(k));
      records.forEach(r => store.put({ ...r, user_id: userId }));
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// Custom Hook for User-Scoped Offline State
function useUserLocalState(user) {
  const userId = user?.id || "guest";
  const [state, setState] = useState({
    tasks: [],
    completions: {}, // map key -> true ("taskId:YYYY-MM-DD")
    books: [],
    wishlist: [],
    concepts: [],
    side_quests: []
  });
  const [ready, setReady] = useState(false);

  // Load from IndexedDB whenever active user changes
  useEffect(() => {
    let active = true;
    setReady(false);

    async function load() {
      try {
        const [tasks, completionsArr, books, wishlist, concepts, sideQuestsArr] = await Promise.all(
          STORES.map(s => idbGetUserRecords(s, userId))
        );
        if (!active) return;

        const completionsMap = {};
        completionsArr.forEach(c => {
          completionsMap[c.key || `${c.task_id}:${c.completed_on}`] = true;
        });

        // Initialize defaults if user has zero tasks
        let finalTasks = tasks;
        if (!finalTasks || finalTasks.length === 0) {
          finalTasks = STARTER_QUESTS.map((q, idx) => ({
            id: `starter-${idx}`,
            user_id: userId,
            title: q.title,
            category: q.category,
            target: q.target,
            xp: q.xp,
            locked: q.locked,
            active: true,
            sort_order: idx,
            created_at: new Date().toISOString()
          }));
        }

        let finalConcepts = concepts;
        if (!finalConcepts || finalConcepts.length === 0) {
          finalConcepts = STARTER_CONCEPTS.map((c, idx) => ({
            id: `concept-${idx}`,
            user_id: userId,
            title: c.title,
            subtitle: c.subtitle,
            sort_order: idx
          }));
        }

        setState({
          tasks: finalTasks,
          completions: completionsMap,
          books,
          wishlist,
          concepts: finalConcepts,
          side_quests: sideQuestsArr || []
        });
        setReady(true);
      } catch (err) {
        console.error("Error loading local IndexedDB data:", err);
        setReady(true);
      }
    }

    load();
    return () => { active = false; };
  }, [userId]);

  // Persist state to IndexedDB on state changes
  useEffect(() => {
    if (!ready) return;
    const save = async () => {
      try {
        await Promise.all([
          idbSaveUserRecords("tasks", state.tasks, userId),
          idbSaveUserRecords(
            "completions",
            Object.keys(state.completions).filter(k => state.completions[k]).map(k => {
              const [task_id, completed_on] = k.split(":");
              return { id: `${userId}:${k}`, key: k, task_id, completed_on, user_id: userId };
            }),
            userId
          ),
          idbSaveUserRecords("books", state.books, userId),
          idbSaveUserRecords("wishlist", state.wishlist, userId),
          idbSaveUserRecords("concepts", state.concepts, userId),
          idbSaveUserRecords("side_quests", state.side_quests || [], userId)
        ]);
      } catch (e) {
        console.error("Error saving state to IndexedDB:", e);
      }
    };
    save();
  }, [state, ready, userId]);

  return [state, setState, ready, userId];
}

// --- MAIN APPLICATION COMPONENT ---
function App() {
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [tab, setTab] = useState("dashboard");
  const [syncing, setSyncing] = useState(false);

  // Active Modals
  const [questModal, setQuestModal] = useState(null); // null | { isNew: bool, task: obj }
  const [bookModal, setBookModal] = useState(null); // null | { isNew: bool, book: obj }
  const [wishlistModal, setWishlistModal] = useState(null); // null | { isNew: bool, item: obj }
  const [conceptModal, setConceptModal] = useState(null); // null | { isNew: bool, concept: obj }
  const [sideQuestModal, setSideQuestModal] = useState(null); // null | { isNew: bool, quest?: obj, defaultDate?: string }
  const [questSubTab, setQuestSubTab] = useState("main"); // "main" | "side"

  const [local, setLocal, localReady, userId] = useUserLocalState(user);

  // Service worker registration & online listener
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
      const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        data?.subscription?.unsubscribe();
      };
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Supabase Cloud Synchronization Logic
  async function syncWithCloud() {
    if (!supabase || !user || !online || !localReady) return;
    setSyncing(true);
    try {
      const uid = user.id;

      // 1. Fetch Cloud Tasks
      const { data: cloudTasks } = await supabase.from("tasks").select("*").eq("user_id", uid);
      if (cloudTasks && cloudTasks.length > 0) {
        // Merge strategy: map local & cloud tasks by id
        const mergedMap = new Map();
        local.tasks.forEach(t => mergedMap.set(t.id, t));
        cloudTasks.forEach(ct => mergedMap.set(ct.id, ct));
        const mergedTasks = Array.from(mergedMap.values());
        setLocal(s => ({ ...s, tasks: mergedTasks }));
      }
      
      // Upsert current local tasks to Supabase
      if (local.tasks.length > 0) {
        await supabase.from("tasks").upsert(
          local.tasks.map(t => ({
            id: t.id.startsWith("starter-") ? undefined : t.id,
            user_id: uid,
            title: t.title,
            category: t.category,
            target: t.target || "",
            xp: t.xp || 10,
            locked: !!t.locked,
            active: t.active !== false,
            sort_order: t.sort_order || 0
          })),
          { onConflict: "id" }
        );
      }

      // 2. Task Completions Sync
      const completionRows = Object.keys(local.completions)
        .filter(k => local.completions[k])
        .map(k => {
          const [task_id, completed_on] = k.split(":");
          return { user_id: uid, task_id, completed_on };
        });
      if (completionRows.length > 0) {
        await supabase.from("task_completions").upsert(completionRows, {
          onConflict: "user_id,task_id,completed_on"
        });
      }

      // 3. Books Sync
      if (local.books.length > 0) {
        await supabase.from("books").upsert(
          local.books.map(b => ({
            id: b.id.startsWith("book-") ? undefined : b.id,
            user_id: uid,
            title: b.title,
            author: b.author || "",
            start_date: b.start_date || null,
            completed_date: b.completed_date || null,
            current_page: b.current_page || 0,
            total_pages: b.total_pages || 0,
            status: b.status || "Reading",
            notes: b.notes || ""
          }))
        );
      }

      // 4. Wishlist Sync
      if (local.wishlist.length > 0) {
        await supabase.from("wishlist").upsert(
          local.wishlist.map(w => ({
            id: w.id.startsWith("wish-") ? undefined : w.id,
            user_id: uid,
            item: w.item,
            category: w.category || "General",
            estimated_cost: w.estimated_cost || 0,
            priority: w.priority || "Medium",
            purchased: !!w.purchased,
            notes: w.notes || ""
          }))
        );
      }

      // 5. Side Quests Sync
      if (local.side_quests && local.side_quests.length > 0) {
        const { data: cloudSideQuests } = await supabase.from("side_quests").select("*").eq("user_id", uid);
        if (cloudSideQuests && cloudSideQuests.length > 0) {
          const sqMap = new Map();
          local.side_quests.forEach(sq => sqMap.set(sq.id, sq));
          cloudSideQuests.forEach(csq => sqMap.set(csq.id, csq));
          setLocal(s => ({ ...s, side_quests: Array.from(sqMap.values()) }));
        }
        await supabase.from("side_quests").upsert(
          local.side_quests.map(sq => ({
            id: (sq.id && !sq.id.startsWith("sq-")) ? sq.id : undefined,
            user_id: uid,
            title: sq.title,
            description: sq.description || "",
            date: sq.date || todayStr(),
            priority: sq.priority || "Medium",
            due_time: sq.due_time || "",
            category: sq.category || "General",
            completed: !!sq.completed,
            created_at: sq.created_at || new Date().toISOString(),
            completed_at: sq.completed_at || null
          }))
        );
      }
    } catch (err) {
      console.warn("Cloud sync deferred:", err);
    } finally {
      setSyncing(false);
    }
  }

  // Auto sync on state changes when online & logged in
  useEffect(() => {
    if (user && online && localReady) {
      const timer = setTimeout(() => syncWithCloud(), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, online, localReady, local.tasks, local.completions, local.books, local.wishlist, local.side_quests]);

  // Auth Handlers
  async function handleGoogleLogin() {
    if (!supabase) {
      alert("Supabase credentials not configured in environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }

  // --- QUEST ACTIONS ---
  const activeTasks = useMemo(() => {
    return local.tasks
      .filter(t => t.active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [local.tasks]);

  const toggleTaskCompletion = (task) => {
    const key = `${task.id}:${todayStr()}`;
    setLocal(s => {
      const completions = { ...s.completions };
      completions[key] = !completions[key];
      return { ...s, completions };
    });
  };

  const toggleTaskLock = (task) => {
    setLocal(s => ({
      ...s,
      tasks: s.tasks.map(t => (t.id === task.id ? { ...t, locked: !t.locked } : t))
    }));
  };

  const moveTaskOrder = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeTasks.length) return;
    const itemA = activeTasks[index];
    const itemB = activeTasks[targetIdx];

    // Check if either is locked
    if (itemA.locked || itemB.locked) {
      alert("Cannot reorder locked quests. Unlock them first.");
      return;
    }

    const updated = [...local.tasks];
    const idxA = updated.findIndex(t => t.id === itemA.id);
    const idxB = updated.findIndex(t => t.id === itemB.id);

    const tempOrder = updated[idxA].sort_order;
    updated[idxA].sort_order = updated[idxB].sort_order;
    updated[idxB].sort_order = tempOrder;

    setLocal(s => ({ ...s, tasks: updated }));
  };

  const saveQuestModal = (questData) => {
    if (questData.isNew) {
      const newTask = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: questData.title,
        category: questData.category || "Main Quest",
        target: questData.target || "",
        xp: parseInt(questData.xp, 10) || 10,
        locked: !!questData.locked,
        active: true,
        sort_order: activeTasks.length,
        created_at: new Date().toISOString()
      };
      setLocal(s => ({ ...s, tasks: [...s.tasks, newTask] }));
    } else {
      setLocal(s => ({
        ...s,
        tasks: s.tasks.map(t =>
          t.id === questData.id
            ? {
                ...t,
                title: questData.title,
                category: questData.category,
                target: questData.target,
                xp: parseInt(questData.xp, 10) || 10,
                locked: questData.locked
              }
            : t
        )
      }));
    }
    setQuestModal(null);
  };

  const deleteTask = (taskId) => {
    const task = local.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.locked) {
      alert("This quest is locked 🔒. Unlock it on the EDIT QUESTS page before deleting.");
      return;
    }
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      setLocal(s => ({
        ...s,
        tasks: s.tasks.map(t => (t.id === taskId ? { ...t, active: false } : t))
      }));
    }
  };

  // --- CORE CONCEPTS ACTIONS ---
  const saveConceptModal = (conceptData) => {
    if (conceptData.isNew) {
      const newConcept = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: conceptData.title,
        subtitle: conceptData.subtitle || "Daily learning target",
        sort_order: local.concepts.length
      };
      setLocal(s => ({ ...s, concepts: [...s.concepts, newConcept] }));
    } else {
      setLocal(s => ({
        ...s,
        concepts: s.concepts.map(c =>
          c.id === conceptData.id
            ? { ...c, title: conceptData.title, subtitle: conceptData.subtitle }
            : c
        )
      }));
    }
    setConceptModal(null);
  };

  const deleteConcept = (conceptId) => {
    if (confirm("Delete this core concept target?")) {
      setLocal(s => ({
        ...s,
        concepts: s.concepts.filter(c => c.id !== conceptId)
      }));
    }
  };

  // --- SIDE QUEST ACTIONS ---
  const saveSideQuestModal = (sqData) => {
    if (sqData.isNew) {
      const newSq = {
        id: crypto.randomUUID(),
        user_id: userId,
        title: sqData.title,
        description: sqData.description || "",
        date: sqData.date || todayStr(),
        priority: sqData.priority || "Medium",
        due_time: sqData.due_time || "",
        category: sqData.category || "General",
        completed: false,
        created_at: new Date().toISOString(),
        completed_at: null
      };
      setLocal(s => ({ ...s, side_quests: [...(s.side_quests || []), newSq] }));
    } else {
      setLocal(s => ({
        ...s,
        side_quests: (s.side_quests || []).map(sq =>
          sq.id === sqData.id ? { ...sq, ...sqData } : sq
        )
      }));
    }
    setSideQuestModal(null);
  };

  const toggleSideQuestCompletion = (sqId) => {
    setLocal(s => ({
      ...s,
      side_quests: (s.side_quests || []).map(sq => {
        if (sq.id === sqId) {
          const nextState = !sq.completed;
          return {
            ...sq,
            completed: nextState,
            completed_at: nextState ? new Date().toISOString() : null
          };
        }
        return sq;
      })
    }));
  };

  const deleteSideQuest = (sqId) => {
    if (confirm("Are you sure you want to delete this Side Quest?")) {
      setLocal(s => ({
        ...s,
        side_quests: (s.side_quests || []).filter(sq => sq.id !== sqId)
      }));
    }
  };

  // --- PUSH NOTIFICATION REMINDERS FOR SIDE QUESTS (10 MIN PRE-DUE) ---
  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      alert("Browser push notifications are not supported on this device/browser.");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        const title = "⚔️ Notifications Enabled!";
        const options = {
          body: "You will receive reminders 10 minutes before your Side Quests are due.",
          icon: "/icon-192.png",
          badge: "/favicon-32.png"
        };
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
        } else {
          new Notification(title, options);
        }
      } else if (perm === "denied") {
        alert("Notification permission was denied in browser settings.");
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
  };

  useEffect(() => {
    if (notifPermission !== "granted") return;

    const checkSideQuestReminders = () => {
      const today = todayStr();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const activeSideQuests = local.side_quests || [];
      const todayQuests = activeSideQuests.filter(sq => sq.date === today && !sq.completed && sq.due_time);

      todayQuests.forEach(sq => {
        const parts = sq.due_time.split(":");
        if (parts.length < 2) return;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return;

        const dueMinutes = h * 60 + m;
        const diffMinutes = dueMinutes - nowMinutes;

        // Trigger notification if 10 minutes or less remain before due time (down to -2m overdue)
        if (diffMinutes <= 10 && diffMinutes >= -2) {
          const storageKey = `sq_notified_${sq.id}_${today}`;
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, "true");

            const title = diffMinutes > 0
              ? `⚔️ Side Quest Due in ${diffMinutes}m!`
              : `⚔️ Side Quest Due NOW!`;
            const body = `"${sq.title}" is due at ${sq.due_time}. Complete it to earn XP!`;
            const options = {
              body,
              icon: "/icon-192.png",
              badge: "/favicon-32.png",
              tag: `sq-reminder-${sq.id}`,
              renotify: true
            };

            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
            } else if (typeof Notification !== "undefined") {
              new Notification(title, options);
            }
          }
        }
      });
    };

    checkSideQuestReminders();
    const interval = setInterval(checkSideQuestReminders, 20000);
    return () => clearInterval(interval);
  }, [local.side_quests, notifPermission]);

  // --- QUICK LOG 10 PAGES READING ACTION ---
  const logReadingTenPages = () => {
    const activeBook = local.books.find(b => b.status === "Reading") || local.books[0];
    if (activeBook) {
      const newPage = (activeBook.current_page || 0) + 10;
      const isComplete = activeBook.total_pages > 0 && newPage >= activeBook.total_pages;
      setLocal(s => ({
        ...s,
        books: s.books.map(b =>
          b.id === activeBook.id
            ? {
                ...b,
                current_page: newPage,
                status: isComplete ? "Completed" : b.status,
                completed_date: isComplete ? todayStr() : b.completed_date
              }
            : b
        )
      }));
    }
    // Also toggle "Read 10 Pages" main quest if present
    const readQuest = activeTasks.find(t => t.title.toLowerCase().includes("read 10 pages"));
    if (readQuest) {
      const key = `${readQuest.id}:${todayStr()}`;
      if (!local.completions[key]) {
        toggleTaskCompletion(readQuest);
      }
    }
  };

  // --- CALCULATED STATS & ANALYTICS ---
  const todayCompletionsCount = useMemo(() => {
    return activeTasks.filter(t => local.completions[`${t.id}:${todayStr()}`]).length;
  }, [activeTasks, local.completions]);

  const completionPct = activeTasks.length ? Math.round((todayCompletionsCount / activeTasks.length) * 100) : 0;
  
  const todayXp = useMemo(() => {
    return activeTasks
      .filter(t => local.completions[`${t.id}:${todayStr()}`])
      .reduce((acc, t) => acc + (t.xp || 10), 0);
  }, [activeTasks, local.completions]);

  // Level logic: level = floor(Total Cumulative XP / 100) + 1
  const totalXpAllTime = useMemo(() => {
    let total = 0;
    Object.keys(local.completions).forEach(k => {
      if (local.completions[k]) {
        const [taskId] = k.split(":");
        const task = local.tasks.find(t => t.id === taskId);
        total += task ? (task.xp || 10) : 10;
      }
    });
    // Side Quests XP (+10 Low, +20 Medium, +30 High)
    (local.side_quests || []).forEach(sq => {
      if (sq.completed) {
        const xp = sq.priority === "High" ? 30 : sq.priority === "Medium" ? 20 : 10;
        total += xp;
      }
    });
    return total;
  }, [local.completions, local.tasks, local.side_quests]);

  const currentLevel = Math.floor(totalXpAllTime / 100) + 1;
  const levelProgress = totalXpAllTime % 100;

  // Streak Calculation Algorithm
  const streakStats = useMemo(() => {
    let currentStreak = 0;
    let maxStreak = 0;
    let checkDate = new Date();
    
    // Check backwards day by day
    while (true) {
      const dateKey = checkDate.toISOString().slice(0, 10);
      const dayDone = activeTasks.some(t => local.completions[`${t.id}:${dateKey}`]);
      if (dayDone) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not done yet, allow checking yesterday before breaking current streak
        if (dateKey === todayStr() && currentStreak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayKey = checkDate.toISOString().slice(0, 10);
          if (activeTasks.some(t => local.completions[`${t.id}:${yesterdayKey}`])) {
            // Continuation from yesterday
            continue;
          }
        }
        break;
      }
    }

    // Calculate overall max streak across historical data
    let tempStreak = 0;
    for (let i = 90; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayDone = activeTasks.some(t => local.completions[`${t.id}:${key}`]);
      if (dayDone) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return { currentStreak, maxStreak: Math.max(maxStreak, currentStreak) };
  }, [activeTasks, local.completions]);

  if (!localReady) {
    return (
      <div className="loadingShell">
        <img src="/icon-192.png" alt="Project Ascend Logo" className="loadingLogoImg" />
        <div className="spinner"></div>
        <strong className="loadingTitle">PROJECT ASCEND</strong>
        <span className="loadingSubtitle">Initializing local vault…</span>
      </div>
    );
  }

  return (
    <div className="appShell">
      {/* HEADER BAR */}
      <header className="appHeader">
        <div className="brandGroup">
          <img src="/favicon-32.png" alt="Project Ascend Logo" className="headerLogoImg" />
          <div className="brandText">PROJECT <span>ASCEND</span></div>
        </div>

        <div className="headerRightGroup">
          <div className={`networkBadge ${online ? "online" : "offline"}`}>
            {online ? <Cloud size={14} /> : <WifiOff size={14} />}
            <span>{online ? (syncing ? "Syncing..." : "Online Sync") : "Offline Vault"}</span>
          </div>

          {user ? (
            <div className="userBadge">
              <span className="userEmail">{user.email}</span>
              <button className="iconBtn dangerHover" onClick={handleLogout} title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="googleLoginBtn" onClick={handleGoogleLogin}>
              <LogIn size={16} />
              <span>Continue with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="navTabs">
        {[
          { id: "dashboard", label: "Dashboard", icon: <Trophy size={16} /> },
          { id: "quests", label: "Quests Center ⚔️", icon: <Swords size={16} /> },
          { id: "reading", label: "Reading Center", icon: <BookOpen size={16} /> },
          { id: "wishlist", label: "Wishlist", icon: <ShoppingCart size={16} /> },
          { id: "analytics", label: "Analytics & History", icon: <BarChart2 size={16} /> },
          { id: "settings", label: "Settings", icon: <Settings size={16} /> }
        ].map(t => (
          <button
            key={t.id}
            className={`navTabBtn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* MAIN CONTAINER CONTENT */}
      {tab === "dashboard" && (
        <DashboardView
          tasks={activeTasks}
          local={local}
          toggleCompletion={toggleTaskCompletion}
          toggleLock={toggleTaskLock}
          completionPct={completionPct}
          todayCompletionsCount={todayCompletionsCount}
          todayXp={todayXp}
          currentLevel={currentLevel}
          levelProgress={levelProgress}
          totalXpAllTime={totalXpAllTime}
          streakStats={streakStats}
          logReadingTenPages={logReadingTenPages}
          onNavigate={setTab}
          sideQuests={local.side_quests || []}
          toggleSideQuestCompletion={toggleSideQuestCompletion}
          onOpenSideQuestModal={setSideQuestModal}
          onNavigateToSideQuests={() => { setTab("quests"); setQuestSubTab("side"); }}
        />
      )}

      {tab === "quests" && (
        <QuestsSection
          subTab={questSubTab}
          setSubTab={setQuestSubTab}
          tasks={activeTasks}
          concepts={local.concepts}
          toggleLock={toggleTaskLock}
          moveOrder={moveTaskOrder}
          onOpenQuestModal={setQuestModal}
          onDeleteQuest={deleteTask}
          onOpenConceptModal={setConceptModal}
          onDeleteConcept={deleteConcept}
          sideQuests={local.side_quests || []}
          toggleSideQuestCompletion={toggleSideQuestCompletion}
          onOpenSideQuestModal={setSideQuestModal}
          onDeleteSideQuest={deleteSideQuest}
          notifPermission={notifPermission}
          requestNotificationPermission={requestNotificationPermission}
        />
      )}

      {tab === "reading" && (
        <ReadingView
          books={local.books}
          setLocal={setLocal}
          onOpenBookModal={setBookModal}
          logReadingTenPages={logReadingTenPages}
        />
      )}

      {tab === "wishlist" && (
        <WishlistView
          wishlist={local.wishlist}
          setLocal={setLocal}
          onOpenWishlistModal={setWishlistModal}
        />
      )}

      {tab === "analytics" && (
        <AnalyticsView
          local={local}
          tasks={activeTasks}
          streakStats={streakStats}
          totalXpAllTime={totalXpAllTime}
        />
      )}

      {tab === "settings" && (
        <SettingsView
          user={user}
          online={online}
          syncWithCloud={syncWithCloud}
          syncing={syncing}
          notifPermission={notifPermission}
          requestNotificationPermission={requestNotificationPermission}
        />
      )}

      {/* MODAL DIALOGS */}
      {questModal && (
        <QuestModal
          modalData={questModal}
          onClose={() => setQuestModal(null)}
          onSave={saveQuestModal}
        />
      )}

      {sideQuestModal && (
        <SideQuestModal
          modalData={sideQuestModal}
          onClose={() => setSideQuestModal(null)}
          onSave={saveSideQuestModal}
        />
      )}

      {conceptModal && (
        <ConceptModal
          modalData={conceptModal}
          onClose={() => setConceptModal(null)}
          onSave={saveConceptModal}
        />
      )}

      {bookModal && (
        <BookModal
          modalData={bookModal}
          onClose={() => setBookModal(null)}
          onSave={(bookData) => {
            if (bookData.isNew) {
              const newBook = {
                id: crypto.randomUUID(),
                user_id: userId,
                title: bookData.title,
                author: bookData.author || "",
                start_date: bookData.start_date || todayStr(),
                completed_date: null,
                current_page: parseInt(bookData.current_page, 10) || 0,
                total_pages: parseInt(bookData.total_pages, 10) || 0,
                status: bookData.status || "Reading",
                notes: bookData.notes || ""
              };
              setLocal(s => ({ ...s, books: [...s.books, newBook] }));
            } else {
              setLocal(s => ({
                ...s,
                books: s.books.map(b => (b.id === bookData.id ? { ...b, ...bookData } : b))
              }));
            }
            setBookModal(null);
          }}
        />
      )}

      {wishlistModal && (
        <WishlistModal
          modalData={wishlistModal}
          onClose={() => setWishlistModal(null)}
          onSave={(itemData) => {
            if (itemData.isNew) {
              const newItem = {
                id: crypto.randomUUID(),
                user_id: userId,
                item: itemData.item,
                category: itemData.category || "General",
                estimated_cost: parseFloat(itemData.estimated_cost) || 0,
                priority: itemData.priority || "Medium",
                purchased: false,
                notes: itemData.notes || ""
              };
              setLocal(s => ({ ...s, wishlist: [...s.wishlist, newItem] }));
            } else {
              setLocal(s => ({
                ...s,
                wishlist: s.wishlist.map(w => (w.id === itemData.id ? { ...w, ...itemData } : w))
              }));
            }
            setWishlistModal(null);
          }}
        />
      )}

      <footer className="appFooter">
        <img src="/favicon-16.png" alt="Project Ascend Logo" className="footerLogoImg" />
        <span>PROJECT ASCEND • Offline-First Personal OS • Installable PWA</span>
      </footer>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD VIEW COMPONENT
// ==========================================
function DashboardView({
  tasks, local, toggleCompletion, toggleLock, completionPct, todayCompletionsCount,
  todayXp, currentLevel, levelProgress, totalXpAllTime, streakStats, logReadingTenPages,
  onNavigate, sideQuests, toggleSideQuestCompletion, onOpenSideQuestModal, onNavigateToSideQuests
}) {
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const activeBook = local.books.find(b => b.status === "Reading") || local.books[0];

  const todaySideQuests = useMemo(() => {
    return (sideQuests || []).filter(sq => sq.date === todayStr());
  }, [sideQuests]);

  const todaySideQuestsDone = todaySideQuests.filter(sq => sq.completed).length;

  return (
    <main className="viewContainer fade-in">
      {/* HERO HERO SECTION */}
      <section className="heroCard">
        <div className="heroInfo">
          <div className="eyebrowText">
            <Calendar size={13} />
            <span>TODAY • {formattedDate.toUpperCase()}</span>
          </div>
          <h1>
            Build the version of you<br />
            <span>you actually want.</span>
          </h1>
          <p className="heroDesc">
            Your personal operating system for coding, learning, career, health, and high performance.
          </p>

          {/* LEVEL BAR WIDGET */}
          <div className="levelWidget">
            <div className="levelBadge">LEVEL {currentLevel}</div>
            <div className="levelBarContainer">
              <div className="levelBarFill" style={{ width: `${levelProgress}%` }}></div>
            </div>
            <span className="levelXpText">{levelProgress} / 100 XP to Level {currentLevel + 1}</span>
          </div>
        </div>

        {/* PROGRESS RING */}
        <div className="ringContainer">
          <div
            className="ringVisual"
            style={{
              background: `conic-gradient(#f5b942 0 ${completionPct}%, #1e2535 ${completionPct}% 100%)`
            }}
          >
            <div className="ringInner">
              <strong className="ringPercent">{completionPct}%</strong>
              <small className="ringLabel">Completed</small>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS ROW */}
      <section className="metricsGrid">
        <div className="metricCard">
          <div className="metricIcon gold"><CheckCircle2 size={22} /></div>
          <div className="metricData">
            <strong>{todayCompletionsCount} / {tasks.length}</strong>
            <small>Quests Completed Today</small>
          </div>
        </div>

        <div className="metricCard">
          <div className="metricIcon flame"><Flame size={22} /></div>
          <div className="metricData">
            <strong>{streakStats.currentStreak} Days</strong>
            <small>Current Daily Streak ({streakStats.maxStreak} Best)</small>
          </div>
        </div>

        <div className="metricCard">
          <div className="metricIcon star"><Sparkles size={22} /></div>
          <div className="metricData">
            <strong>+{todayXp} XP</strong>
            <small>Earned Today ({totalXpAllTime} Total)</small>
          </div>
        </div>

        <div className="metricCard">
          <div className="metricIcon book"><BookOpen size={22} /></div>
          <div className="metricData">
            <strong>{local.books.length} Books</strong>
            <small>Tracked in Library</small>
          </div>
        </div>
      </section>

      {/* MAIN TWO COLUMN GRID */}
      <section className="dashboardGrid">
        <div className="dashboardMainCol">
          {/* MAIN QUESTS PANEL */}
        <div className="glassPanel">
          <div className="panelHeader">
            <div>
              <h3>MAIN QUESTS</h3>
              <span className="panelSub">Daily high-priority targets</span>
            </div>
            <div className="panelHeaderActions">
              <span className="statusCountTag">{todayCompletionsCount}/{tasks.length} DONE</span>
              <button className="linkBtn" onClick={() => onNavigate("quests")}>
                Edit Quests <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="questList">
            {tasks.length === 0 ? (
              <div className="emptyState">No active quests. Click "EDIT QUESTS" to add some!</div>
            ) : (
              tasks.map(task => {
                const isDone = !!local.completions[`${task.id}:${todayStr()}`];
                return (
                  <div key={task.id} className={`questItem ${isDone ? "completed" : ""}`}>
                    <button
                      className={`checkControl ${isDone ? "checked" : ""}`}
                      onClick={() => toggleCompletion(task)}
                      title={isDone ? "Mark incomplete" : "Mark complete"}
                    >
                      {isDone && <Check size={18} strokeWidth={3} />}
                    </button>

                    <div className="questContent">
                      <div className="questTitleRow">
                        <strong className="questTitle">{task.title}</strong>
                        {task.locked && (
                          <span className="lockBadge" title="Protected quest (Locked)">
                            <Lock size={12} />
                          </span>
                        )}
                      </div>
                      <div className="questMeta">
                        <span className="catTag">{task.category}</span>
                        {task.target && <span className="targetTag">Target: {task.target}</span>}
                      </div>
                    </div>

                    <div className="questRight">
                      <span className="xpBadge">+{task.xp || 10} XP</span>
                      <button
                        className={`lockToggleBtn ${task.locked ? "locked" : ""}`}
                        onClick={() => toggleLock(task)}
                        title={task.locked ? "Unlock task configuration" : "Lock task configuration"}
                      >
                        {task.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TODAY'S SIDE QUESTS PANEL */}
        <div className="glassPanel marginTop">
          <div className="panelHeader">
            <div>
              <h3>⚔️ TODAY'S SIDE QUESTS</h3>
              <span className="panelSub">Temporary daily tasks & errands</span>
            </div>
            <div className="panelHeaderActions">
              <span className="statusCountTag">
                {todaySideQuestsDone}/{todaySideQuests.length} DONE
              </span>
              <button className="linkBtn" onClick={() => onNavigateToSideQuests()}>
                Side Quests <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {todaySideQuests.length === 0 ? (
            <div className="dashboardEmptyState">
              <span className="dimText">No side quests added for today yet.</span>
              <button
                className="secondaryBtn smallBtn"
                onClick={() => onOpenSideQuestModal({ isNew: true, defaultDate: todayStr() })}
              >
                <Plus size={14} />
                <span>+ Add Side Quest</span>
              </button>
            </div>
          ) : (
            <div className="questList">
              {todaySideQuests.map((quest) => (
                <div key={quest.id} className={`questItem ${quest.completed ? "completed" : ""}`}>
                  <button
                    className={`checkControl ${quest.completed ? "checked" : ""}`}
                    onClick={() => toggleSideQuestCompletion(quest.id)}
                    title={quest.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {quest.completed && <Check size={18} strokeWidth={3} />}
                  </button>
                  <div className="questContent">
                    <div className="questTitleRow">
                      <strong className="questTitle">{quest.title}</strong>
                      <span className={`priorityBadge small ${quest.priority.toLowerCase()}`}>
                        {quest.priority === "High" ? "🔥 High" : quest.priority === "Low" ? "🌱 Low" : "⚡ Med"}
                      </span>
                    </div>
                    {quest.description && <p className="questDescText">{quest.description}</p>}
                    <div className="questMeta">
                      {quest.category && <span className="catTag">{quest.category}</span>}
                      {quest.due_time && (
                        <span className="targetTag">
                          <Clock size={12} /> {quest.due_time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="questRight">
                    <span className="xpBadge">
                      +{quest.priority === "High" ? 30 : quest.priority === "Medium" ? 20 : 10} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* SIDE PANELS COLUMN */}
        <div className="dashboardSideCol">
          {/* CORE CONCEPTS ROTATION CARD */}
          <div className="glassPanel">
            <div className="panelHeader">
              <div>
                <h3>CORE CONCEPTS</h3>
                <span className="panelSub">Daily focus topics</span>
              </div>
            </div>
            <div className="conceptList">
              {local.concepts.map(concept => (
                <div key={concept.id} className="conceptItem">
                  <div className="conceptDot"></div>
                  <div className="conceptInfo">
                    <strong>{concept.title}</strong>
                    <small>{concept.subtitle}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK READING LOG CARD */}
          <div className="glassPanel">
            <div className="panelHeader">
              <div>
                <h3>READING FOCUS</h3>
                <span className="panelSub">10 Pages Daily Goal</span>
              </div>
            </div>
            {activeBook ? (
              <div className="quickBookCard">
                <div className="quickBookHead">
                  <strong>{activeBook.title}</strong>
                  {activeBook.author && <small>by {activeBook.author}</small>}
                </div>
                <div className="progressInfo">
                  <span>Page {activeBook.current_page} of {activeBook.total_pages || "?"}</span>
                  <span>
                    {activeBook.total_pages
                      ? `${Math.round((activeBook.current_page / activeBook.total_pages) * 100)}%`
                      : ""}
                  </span>
                </div>
                <button className="primaryBtn fullWidth" onClick={logReadingTenPages}>
                  <BookOpen size={16} />
                  <span>Log +10 Pages Today</span>
                </button>
              </div>
            ) : (
              <div className="emptyState">
                No active book being read.
                <button className="primaryBtn smallBtn" onClick={() => onNavigate("reading")}>
                  Add Book
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// ==========================================
// 2. EDIT QUESTS VIEW COMPONENT
// ==========================================
function EditQuestsView({
  tasks, concepts, toggleLock, moveOrder, onOpenQuestModal, onDeleteQuest,
  onOpenConceptModal, onDeleteConcept
}) {
  return (
    <div className="fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Pencil size={13} /> TASK & CONCEPT MANAGEMENT</div>
          <h2 className="pageTitle">MAIN QUESTS SETUP</h2>
          <p className="pageSubtitle">
            Configure quest names, categories, targets, XP rewards, and lock protection. Reorder items using the arrows.
            <br />
            <strong>Note: Daily completion checkboxes are strictly on the Dashboard.</strong>
          </p>
        </div>
        <button className="primaryBtn" onClick={() => onOpenQuestModal({ isNew: true })}>
          <Plus size={16} />
          <span>Add New Quest</span>
        </button>
      </div>

      {/* QUESTS MANAGEMENT LIST */}
      <div className="glassPanel">
        <div className="panelHeader">
          <div>
            <h3>QUEST LIST ({tasks.length} ACTIVE)</h3>
            <span className="panelSub">Reorder, edit, lock, or delete quests</span>
          </div>
        </div>

        <div className="editQuestList">
          {tasks.map((task, idx) => (
            <div key={task.id} className={`editQuestCard ${task.locked ? "isLocked" : ""}`}>
              {/* REORDER BUTTONS */}
              <div className="reorderGroup">
                <button
                  className="iconBtn small"
                  disabled={idx === 0 || task.locked}
                  onClick={() => moveOrder(idx, -1)}
                  title="Move Up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="iconBtn small"
                  disabled={idx === tasks.length - 1 || task.locked}
                  onClick={() => moveOrder(idx, 1)}
                  title="Move Down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* QUEST DETAILS */}
              <div className="editQuestBody">
                <div className="titleRow">
                  <strong className="questTitle">{task.title}</strong>
                  {task.locked ? (
                    <span className="lockBadge warning">🔒 Locked</span>
                  ) : (
                    <span className="lockBadge success">🔓 Unlocked</span>
                  )}
                </div>
                <div className="questMeta">
                  <span className="catTag">{task.category}</span>
                  <span className="targetTag">Target: {task.target || "None"}</span>
                  <span className="xpTag">+{task.xp} XP</span>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="editQuestActions">
                <button
                  className={`lockToggleBtn ${task.locked ? "locked" : ""}`}
                  onClick={() => toggleLock(task)}
                  title={task.locked ? "Unlock quest configuration" : "Lock quest configuration"}
                >
                  {task.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>

                <button
                  className="iconBtn"
                  disabled={task.locked}
                  onClick={() => onOpenQuestModal({ isNew: false, task })}
                  title={task.locked ? "Unlock first to edit" : "Edit quest details"}
                >
                  <Pencil size={15} />
                </button>

                <button
                  className="iconBtn dangerHover"
                  disabled={task.locked}
                  onClick={() => onDeleteQuest(task.id)}
                  title={task.locked ? "Unlock first to delete" : "Delete quest"}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CORE CONCEPTS MANAGER */}
      <div className="glassPanel marginTop">
        <div className="panelHeader">
          <div>
            <h3>CORE CONCEPTS ROTATION</h3>
            <span className="panelSub">Daily core learning skills</span>
          </div>
          <button className="secondaryBtn smallBtn" onClick={() => onOpenConceptModal({ isNew: true })}>
            <Plus size={14} />
            <span>Add Concept</span>
          </button>
        </div>

        <div className="conceptsGrid">
          {concepts.map(concept => (
            <div key={concept.id} className="conceptCard">
              <div className="conceptInfo">
                <strong>{concept.title}</strong>
                <small>{concept.subtitle}</small>
              </div>
              <div className="cardActions">
                <button className="iconBtn small" onClick={() => onOpenConceptModal({ isNew: false, concept })}>
                  <Pencil size={14} />
                </button>
                <button className="iconBtn small dangerHover" onClick={() => onDeleteConcept(concept.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// QUESTS SECTION (WRAPPER FOR MAIN & SIDE QUESTS)
// ==========================================
function QuestsSection({
  subTab, setSubTab, tasks, concepts, toggleLock, moveOrder, onOpenQuestModal,
  onDeleteQuest, onOpenConceptModal, onDeleteConcept, sideQuests,
  toggleSideQuestCompletion, onOpenSideQuestModal, onDeleteSideQuest,
  notifPermission, requestNotificationPermission
}) {
  const todayPendingSideCount = useMemo(() => {
    return (sideQuests || []).filter(sq => sq.date === todayStr() && !sq.completed).length;
  }, [sideQuests]);

  return (
    <main className="viewContainer fade-in">
      {/* PROMINENT SUB-TAB NAVIGATION HEADER */}
      <div className="questMainHeaderCard glassPanel">
        <div className="questHeaderTopRow">
          <div>
            <div className="eyebrowText">
              <Swords size={13} /> QUEST COMMAND CENTER
            </div>
            <h2 className="pageTitle" style={{ margin: 0 }}>
              {subTab === "main" ? "📜 MAIN QUESTS" : "⚔️ SIDE QUESTS"}
            </h2>
            <p className="pageSubtitle" style={{ marginTop: 4, marginBottom: 0 }}>
              {subTab === "main"
                ? "Permanent daily routines, skill training targets, and locked task setups."
                : "Temporary daily tasks, date-bound assignments, errands, meetings, and bills."}
            </p>
          </div>

          <div className="subNavTabsProminent">
            <button
              className={`subNavBtnProminent ${subTab === "main" ? "active" : ""}`}
              onClick={() => setSubTab("main")}
            >
              <Shield size={16} />
              <span>📜 Main Quests</span>
            </button>
            <button
              className={`subNavBtnProminent ${subTab === "side" ? "active" : ""}`}
              onClick={() => setSubTab("side")}
            >
              <Swords size={16} />
              <span>⚔️ Side Quests</span>
              {todayPendingSideCount > 0 && (
                <span className="subBadgeCount">{todayPendingSideCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {subTab === "main" ? (
        <EditQuestsView
          tasks={tasks}
          concepts={concepts}
          toggleLock={toggleLock}
          moveOrder={moveOrder}
          onOpenQuestModal={onOpenQuestModal}
          onDeleteQuest={onDeleteQuest}
          onOpenConceptModal={onOpenConceptModal}
          onDeleteConcept={onDeleteConcept}
        />
      ) : (
        <SideQuestView
          sideQuests={sideQuests}
          toggleCompletion={toggleSideQuestCompletion}
          onOpenModal={onOpenSideQuestModal}
          onDelete={onDeleteSideQuest}
          notifPermission={notifPermission}
          requestNotificationPermission={requestNotificationPermission}
        />
      )}
    </main>
  );
}

// ==========================================
// SIDE QUEST VIEW COMPONENT
// ==========================================
function SideQuestView({ sideQuests, toggleCompletion, onOpenModal, onDelete, notifPermission, requestNotificationPermission }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const changeDate = (days) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const dateQuests = useMemo(() => {
    return (sideQuests || []).filter(sq => sq.date === selectedDate);
  }, [sideQuests, selectedDate]);

  const stats = useMemo(() => {
    const total = dateQuests.length;
    const completed = dateQuests.filter(sq => sq.completed).length;
    const remaining = total - completed;
    const highPriority = dateQuests.filter(sq => sq.priority === "High" && !sq.completed).length;
    return { total, completed, remaining, highPriority };
  }, [dateQuests]);

  const isToday = selectedDate === todayStr();
  const formattedDateHeader = new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });

  return (
    <div className="fade-in">
      {/* PAGE HEADER */}
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText">
            <Swords size={13} /> TEMPORARY DAILY TASKS
          </div>
          <h2 className="pageTitle">⚔️ Side Quests</h2>
          <p className="pageSubtitle">
            Manage day-specific tasks, assignments, meetings, and errands without cluttering your permanent Main Quest routine.
          </p>
        </div>
        <div className="headerBtnGroup">
          <button
            className={`secondaryBtn ${notifPermission === "granted" ? "notifActiveBtn" : "notifEnableBtn"}`}
            onClick={requestNotificationPermission}
            title={notifPermission === "granted" ? "10m reminders active" : "Enable 10-minute due reminders"}
          >
            {notifPermission === "granted" ? <Bell size={16} color="#f5b942" /> : <BellOff size={16} />}
            <span>{notifPermission === "granted" ? "10m Reminders Active" : "Enable 10m Reminders"}</span>
          </button>
          <button
            className="primaryBtn"
            onClick={() => onOpenModal({ isNew: true, defaultDate: selectedDate })}
          >
            <Plus size={16} />
            <span>Add Side Quest</span>
          </button>
        </div>
      </div>

      {/* DATE NAVIGATION BAR */}
      <div className="dateNavCard glassPanel">
        <button className="secondaryBtn smallBtn" onClick={() => changeDate(-1)}>
          ← Previous Day
        </button>
        <div className="dateCenterGroup">
          <button
            className={`todayBadgeBtn ${isToday ? "active" : ""}`}
            onClick={() => setSelectedDate(todayStr())}
          >
            Today
          </button>
          <span className="selectedDateText">{formattedDateHeader}</span>
          <input
            type="date"
            className="datePickerInput"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
        </div>
        <button className="secondaryBtn smallBtn" onClick={() => changeDate(1)}>
          Next Day →
        </button>
      </div>

      {/* STATS SUMMARY GRID */}
      <div className="sideQuestStatsGrid">
        <div className="statItemCard">
          <strong>{stats.total}</strong>
          <small>Total Tasks</small>
        </div>
        <div className="statItemCard success">
          <strong>{stats.completed}</strong>
          <small>Completed</small>
        </div>
        <div className="statItemCard warning">
          <strong>{stats.remaining}</strong>
          <small>Remaining</small>
        </div>
        <div className="statItemCard danger">
          <strong>{stats.highPriority}</strong>
          <small>High Priority</small>
        </div>
      </div>

      {/* SIDE QUESTS LIST PANEL */}
      <div className="glassPanel">
        <div className="panelHeader">
          <div>
            <h3>{isToday ? "TODAY'S SIDE QUESTS" : `SIDE QUESTS (${formattedDateHeader})`}</h3>
            <span className="panelSub">
              {stats.total === 0
                ? "No tasks scheduled for this day"
                : `${stats.completed} of ${stats.total} completed`}
            </span>
          </div>
          <span className="statusCountTag">
            {stats.remaining === 0 && stats.total > 0 ? "ALL CLEAR ⚔️" : `${stats.remaining} REMAINING`}
          </span>
        </div>

        {dateQuests.length === 0 ? (
          <div className="emptyQuestState">
            <div className="emptyIconVisual">⚔️</div>
            <h4>⚔️ No Side Quests {isToday ? "Today" : "For This Date"}</h4>
            <p>"Your battlefield is clear. Add a temporary quest when something unexpected comes up."</p>
            <button
              className="primaryBtn"
              onClick={() => onOpenModal({ isNew: true, defaultDate: selectedDate })}
            >
              <Plus size={16} />
              <span>+ Add Side Quest</span>
            </button>
          </div>
        ) : (
          <div className="sideQuestList">
            {dateQuests.map((quest) => (
              <SideQuestCard
                key={quest.id}
                quest={quest}
                toggleCompletion={toggleCompletion}
                onEdit={(q) => onOpenModal({ isNew: false, quest: q })}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SIDE QUEST CARD COMPONENT
// ==========================================
function SideQuestCard({ quest, toggleCompletion, onEdit, onDelete }) {
  const getPriorityBadge = (p) => {
    if (p === "High") return <span className="priorityBadge high">🔥 High (+30 XP)</span>;
    if (p === "Low") return <span className="priorityBadge low">🌱 Low (+10 XP)</span>;
    return <span className="priorityBadge medium">⚡ Medium (+20 XP)</span>;
  };

  return (
    <div className={`sideQuestCard ${quest.completed ? "completed" : ""}`}>
      <button
        className={`checkControl ${quest.completed ? "checked" : ""}`}
        onClick={() => toggleCompletion(quest.id)}
        title={quest.completed ? "Mark pending" : "Mark completed"}
      >
        {quest.completed && <Check size={18} strokeWidth={3} />}
      </button>

      <div className="sideQuestBody">
        <div className="titleRow">
          <strong className="questTitle">{quest.title}</strong>
          {getPriorityBadge(quest.priority)}
        </div>

        {quest.description && (
          <p className="questDescription">{quest.description}</p>
        )}

        <div className="questMetaRow">
          {quest.category && <span className="catTag">{quest.category}</span>}
          {quest.due_time && (
            <span className="dueTag">
              <Clock size={12} />
              <span>Due {quest.due_time}</span>
            </span>
          )}
          {quest.completed && quest.completed_at && (
            <span className="completedTimeTag">
              ✓ Done at {new Date(quest.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="cardActions">
        <button className="iconBtn small" onClick={() => onEdit(quest)} title="Edit quest">
          <Pencil size={14} />
        </button>
        <button className="iconBtn small dangerHover" onClick={() => onDelete(quest.id)} title="Delete quest">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SIDE QUEST MODAL COMPONENT
// ==========================================
function SideQuestModal({ modalData, onClose, onSave }) {
  const isNew = modalData.isNew;
  const quest = modalData.quest || {};

  const [title, setTitle] = useState(quest.title || "");
  const [description, setDescription] = useState(quest.description || "");
  const [date, setDate] = useState(quest.date || modalData.defaultDate || todayStr());
  const [priority, setPriority] = useState(quest.priority || "Medium");
  const [dueTime, setDueTime] = useState(quest.due_time || "");
  const [category, setCategory] = useState(quest.category || "General");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please enter a quest title.");
      return;
    }
    onSave({
      id: quest.id,
      isNew,
      title: title.trim(),
      description: description.trim(),
      date,
      priority,
      due_time: dueTime,
      category: category.trim() || "General"
    });
  };

  return (
    <div className="modalBackdrop fade-in">
      <div className="modalCard glassPanel">
        <div className="modalHeader">
          <h3>{isNew ? "⚔️ ADD NEW SIDE QUEST" : "✏️ EDIT SIDE QUEST"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Quest Title *</label>
            <input
              type="text"
              placeholder="e.g. Submit assignment today, Call HR, Pay bill..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="formGroup">
            <label>Description (Optional)</label>
            <textarea
              placeholder="Additional details or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="formGroup">
              <label>Due Time (Optional)</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Priority</label>
              <div className="prioritySelectGroup">
                {["Low", "Medium", "High"].map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={`priorityOptionBtn ${p.toLowerCase()} ${priority === p ? "selected" : ""}`}
                    onClick={() => setPriority(p)}
                  >
                    {p === "High" ? "🔥 High" : p === "Low" ? "🌱 Low" : "⚡ Medium"}
                  </button>
                ))}
              </div>
            </div>

            <div className="formGroup">
              <label>Category / Tag</label>
              <input
                type="text"
                placeholder="e.g. College, Admin, Personal..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="modalFooterActions">
            <button type="button" className="secondaryBtn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primaryBtn">
              {isNew ? "+ Create Side Quest" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 3. READING COMMAND CENTER COMPONENT
// ==========================================
function ReadingView({ books, setLocal, onOpenBookModal, logReadingTenPages }) {
  const activeBook = books.find(b => b.status === "Reading") || books[0];

  const handlePageChange = (bookId, newPage) => {
    const val = Math.max(0, parseInt(newPage, 10) || 0);
    setLocal(s => ({
      ...s,
      books: s.books.map(b => {
        if (b.id === bookId) {
          const isFinished = b.total_pages > 0 && val >= b.total_pages;
          return {
            ...b,
            current_page: val,
            status: isFinished ? "Completed" : b.status,
            completed_date: isFinished ? todayStr() : b.completed_date
          };
        }
        return b;
      })
    }));
  };

  const deleteBook = (bookId) => {
    if (confirm("Remove this book from your library?")) {
      setLocal(s => ({ ...s, books: s.books.filter(b => b.id !== bookId) }));
    }
  };

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><BookOpen size={13} /> KNOWLEDGE & LEARNING</div>
          <h2 className="pageTitle">READING COMMAND CENTER</h2>
          <p className="pageSubtitle">Track books, current page progress, completion status, and notes.</p>
        </div>
        <div className="headerBtnGroup">
          <button className="primaryBtn" onClick={logReadingTenPages}>
            <Sparkles size={16} />
            <span>Log +10 Pages Today</span>
          </button>
          <button className="secondaryBtn" onClick={() => onOpenBookModal({ isNew: true })}>
            <Plus size={16} />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      <div className="booksGrid">
        {books.length === 0 ? (
          <div className="glassPanel emptyState">
            No books tracked yet. Click "Add Book" to start your library!
          </div>
        ) : (
          books.map(book => {
            const pct = book.total_pages ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100)) : 0;
            return (
              <div key={book.id} className="glassPanel bookCard">
                <div className="bookHeader">
                  <span className={`statusPill ${book.status.toLowerCase().replace(/\s+/g, "")}`}>
                    {book.status}
                  </span>
                  <div className="cardActions">
                    <button className="iconBtn small" onClick={() => onOpenBookModal({ isNew: false, book })}>
                      <Pencil size={14} />
                    </button>
                    <button className="iconBtn small dangerHover" onClick={() => deleteBook(book.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="bookTitle">{book.title}</h3>
                {book.author && <div className="bookAuthor">by {book.author}</div>}

                <div className="bookProgressBlock">
                  <div className="progressLabels">
                    <span>Progress ({pct}%)</span>
                    <span>{book.current_page} / {book.total_pages || "?"} pages</span>
                  </div>
                  <div className="progressBarTrack">
                    <div className="progressBarFill" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="pageInputRow">
                  <label>Update Current Page:</label>
                  <input
                    type="number"
                    value={book.current_page}
                    onChange={e => handlePageChange(book.id, e.target.value)}
                  />
                </div>

                {book.notes && (
                  <div className="bookNotes">
                    <strong>Notes:</strong> {book.notes}
                  </div>
                )}

                <div className="bookFooterMeta">
                  <span>Started: {book.start_date || "N/A"}</span>
                  {book.completed_date && <span>Completed: {book.completed_date}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

// ==========================================
// 4. WISHLIST ("THINGS TO BUY") COMPONENT
// ==========================================
function WishlistView({ wishlist, setLocal, onOpenWishlistModal }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'purchased'

  const togglePurchased = (id) => {
    setLocal(s => ({
      ...s,
      wishlist: s.wishlist.map(w => (w.id === id ? { ...w, purchased: !w.purchased } : w))
    }));
  };

  const deleteWishItem = (id) => {
    if (confirm("Remove item from wishlist?")) {
      setLocal(s => ({ ...s, wishlist: s.wishlist.filter(w => w.id !== id) }));
    }
  };

  const filteredItems = useMemo(() => {
    if (filter === "active") return wishlist.filter(w => !w.purchased);
    if (filter === "purchased") return wishlist.filter(w => w.purchased);
    return wishlist;
  }, [wishlist, filter]);

  const totalCost = wishlist.reduce((acc, w) => acc + (w.estimated_cost || 0), 0);
  const purchasedCost = wishlist.filter(w => w.purchased).reduce((acc, w) => acc + (w.estimated_cost || 0), 0);

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><ShoppingCart size={13} /> GOALS & REWARDS</div>
          <h2 className="pageTitle">THINGS TO BUY (WISHLIST)</h2>
          <p className="pageSubtitle">Track items you want to purchase as you hit performance milestones.</p>
        </div>
        <button className="primaryBtn" onClick={() => onOpenWishlistModal({ isNew: true })}>
          <Plus size={16} />
          <span>Add Wishlist Item</span>
        </button>
      </div>

      {/* SUMMARY BANNER */}
      <div className="metricsGrid">
        <div className="metricCard">
          <div className="metricIcon gold"><ShoppingCart size={22} /></div>
          <div className="metricData">
            <strong>₹{totalCost.toLocaleString()}</strong>
            <small>Total Wishlist Value</small>
          </div>
        </div>
        <div className="metricCard">
          <div className="metricIcon star"><CheckCircle2 size={22} /></div>
          <div className="metricData">
            <strong>₹{purchasedCost.toLocaleString()}</strong>
            <small>Purchased So Far</small>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="filterRow">
        {["all", "active", "purchased"].map(f => (
          <button
            key={f}
            className={`filterTabBtn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()} ({f === "all" ? wishlist.length : wishlist.filter(w => f === "purchased" ? w.purchased : !w.purchased).length})
          </button>
        ))}
      </div>

      {/* WISHLIST ITEMS */}
      <div className="wishlistGrid">
        {filteredItems.length === 0 ? (
          <div className="glassPanel emptyState">No items match your filter.</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className={`glassPanel wishCard ${item.purchased ? "isPurchased" : ""}`}>
              <div className="wishHeader">
                <button
                  className={`checkControl ${item.purchased ? "checked" : ""}`}
                  onClick={() => togglePurchased(item.id)}
                >
                  {item.purchased && <Check size={16} strokeWidth={3} />}
                </button>

                <div className="wishTitleGroup">
                  <h3 className="wishItemTitle">{item.item}</h3>
                  <div className="wishMetaTags">
                    <span className="catTag">{item.category || "General"}</span>
                    <span className={`priorityBadge ${item.priority?.toLowerCase()}`}>
                      {item.priority} Priority
                    </span>
                  </div>
                </div>

                <strong className="wishCost">₹{(item.estimated_cost || 0).toLocaleString()}</strong>
              </div>

              {item.notes && <p className="wishNotes">{item.notes}</p>}

              <div className="wishFooter">
                <span>{item.purchased ? "✓ Purchased" : "Pending Goal"}</span>
                <div className="cardActions">
                  <button className="iconBtn small" onClick={() => onOpenWishlistModal({ isNew: false, item })}>
                    <Pencil size={14} />
                  </button>
                  <button className="iconBtn small dangerHover" onClick={() => deleteWishItem(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

// ==========================================
// 5. HISTORY & ANALYTICS VIEW COMPONENT
// ==========================================
function AnalyticsView({ local, tasks, streakStats, totalXpAllTime }) {
  // Generate 14-day completion trend data
  const trendData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 13 + i);
      const dayStr = d.toISOString().slice(0, 10);
      const doneCount = tasks.filter(t => local.completions[`${t.id}:${dayStr}`]).length;
      const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
      return {
        day: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        completion: pct,
        count: doneCount
      };
    });
  }, [local.completions, tasks]);

  // Generate GitHub-style heatmap data for last 90 days
  const heatmapData = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 89 + i);
      const dayStr = d.toISOString().slice(0, 10);
      const doneCount = tasks.filter(t => local.completions[`${t.id}:${dayStr}`]).length;
      const ratio = tasks.length ? doneCount / tasks.length : 0;
      let level = 0;
      if (ratio > 0 && ratio <= 0.25) level = 1;
      else if (ratio > 0.25 && ratio <= 0.5) level = 2;
      else if (ratio > 0.5 && ratio <= 0.75) level = 3;
      else if (ratio > 0.75) level = 4;
      return { date: dayStr, doneCount, level, pct: Math.round(ratio * 100) };
    });
  }, [local.completions, tasks]);

  // Category performance breakdown
  const categoryStats = useMemo(() => {
    const map = {};
    Object.keys(local.completions).forEach(k => {
      if (local.completions[k]) {
        const [taskId] = k.split(":");
        const task = tasks.find(t => t.id === taskId);
        const cat = task?.category || "Other";
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [local.completions, tasks]);

  const COLORS = ["#f5b942", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f97316"];

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><BarChart2 size={13} /> PERFORMANCE INTELLIGENCE</div>
          <h2 className="pageTitle">ANALYTICS & HISTORY</h2>
          <p className="pageSubtitle">Real metrics calculated strictly from your verified daily activity log.</p>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="metricsGrid">
        <div className="metricCard">
          <div className="metricIcon flame"><Flame size={22} /></div>
          <div className="metricData">
            <strong>{streakStats.currentStreak} Days</strong>
            <small>Current Active Streak</small>
          </div>
        </div>
        <div className="metricCard">
          <div className="metricIcon gold"><Trophy size={22} /></div>
          <div className="metricData">
            <strong>{streakStats.maxStreak} Days</strong>
            <small>Best Historical Streak</small>
          </div>
        </div>
        <div className="metricCard">
          <div className="metricIcon star"><Sparkles size={22} /></div>
          <div className="metricData">
            <strong>{totalXpAllTime} XP</strong>
            <small>Total Lifetime XP</small>
          </div>
        </div>
      </div>

      {/* 90-DAY COMPLETION HEATMAP */}
      <div className="glassPanel">
        <div className="panelHeader">
          <div>
            <h3>90-DAY COMPLETION HEATMAP</h3>
            <span className="panelSub">Daily quest consistency map (GitHub Style)</span>
          </div>
        </div>
        <div className="heatmapGrid">
          {heatmapData.map((cell, idx) => (
            <div
              key={idx}
              className={`heatmapCell level-${cell.level}`}
              title={`${cell.date}: ${cell.doneCount} quests completed (${cell.pct}%)`}
            ></div>
          ))}
        </div>
        <div className="heatmapLegend">
          <span>Less</span>
          <div className="heatmapCell level-0"></div>
          <div className="heatmapCell level-1"></div>
          <div className="heatmapCell level-2"></div>
          <div className="heatmapCell level-3"></div>
          <div className="heatmapCell level-4"></div>
          <span>More</span>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="dashboardGrid marginTop">
        {/* 14-DAY TREND LINE CHART */}
        <div className="glassPanel">
          <div className="panelHeader">
            <h3>14-DAY COMPLETION RATE (%)</h3>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid stroke="#1e2638" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#717d96" />
                <YAxis unit="%" stroke="#717d96" />
                <Tooltip contentStyle={{ background: "#111622", borderColor: "#273145", color: "#fff" }} />
                <Line type="monotone" dataKey="completion" stroke="#f5b942" strokeWidth={3} dot={{ fill: "#f5b942" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CATEGORY BREAKDOWN PIE CHART */}
        <div className="glassPanel">
          <div className="panelHeader">
            <h3>CATEGORY DISTRIBUTION</h3>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            {categoryStats.length === 0 ? (
              <div className="emptyState">No completion history yet to display categories.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label
                  >
                    {categoryStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111622", borderColor: "#273145", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// 6. SETTINGS VIEW COMPONENT
// ==========================================
function SettingsView({ user, online, syncWithCloud, syncing, notifPermission, requestNotificationPermission }) {
  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Settings size={13} /> ARCHITECTURE & SYNC</div>
          <h2 className="pageTitle">SYSTEM SETTINGS</h2>
          <p className="pageSubtitle">Manage Google OAuth, cloud synchronization, push notifications, and offline storage state.</p>
        </div>
      </div>

      <div className="glassPanel">
        <h3>⚔️ Side Quest Push Notifications (10-Min Pre-Due Reminder)</h3>
        <p className="settingsDesc">
          Receive web push notifications 10 minutes before any Side Quest is due if it hasn't been completed.
        </p>

        <div className="settingsActions">
          <button
            className={notifPermission === "granted" ? "secondaryBtn" : "primaryBtn"}
            onClick={requestNotificationPermission}
          >
            {notifPermission === "granted" ? <Bell size={16} color="#f5b942" /> : <BellOff size={16} />}
            <span>
              {notifPermission === "granted"
                ? "10m Reminders Active (Click to Test)"
                : "Enable 10-Min Pre-Due Reminders"}
            </span>
          </button>
        </div>
      </div>

      <div className="glassPanel marginTop">
        <h3>User Authentication</h3>
        <p className="settingsDesc">
          {user
            ? `Signed in as ${user.email}. Your data is automatically backed up and synced to Supabase PostgreSQL.`
            : "Operating in local guest mode. Connect your Google account via Supabase to enable cloud sync."}
        </p>

        <div className="settingsActions">
          {online && user && (
            <button className="primaryBtn" onClick={syncWithCloud} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? "spin" : ""} />
              <span>{syncing ? "Syncing with Supabase..." : "Force Cloud Sync Now"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="glassPanel marginTop">
        <h3>Offline & PWA Configuration</h3>
        <p className="settingsDesc">
          Project Ascend uses IndexedDB as its primary database. The web app functions 100% offline, caching app shell assets via Service Worker. When internet reconnects, state automatically syncs to your Supabase PostgreSQL cloud tables.
        </p>
      </div>
    </main>
  );
}

// ==========================================
// MODAL COMPONENTS (QUEST, CONCEPT, BOOK, WISHLIST)
// ==========================================
function QuestModal({ modalData, onClose, onSave }) {
  const task = modalData.task || {};
  const [title, setTitle] = useState(task.title || "");
  const [category, setCategory] = useState(task.category || "Coding");
  const [target, setTarget] = useState(task.target || "");
  const [xp, setXp] = useState(task.xp || 10);
  const [locked, setLocked] = useState(!!task.locked);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      isNew: modalData.isNew,
      id: task.id,
      title, category, target, xp, locked
    });
  };

  return (
    <div className="modalBackdrop">
      <div className="modalCard glassPanel">
        <div className="modalHeader">
          <h3>{modalData.isNew ? "Add Main Quest" : "Edit Quest Details"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Quest Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. LeetCode 2 Problems"
            />
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Coding, Learning, Health, etc."
              />
            </div>
            <div className="formGroup">
              <label>Daily Target</label>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. 1 problem, 30 mins"
              />
            </div>
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>XP Reward</label>
              <input
                type="number"
                min="1"
                max="100"
                value={xp}
                onChange={e => setXp(e.target.value)}
              />
            </div>
            <div className="formGroup checkboxGroup">
              <label className="checkboxLabel">
                <input
                  type="checkbox"
                  checked={locked}
                  onChange={e => setLocked(e.target.checked)}
                />
                <span>Lock Quest (Protect Configuration 🔒)</span>
              </label>
            </div>
          </div>

          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Save Quest</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConceptModal({ modalData, onClose, onSave }) {
  const concept = modalData.concept || {};
  const [title, setTitle] = useState(concept.title || "");
  const [subtitle, setSubtitle] = useState(concept.subtitle || "Daily learning target");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ isNew: modalData.isNew, id: concept.id, title, subtitle });
  };

  return (
    <div className="modalBackdrop">
      <div className="modalCard glassPanel">
        <div className="modalHeader">
          <h3>{modalData.isNew ? "Add Core Concept" : "Edit Core Concept"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Concept Name *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. System Design" />
          </div>
          <div className="formGroup">
            <label>Description / Subtitle</label>
            <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Daily learning target" />
          </div>
          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Save Concept</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookModal({ modalData, onClose, onSave }) {
  const book = modalData.book || {};
  const [title, setTitle] = useState(book.title || "");
  const [author, setAuthor] = useState(book.author || "");
  const [totalPages, setTotalPages] = useState(book.total_pages || "");
  const [currentPage, setCurrentPage] = useState(book.current_page || 0);
  const [status, setStatus] = useState(book.status || "Reading");
  const [notes, setNotes] = useState(book.notes || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      isNew: modalData.isNew, id: book.id, title, author,
      total_pages: totalPages, current_page: currentPage, status, notes
    });
  };

  return (
    <div className="modalBackdrop">
      <div className="modalCard glassPanel">
        <div className="modalHeader">
          <h3>{modalData.isNew ? "Add New Book" : "Edit Book"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Book Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Atomic Habits" />
          </div>
          <div className="formGroup">
            <label>Author</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. James Clear" />
          </div>
          <div className="formRowGrid">
            <div className="formGroup">
              <label>Total Pages</label>
              <input type="number" value={totalPages} onChange={e => setTotalPages(e.target.value)} />
            </div>
            <div className="formGroup">
              <label>Current Page</label>
              <input type="number" value={currentPage} onChange={e => setCurrentPage(e.target.value)} />
            </div>
          </div>
          <div className="formGroup">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="selectInput">
              <option value="Reading">Reading</option>
              <option value="Completed">Completed</option>
              <option value="Want to Read">Want to Read</option>
            </select>
          </div>
          <div className="formGroup">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key takeaways..." />
          </div>
          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Save Book</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WishlistModal({ modalData, onClose, onSave }) {
  const item = modalData.item || {};
  const [itemName, setItemName] = useState(item.item || "");
  const [category, setCategory] = useState(item.category || "Tech");
  const [cost, setCost] = useState(item.estimated_cost || "");
  const [priority, setPriority] = useState(item.priority || "Medium");
  const [notes, setNotes] = useState(item.notes || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    onSave({
      isNew: modalData.isNew, id: item.id, item: itemName,
      category, estimated_cost: cost, priority, notes
    });
  };

  return (
    <div className="modalBackdrop">
      <div className="modalCard glassPanel">
        <div className="modalHeader">
          <h3>{modalData.isNew ? "Add Wishlist Item" : "Edit Wishlist Item"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Item Name *</label>
            <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Ergonomic Keyboard" />
          </div>
          <div className="formRowGrid">
            <div className="formGroup">
              <label>Estimated Cost (₹)</label>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div className="formGroup">
              <label>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="selectInput">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div className="formGroup">
            <label>Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Tech, Books, Health, etc." />
          </div>
          <div className="formGroup">
            <label>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why you want this item..." />
          </div>
          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- RENDER APPLICATION ---
createRoot(document.getElementById("root")).render(<App />);
