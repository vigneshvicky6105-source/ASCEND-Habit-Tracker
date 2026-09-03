import React, { useEffect, useState, useMemo, Component } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Check, Flame, Plus, Settings, BookOpen, LogIn, LogOut, WifiOff, Cloud,
  Pencil, Trash2, ArrowUp, ArrowDown, Lock, Unlock, Calendar, Trophy,
  BarChart2, Sparkles, X, ChevronRight, RefreshCw, ShoppingCart, Target,
  Layers, CheckCircle2, Circle, Swords, Shield, Clock, CalendarDays, Bell, BellOff,
  Wallet, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart,
  Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import "./styles.css";

// --- SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vpfuiifncfzndkxstrwe.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_gL3Gvfi67rQe2eDH42XG1A_4W0sOMuN";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- DEFAULT STARTER DATA ---
const STARTER_QUESTS = [
  { quest_key: "main_quest_01", title: "LeetCode + GeeksforGeeks", category: "Coding", target: "1 problem", xp: 10, locked: true },
  { quest_key: "main_quest_02", title: "Check Mail", category: "Career/Admin", target: "1 check", xp: 5, locked: true },
  { quest_key: "main_quest_03", title: "IT Learning", category: "Learning", target: "1 lesson", xp: 10, locked: false },
  { quest_key: "main_quest_04", title: "Apply for Jobs — Naukri + Indeed", category: "Career", target: "1+ application", xp: 15, locked: true },
  { quest_key: "main_quest_05", title: "Read 10 Pages", category: "Reading", target: "10 pages", xp: 10, locked: true },
  { quest_key: "main_quest_06", title: "Post on LinkedIn", category: "Career/Brand", target: "1 post", xp: 8, locked: false },
  { quest_key: "main_quest_07", title: "Create + Post Brainrot Videos", category: "Content", target: "1 video", xp: 10, locked: false },
  { quest_key: "main_quest_08", title: "Core Concept Learning", category: "Learning", target: "1 concept", xp: 10, locked: true },
  { quest_key: "main_quest_09", title: "Python Brush-Up", category: "Coding", target: "30 min", xp: 10, locked: true }
];

const STARTER_CONCEPTS = [
  { title: "Python", subtitle: "Daily learning target" },
  { title: "SQL", subtitle: "Daily learning target" },
  { title: "AI / ML / DL", subtitle: "Daily learning target" },
  { title: "Excel", subtitle: "Daily learning target" },
  { title: "Web Development", subtitle: "Daily learning target" }
];

const STARTER_CHALLENGES = [
  { id: "ch-1", title: "30-Day Coding Challenge", category: "Coding", targetDays: 30, completedDays: 12, rewardXp: 500, active: true },
  { id: "ch-2", title: "Read 10 Pages Daily for 30 Days", category: "Reading", targetDays: 30, completedDays: 8, rewardXp: 300, active: true },
  { id: "ch-3", title: "Apply to 30 Tech Jobs", category: "Career", targetDays: 30, completedDays: 15, rewardXp: 400, active: true }
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const PRIORITY_ORDER = { "High": 1, "Medium": 2, "Low": 3 };

function getLevelRankTitle(level) {
  if (level <= 1) return { title: "Novice Ascendant", icon: "🌱", color: "#a0aec0" };
  if (level <= 3) return { title: "Disciplined Seeker", icon: "⚔️", color: "#48bb78" };
  if (level <= 5) return { title: "Consistent Adventurer", icon: "🔥", color: "#ed8936" };
  if (level <= 7) return { title: "Knowledge Builder", icon: "🧠", color: "#4299e1" };
  if (level <= 9) return { title: "Data Warrior", icon: "💻", color: "#9f7aea" };
  if (level <= 14) return { title: "Technical Champion", icon: "⚡", color: "#f5b942" };
  return { title: "Grand Ascended Master", icon: "🚀", color: "#e53e3e" };
}

// --- ONLINE LENDING & EMI MATH HELPERS ---

// Exact monetary EMI calculation (money-safe paise arithmetic)
function calculateEmiInstallments(principalAmount, emiCount, startDate, firstDueDate) {
  const totalPaise = Math.round(Number(principalAmount) * 100);
  const count = Math.max(1, parseInt(emiCount, 10) || 1);
  const basePaise = Math.floor(totalPaise / count);
  const remainderPaise = totalPaise - (basePaise * count);

  const initialDueDate = firstDueDate || startDate || todayStr();
  const installments = [];

  for (let i = 1; i <= count; i++) {
    const paise = (i === count) ? (basePaise + remainderPaise) : basePaise;
    const amount = Number((paise / 100).toFixed(2));

    const baseDate = new Date(initialDueDate + "T00:00:00");
    baseDate.setMonth(baseDate.getMonth() + (i - 1));
    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    const dueDateStr = `${yyyy}-${mm}-${dd}`;

    installments.push({
      installment_number: i,
      due_date: dueDateStr,
      amount: amount,
      paid_amount: 0,
      status: "Pending"
    });
  }
  return installments;
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (!cleaned.startsWith("+") && cleaned.length === 10) {
    cleaned = "+91" + cleaned;
  }
  return cleaned;
}

function deriveInstallmentStatus(inst, todayDate = todayStr()) {
  const amount = Number(inst.amount) || 0;
  const paidAmount = Number(inst.paid_amount) || 0;
  if (paidAmount >= amount && amount > 0) return "Paid";
  if (paidAmount > 0 && paidAmount < amount) return "Partially Paid";
  if (inst.due_date && inst.due_date < todayDate) return "Overdue";
  return inst.status || "Pending";
}

function generateEmiReminderText({ friend_name, emi_number, total_emis, emi_amount, due_date, remaining_amount }) {
  const formattedAmount = Number(emi_amount).toLocaleString('en-IN');
  const formattedRemaining = Number(remaining_amount).toLocaleString('en-IN');
  return `Hey ${friend_name}, just a reminder that your EMI #${emi_number}${total_emis ? ` of ${total_emis}` : ''} of ₹${formattedAmount} is due on ${due_date}. Remaining balance: ₹${formattedRemaining}. Please send it when you get a chance. Thanks!`;
}

function getLocalBackupKey(userId, entity) {
  const uid = userId || "guest";
  return `ascend_online_backup_${uid}_${entity}`;
}

function getLocalBackup(userId, entity, fallback = {}) {
  try {
    const raw = localStorage.getItem(getLocalBackupKey(userId, entity));
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocalBackup(userId, entity, data) {
  try {
    localStorage.setItem(getLocalBackupKey(userId, entity), JSON.stringify(data));
  } catch (e) {}
}

function normalizeQuestSlug(quest) {
  if (!quest) return "";
  if (quest.quest_key) return quest.quest_key;
  if (quest.title) {
    return quest.title.replace(/\s+/g, " ").trim().toLowerCase();
  }
  return quest.id || "";
}

function getBaselineQuestUuid(userId, questKey) {
  if (!userId) return `00000000-0000-4000-8000-${String(questKey).replace(/[^0-9]/g, "").padStart(12, "0")}`;
  const cleanUid = userId.replace(/[^0-9a-f]/gi, "").padEnd(32, "0");
  const numKey = String(questKey || "0").replace(/[^0-9]/g, "").padStart(4, "0");
  return `${cleanUid.slice(0, 8)}-${cleanUid.slice(8, 12)}-4000-a${numKey.slice(0, 3)}-${cleanUid.slice(16, 27)}${numKey.slice(3)}`;
}

function isTaskCompleted(task, dateKey, completions) {
  if (!task || !completions) return false;
  if (task.id && completions[`${task.id}:${dateKey}`]) return true;
  const slug = normalizeQuestSlug(task);
  if (slug && completions[`title:${slug}:${dateKey}`]) return true;
  return false;
}

// Custom Hook for User-Scoped 100% Online Supabase State
function useUserOnlineState(user) {
  const userId = user?.id || null;
  const [state, setState] = useState({
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
    lending: [],
    lending_installments: [],
    lending_payments: [],
    whatsapp_reminders: []
  });
  const [ready, setReady] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [missingTables, setMissingTables] = useState([]);
  const [syncStatus, setSyncStatus] = useState("connecting"); // "synced" | "syncing" | "error" | "connecting" | "db_setup_required"

  const fetchOnlineData = async () => {
    if (!supabase || !userId) {
      setReady(true);
      return;
    }
    setFetching(true);
    setSyncStatus("syncing");
    try {
      const results = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
        supabase.from("task_completions").select("*").eq("user_id", userId),
        supabase.from("books").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("wishlist").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("core_concepts").select("*").eq("user_id", userId).order("sort_order", { ascending: true }),
        supabase.from("side_quests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("dues").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("lending").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("lending_installments").select("*").eq("user_id", userId).order("installment_number", { ascending: true }),
        supabase.from("lending_payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("whatsapp_reminders").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      ]);

      const tableNames = ["tasks", "task_completions", "books", "wishlist", "core_concepts", "side_quests", "dues", "lending", "lending_installments", "lending_payments", "whatsapp_reminders"];
      const missing = [];
      results.forEach((res, idx) => {
        if (res.error && (res.error.code === "PGRST205" || res.status === 404 || (res.error.message && res.error.message.includes("schema cache")))) {
          missing.push(tableNames[idx]);
        }
      });

      if (missing.length > 0) {
        console.warn("⚠️ Missing Supabase tables detected in remote DB:", missing);
        setMissingTables(missing);
        setSyncStatus("db_setup_required");
      } else {
        setMissingTables([]);
      }

      const [
        { data: tasks },
        { data: completions },
        { data: books },
        { data: wishlist },
        { data: concepts },
        { data: sideQuests },
        { data: dues },
        { data: lending },
        { data: installments },
        { data: payments },
        { data: reminders }
      ] = results;

      const backupCompletions = getLocalBackup(userId, "completions", {});
      const compMap = { ...backupCompletions };
      const taskMapById = {};
      (tasks || []).forEach(t => { if (t && t.id) taskMapById[t.id] = t; });

      (completions || []).forEach(c => {
        if (c && c.task_id && c.completed_on) {
          compMap[`${c.task_id}:${c.completed_on}`] = true;
          const matchedTask = taskMapById[c.task_id];
          if (matchedTask && matchedTask.title) {
            const titleSlug = matchedTask.title.trim().toLowerCase();
            compMap[`title:${titleSlug}:${c.completed_on}`] = true;
          }
        }
      });

      let finalTasks = tasks || [];
      
      // Ensure all 9 baseline starter quests exist in finalTasks without duplicating
      const existingKeys = new Set((finalTasks || []).map(t => normalizeQuestSlug(t)));
      const missingBaselineTasks = STARTER_QUESTS
        .filter(q => !existingKeys.has(q.quest_key) && !existingKeys.has(q.title.replace(/\s+/g, " ").trim().toLowerCase()))
        .map((q, idx) => ({
          id: getBaselineQuestUuid(userId, q.quest_key),
          user_id: userId,
          quest_key: q.quest_key,
          title: q.title,
          category: q.category,
          target: q.target,
          xp: q.xp,
          locked: q.locked,
          active: true,
          sort_order: (finalTasks.length || 0) + idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (missingBaselineTasks.length > 0 && userId && !missing.includes("tasks")) {
        console.log(`[ASCEND SYNC] Seeding ${missingBaselineTasks.length} missing baseline quests into Supabase...`);
        let { error: seedErr } = await supabase.from("tasks").upsert(missingBaselineTasks, { onConflict: "id" });
        if (seedErr) {
          console.warn("[ASCEND SYNC] Primary starter tasks seeding warning:", seedErr);
          const fallbackSeed = missingBaselineTasks.map(({ quest_key, ...rest }) => rest);
          const { error: fbErr } = await supabase.from("tasks").upsert(fallbackSeed, { onConflict: "id" });
          if (fbErr) console.error("[ASCEND SYNC] Fallback starter tasks seeding error:", fbErr);
        }
        finalTasks = [...finalTasks, ...missingBaselineTasks];
      }

      // Deduplicate tasks strictly by normalized slug to eliminate any historical duplicate entries
      const seenTaskKeys = new Set();
      const dedupedTasks = [];
      const duplicateTaskIds = [];

      (finalTasks || []).forEach(t => {
        if (!t) return;
        const key = normalizeQuestSlug(t);
        if (seenTaskKeys.has(key)) {
          if (t.id) duplicateTaskIds.push(t.id);
        } else {
          seenTaskKeys.add(key);
          dedupedTasks.push(t);
        }
      });

      if (duplicateTaskIds.length > 0 && userId && supabase) {
        console.log(`[ASCEND SYNC] Purging ${duplicateTaskIds.length} duplicate task IDs from cloud database...`);
        supabase.from("tasks").delete().in("id", duplicateTaskIds).eq("user_id", userId).then(({ error }) => {
          if (error) console.error("[ASCEND SYNC] Error purging duplicate tasks in DB:", error);
          else console.log("[ASCEND SYNC] Duplicate tasks purged successfully from cloud database.");
        });
      }

      finalTasks = dedupedTasks;

      let finalConcepts = concepts || [];
      if (finalConcepts.length === 0 && userId && !missing.includes("core_concepts")) {
        const seedConcepts = STARTER_CONCEPTS.map((c, idx) => ({
          id: getBaselineQuestUuid(userId, `concept_${idx}`),
          user_id: userId,
          title: c.title,
          subtitle: c.subtitle,
          sort_order: idx,
          created_at: new Date().toISOString()
        }));
        const { error: cSeedErr } = await supabase.from("core_concepts").upsert(seedConcepts, { onConflict: "id" });
        if (cSeedErr) console.error("[ASCEND SYNC] Starter concepts DB seeding error:", cSeedErr);
        else finalConcepts = seedConcepts;
      }

      const debtsList = (dues || []).filter(d => (d.type || "owed") === "owed" || d.type === "debt");

      setState({
        tasks: finalTasks.length > 0 ? finalTasks : STARTER_QUESTS.map((q, idx) => ({ id: getBaselineQuestUuid(userId, q.quest_key), quest_key: q.quest_key, title: q.title, category: q.category, target: q.target, xp: q.xp, locked: q.locked, active: true, sort_order: idx })),
        completions: compMap,
        books: books || [],
        wishlist: wishlist || [],
        concepts: finalConcepts.length > 0 ? finalConcepts : STARTER_CONCEPTS.map((c, idx) => ({ id: getBaselineQuestUuid(userId, `concept_${idx}`), title: c.title, subtitle: c.subtitle, sort_order: idx })),
        side_quests: sideQuests || [],
        ai_chat_history: [],
        challenges: STARTER_CHALLENGES,
        daily_focus: {},
        dues: debtsList,
        lending: lending || [],
        lending_installments: installments || [],
        lending_payments: payments || [],
        whatsapp_reminders: reminders || []
      });
      if (missing.length === 0) setSyncStatus("synced");
    } catch (err) {
      console.error("Supabase online data fetch error:", err);
      setSyncStatus("error");
    } finally {
      setFetching(false);
      setReady(true);
    }
  };

  useEffect(() => {
    if (!userId) {
      setState({
        tasks: STARTER_QUESTS.map((q, idx) => ({ id: getBaselineQuestUuid(null, q.quest_key), quest_key: q.quest_key, title: q.title, category: q.category, target: q.target, xp: q.xp, locked: q.locked, active: true, sort_order: idx })),
        completions: {},
        books: [],
        wishlist: [],
        concepts: STARTER_CONCEPTS.map((c, idx) => ({ id: getBaselineQuestUuid(null, `concept_${idx}`), title: c.title, subtitle: c.subtitle, sort_order: idx })),
        side_quests: [],
        ai_chat_history: [],
        challenges: STARTER_CHALLENGES,
        daily_focus: {},
        dues: [],
        lending: [],
        lending_installments: [],
        lending_payments: [],
        whatsapp_reminders: []
      });
      setReady(true);
      setSyncStatus("synced");
      return;
    }

    fetchOnlineData();

    let channel = null;
    if (supabase) {
      setSyncStatus("connecting");
      channel = supabase
        .channel(`ascend-user-sync-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "*", filter: `user_id=eq.${userId}` },
          (payload) => {
            console.log("⚡ Realtime event received:", payload.eventType, payload.table);
            fetchOnlineData();
          }
        )
        .subscribe((status, err) => {
          console.log(`🔌 Realtime subscription status: ${status}`, err || "");
          if (status === "SUBSCRIBED") {
            setSyncStatus("synced");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setSyncStatus("error");
          } else if (status === "CLOSED") {
            setSyncStatus("connecting");
          }
        });

      const handleFocus = () => {
        console.log("Window focused: refetching online state...");
        fetchOnlineData();
      };
      window.addEventListener("focus", handleFocus);

      return () => {
        window.removeEventListener("focus", handleFocus);
        if (channel) supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  return [state, setState, ready, fetchOnlineData, fetching, syncStatus, missingTables];
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
  const [dueModal, setDueModal] = useState(null); // null | { isNew: bool, due?: obj, defaultType?: string }
  const [lendingModal, setLendingModal] = useState(null); // null | { isNew: bool, lending?: obj }
  const [lendingDetailModal, setLendingDetailModal] = useState(null); // null | { lending: obj }
  const [emiPaymentModal, setEmiPaymentModal] = useState(null); // null | { installment: obj, lending: obj }
  const [questSubTab, setQuestSubTab] = useState("main"); // "main" | "side"
  const [notifPermission, setNotifPermission] = useState(() => {
    try {
      return (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "default";
    } catch (e) {
      return "default";
    }
  });
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("ascend_gemini_api_key") || "");

  const [local, setLocal, localReady, fetchOnlineData, isFetchingOnline, syncStatus, missingTables] = useUserOnlineState(user);

  // Service worker registration & online listener & Auth State listener
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
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.get("reset") === "1" || params.get("clear") === "1") && user) {
      if (confirm("⚠️ Clear and Reset all database tracking data for your account?")) {
        clearAllUserData();
      }
    }
  }, [user]);

  // --- QUEST ACTIONS (100% ONLINE CLOUD MUTATIONS) ---
  const activeTasks = useMemo(() => {
    const raw = (local.tasks || []).filter(t => t && typeof t === "object" && t.active !== false);
    const seen = new Set();
    const unique = [];
    raw.forEach(t => {
      const slug = normalizeQuestSlug(t);
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        unique.push(t);
      }
    });
    return unique.sort((a, b) => ((a && a.sort_order) || 0) - ((b && b.sort_order) || 0));
  }, [local.tasks]);

  const toggleTaskCompletion = async (task) => {
    if (!user) {
      alert("Please sign in with Google to complete quests.");
      return;
    }
    const today = todayStr();
    let targetTaskId = task.id;

    // Check if a task with the same title already exists in Supabase DB
    const normTitle = (task.title || "").trim().toLowerCase();
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", user.id);

    const titleMatch = (existingTasks || []).find(t => t.title && t.title.trim().toLowerCase() === normTitle);

    if (titleMatch) {
      targetTaskId = titleMatch.id;
    } else {
      const isStandardUuid = typeof task.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);
      if (!isStandardUuid) {
        targetTaskId = crypto.randomUUID();
      }

      const taskPayload = {
        id: targetTaskId,
        user_id: user.id,
        title: task.title,
        category: task.category || "Main Quest",
        target: task.target || "",
        xp: task.xp || 10,
        locked: !!task.locked,
        active: true,
        sort_order: task.sort_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { error: tErr } = await supabase.from("tasks").upsert([taskPayload], { onConflict: "id" });
      if (tErr) console.error("Failed to insert task before completion:", tErr);
    }

    const key = `${targetTaskId}:${today}`;
    const origKey = `${task.id}:${today}`;
    const isCurrentlyCompleted = !!(local.completions && (local.completions[key] || local.completions[origKey]));

    // 1. Optimistic Local State Update immediately
    setLocal(s => {
      const completions = { ...(s.completions || {}) };
      const titleSlug = task.title ? task.title.trim().toLowerCase() : "";
      const titleKey = titleSlug ? `title:${titleSlug}:${today}` : null;

      if (isCurrentlyCompleted) {
        delete completions[key];
        delete completions[origKey];
        if (titleKey) delete completions[titleKey];
      } else {
        completions[key] = true;
        if (titleKey) completions[titleKey] = true;
      }
      setLocalBackup(user?.id, "completions", completions);
      return {
        ...s,
        tasks: (s.tasks || []).map(t => (t.id === task.id ? { ...t, id: targetTaskId } : t)),
        completions
      };
    });

    // 2. Async Supabase Database Mutation
    if (isCurrentlyCompleted) {
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("task_id", targetTaskId)
        .eq("completed_on", today)
        .eq("user_id", user.id);

      if (error) console.error("Cloud task completion delete error:", error);
    } else {
      const payload = {
        id: crypto.randomUUID(),
        user_id: user.id,
        task_id: targetTaskId,
        completed_on: today,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from("task_completions").insert([payload]);
      if (error) {
        console.error("Cloud task completion insert error:", error);
        alert("⚠️ Cloud sync notice: " + (error.message || "Failed to save completion to cloud database. Ensure SQL tables are created."));
      }
    }
    fetchOnlineData();
  };

  const toggleTaskLock = async (task) => {
    if (!user) return;
    const { error } = await supabase
      .from("tasks")
      .update({ locked: !task.locked, updated_at: new Date().toISOString() })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) console.error("Cloud task lock update error:", error);
    fetchOnlineData();
  };

  const moveTaskOrder = async (index, direction) => {
    if (!user) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeTasks.length) return;
    const itemA = activeTasks[index];
    const itemB = activeTasks[targetIdx];

    if (itemA.locked || itemB.locked) {
      alert("Cannot reorder locked quests. Unlock them first.");
      return;
    }

    const { error: errA } = await supabase
      .from("tasks")
      .update({ sort_order: itemB.sort_order, updated_at: new Date().toISOString() })
      .eq("id", itemA.id)
      .eq("user_id", user.id);

    const { error: errB } = await supabase
      .from("tasks")
      .update({ sort_order: itemA.sort_order, updated_at: new Date().toISOString() })
      .eq("id", itemB.id)
      .eq("user_id", user.id);

    if (errA || errB) console.error("Cloud reorder error:", errA || errB);
    fetchOnlineData();
  };

  const saveQuestModal = async (questData) => {
    if (!user) {
      alert("Please sign in with Google to save quests to your account.");
      return;
    }
    const normTitle = questData.title.trim().toLowerCase();
    const existingTask = (local.tasks || []).find(t => t && t.title && t.title.trim().toLowerCase() === normTitle);

    let taskId = questData.id;
    if (questData.isNew) {
      taskId = existingTask ? existingTask.id : crypto.randomUUID();
    } else {
      taskId = taskId || crypto.randomUUID();
    }

    const payload = {
      id: taskId,
      user_id: user.id,
      title: questData.title.trim(),
      category: questData.category || "Main Quest",
      target: questData.target || "",
      xp: parseInt(questData.xp, 10) || 10,
      locked: !!questData.locked,
      active: true,
      sort_order: questData.isNew ? activeTasks.length : (questData.sort_order || 0),
      updated_at: new Date().toISOString()
    };

    setQuestModal(null);
    const { error } = await supabase.from("tasks").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Cloud quest save error:", error);
      alert("Cloud quest save error: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  const deleteTask = async (taskId) => {
    if (!user) return;
    const task = (local.tasks || []).find(t => t.id === taskId);
    if (!task) return;
    if (task.locked) {
      alert("This quest is locked 🔒. Unlock it on the EDIT QUESTS page before deleting.");
      return;
    }
    const qKey = task.quest_key || null;
    const normTitle = task.title ? task.title.trim().toLowerCase() : "";

    if (confirm(`Are you sure you want to delete "${task.title}" from your Cloud account?`)) {
      console.log(`[ASCEND SYNC] Deleting task id=${taskId}, quest_key=${qKey}, title="${normTitle}" for user=${user.id}`);

      const duplicateIds = (local.tasks || [])
        .filter(t => t && ((qKey && t.quest_key === qKey) || (t.title && t.title.trim().toLowerCase() === normTitle)))
        .map(t => t.id);

      const idsToDelete = duplicateIds.length > 0 ? duplicateIds : [taskId];
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", idsToDelete)
        .eq("user_id", user.id);

      if (error) {
        console.error("[ASCEND SYNC] Cloud quest delete error:", error);
        alert("Failed to delete task from cloud database: " + error.message);
      } else {
        console.log("[ASCEND SYNC] Task deleted successfully from cloud database.");
        fetchOnlineData();
      }
    }
  };

  const purgeDuplicateTasks = async () => {
    if (!user || !supabase) {
      alert("Please sign in with Google to purge cloud duplicates.");
      return;
    }
    const { data: allTasks, error } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", user.id);

    if (error || !allTasks) {
      alert("Error fetching tasks for purge: " + (error?.message || "Unknown error"));
      return;
    }

    const seen = new Set();
    const idsToDelete = [];
    allTasks.forEach(t => {
      if (!t || !t.title) return;
      const slug = t.title.trim().toLowerCase();
      if (seen.has(slug)) {
        idsToDelete.push(t.id);
      } else {
        seen.add(slug);
      }
    });

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase.from("tasks").delete().in("id", idsToDelete);
      if (delErr) {
        console.error("Failed to purge duplicate tasks:", delErr);
        alert("Purge error: " + delErr.message);
      } else {
        alert(`🧹 Successfully purged ${idsToDelete.length} duplicate quest entry/entries from your cloud database!`);
        fetchOnlineData();
      }
    } else {
      alert("✨ No duplicate quests found in your cloud account!");
    }
  };

  const clearAllUserData = async () => {
    if (!confirm("⚠️ DANGER: Are you sure you want to permanently delete ALL saved quests, completions, books, wishlist items, dues, and lending records from your account and start fresh?")) {
      return;
    }

    try {
      if (user && supabase) {
        const tables = [
          "task_completions",
          "tasks",
          "books",
          "wishlist",
          "core_concepts",
          "side_quests",
          "dues",
          "lending_payments",
          "lending_installments",
          "lending",
          "whatsapp_reminders",
          "profile_settings"
        ];

        for (const table of tables) {
          await supabase.from(table).delete().eq("user_id", user.id);
        }

        // Re-seed initial clean 9 baseline starter quests for the user with deterministic UUIDs & quest_key
        const seedTasks = STARTER_QUESTS.map((q, idx) => ({
          id: getBaselineQuestUuid(user.id, q.quest_key),
          user_id: user.id,
          quest_key: q.quest_key,
          title: q.title,
          category: q.category,
          target: q.target,
          xp: q.xp,
          locked: q.locked,
          active: true,
          sort_order: idx,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        let { error: seedErr } = await supabase.from("tasks").upsert(seedTasks, { onConflict: "id" });
        if (seedErr) {
          console.warn("[ASCEND SYNC] Reset starter tasks seeding warning:", seedErr);
          const fallbackSeed = seedTasks.map(({ quest_key, ...rest }) => rest);
          await supabase.from("tasks").upsert(fallbackSeed, { onConflict: "id" });
        }

        const seedConcepts = STARTER_CONCEPTS.map((c, idx) => ({
          id: getBaselineQuestUuid(user.id, `concept_${idx}`),
          user_id: user.id,
          title: c.title,
          subtitle: c.subtitle,
          sort_order: idx,
          created_at: new Date().toISOString()
        }));
        await supabase.from("core_concepts").upsert(seedConcepts, { onConflict: "id" });
      }

      // Clear local backups and storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      alert("🧹 Account successfully reset! All data cleared and fresh starter quests initialized.");
      fetchOnlineData();
      window.location.reload();
    } catch (err) {
      console.error("Reset data error:", err);
      alert("Error resetting data: " + err.message);
    }
  };

  // --- CORE CONCEPTS ACTIONS ---
  const saveConceptModal = async (conceptData) => {
    if (!user) {
      alert("Please sign in with Google to save core concepts.");
      return;
    }
    const conceptId = conceptData.isNew ? crypto.randomUUID() : (conceptData.id || crypto.randomUUID());
    const payload = {
      id: conceptId,
      user_id: user.id,
      title: conceptData.title.trim(),
      subtitle: conceptData.subtitle || "Daily learning target",
      sort_order: conceptData.isNew ? (local.concepts || []).length : (conceptData.sort_order || 0)
    };

    setConceptModal(null);
    const { error } = await supabase.from("core_concepts").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Cloud concept save error:", error);
      alert("Cloud concept save error: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  const deleteConcept = async (conceptId) => {
    if (!user) return;
    if (confirm("Delete this core concept target from your Cloud account?")) {
      const { error } = await supabase.from("core_concepts").delete().eq("id", conceptId).eq("user_id", user.id);
      if (error) console.error("Cloud concept delete error:", error);
      fetchOnlineData();
    }
  };

  // --- SIDE QUEST ACTIONS ---
  const saveSideQuestModal = async (sqData) => {
    if (!user) {
      alert("Please sign in with Google to save side quests.");
      return;
    }
    const sqId = sqData.isNew ? crypto.randomUUID() : (sqData.id || crypto.randomUUID());
    const payload = {
      id: sqId,
      user_id: user.id,
      title: sqData.title.trim(),
      description: sqData.description || "",
      date: sqData.date || todayStr(),
      priority: sqData.priority || "Medium",
      due_time: sqData.due_time || "",
      category: sqData.category || "General",
      completed: !!sqData.completed,
      created_at: sqData.created_at || new Date().toISOString(),
      completed_at: sqData.completed ? (sqData.completed_at || new Date().toISOString()) : null
    };

    setSideQuestModal(null);
    const { error } = await supabase.from("side_quests").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Cloud side quest save error:", error);
      alert("Cloud side quest save error: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  const toggleSideQuestCompletion = async (sqId) => {
    if (!user) return;
    const sq = (local.side_quests || []).find(s => s.id === sqId);
    if (!sq) return;
    const nextState = !sq.completed;

    const { error } = await supabase
      .from("side_quests")
      .update({
        completed: nextState,
        completed_at: nextState ? new Date().toISOString() : null
      })
      .eq("id", sqId)
      .eq("user_id", user.id);

    if (error) console.error("Cloud side quest toggle error:", error);
    fetchOnlineData();
  };

  const deleteSideQuest = async (sqId) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this Side Quest from your Cloud account?")) {
      const { error } = await supabase.from("side_quests").delete().eq("id", sqId).eq("user_id", user.id);
      if (error) console.error("Cloud side quest delete error:", error);
      fetchOnlineData();
    }
  };

  const recoverSideQuest = async (sqId) => {
    if (!user) return;
    if (confirm("Recover this failed quest? You will earn 50% XP without altering past activity records.")) {
      const { error } = await supabase
        .from("side_quests")
        .update({
          completed: true,
          recovered: true,
          completed_at: new Date().toISOString()
        })
        .eq("id", sqId)
        .eq("user_id", user.id);

      if (error) console.error("Cloud side quest recover error:", error);
      fetchOnlineData();
    }
  };

  const updateDailyFocus = async (goal) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      display_name: goal,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from("profile_settings").upsert([payload], { onConflict: "user_id" });
    if (error) console.error("Cloud daily focus update error:", error);
    fetchOnlineData();
  };

  // --- BOOK ACTIONS ---
  const saveBookModal = async (bookData) => {
    if (!user) {
      alert("Please sign in with Google to save books to your cloud library.");
      return;
    }
    const bookId = bookData.isNew ? crypto.randomUUID() : (bookData.id || crypto.randomUUID());
    const payload = {
      id: bookId,
      user_id: user.id,
      title: bookData.title.trim(),
      author: bookData.author || "",
      start_date: bookData.start_date || todayStr(),
      completed_date: bookData.completed_date || null,
      current_page: parseInt(bookData.current_page, 10) || 0,
      total_pages: parseInt(bookData.total_pages, 10) || 0,
      status: bookData.status || "Reading",
      notes: bookData.notes || ""
    };

    setBookModal(null);
    const { error } = await supabase.from("books").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Cloud book save error:", error);
      alert("Cloud book save error: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  const deleteBook = async (bookId) => {
    if (!user) return;
    if (confirm("Delete this book entry from your Cloud account?")) {
      const { error } = await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);
      if (error) console.error("Cloud book delete error:", error);
      fetchOnlineData();
    }
  };

  // --- WISHLIST ACTIONS ---
  const saveWishlistModal = async (itemData) => {
    if (!user) {
      alert("Please sign in with Google to save wishlist items.");
      return;
    }
    const itemId = itemData.isNew ? crypto.randomUUID() : (itemData.id || crypto.randomUUID());
    const payload = {
      id: itemId,
      user_id: user.id,
      item: itemData.item.trim(),
      category: itemData.category || "General",
      estimated_cost: parseFloat(itemData.estimated_cost) || 0,
      priority: itemData.priority || "Medium",
      purchased: !!itemData.purchased,
      notes: itemData.notes || ""
    };

    setWishlistModal(null);
    const { error } = await supabase.from("wishlist").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Cloud wishlist save error:", error);
      alert("Cloud wishlist save error: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  const deleteWishlistItem = async (itemId) => {
    if (!user) return;
    if (confirm("Delete this wishlist item from your Cloud account?")) {
      const { error } = await supabase.from("wishlist").delete().eq("id", itemId).eq("user_id", user.id);
      if (error) console.error("Cloud wishlist delete error:", error);
      fetchOnlineData();
    }
  };

  // --- DUES & LENDING ACTIONS (100% DIRECT ONLINE CLOUD MUTATIONS) ---
  const saveDueModal = async (dueData) => {
    if (!user) {
      alert("Please sign in with Google to save debt records to your account.");
      return;
    }
    const dueId = dueData.isNew ? crypto.randomUUID() : (dueData.id || crypto.randomUUID());
    const status = (dueData.status === "Settled" || dueData.status === "Paid") ? "Paid" : "Pending";

    const payload = {
      id: dueId,
      user_id: user.id,
      type: "owed",
      person_name: dueData.person_name,
      original_amount: Number(dueData.original_amount) || 0,
      amount_paid: Number(dueData.amount_paid) || 0,
      date: dueData.date || todayStr(),
      due_date: dueData.due_date || null,
      reason: dueData.reason || "",
      status: status,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("dues").upsert([payload], { onConflict: "id" });
    if (error) {
      console.error("Supabase dues upsert error:", error);
      alert("Cloud save error: " + error.message);
    } else {
      setDueModal(null);
      fetchOnlineData();
    }
  };

  const deleteDue = async (dueId) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this debt record from your Cloud account?")) {
      const { error } = await supabase.from("dues").delete().eq("id", dueId).eq("user_id", user.id);
      if (error) {
        console.error("Supabase dues delete error:", error);
        alert("Cloud delete error: " + error.message);
      } else {
        fetchOnlineData();
      }
    }
  };

  const logPaymentDue = async (due) => {
    if (!user) return;
    const remaining = Math.max(0, (Number(due.original_amount) || 0) - (Number(due.amount_paid) || 0));
    const input = prompt(`Enter payment amount paid for ${due.person_name} (Remaining: ₹${remaining}):`, remaining);
    if (input === null) return;
    const amount = Number(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid payment amount.");
      return;
    }
    const newPaid = (Number(due.amount_paid) || 0) + amount;
    const isSettled = newPaid >= (Number(due.original_amount) || 0);

    const { error } = await supabase
      .from("dues")
      .update({
        amount_paid: newPaid,
        status: isSettled ? "Paid" : "Pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", due.id)
      .eq("user_id", user.id);

    if (error) {
      alert("Error updating payment: " + error.message);
    } else {
      fetchOnlineData();
    }
  };

  // --- LENDING EMI ACTIONS ---
  const saveLendingModal = async (lendingData) => {
    if (!user) {
      alert("Please sign in with Google to save lending records to your account.");
      return;
    }

    const lendingId = lendingData.id || crypto.randomUUID();
    const principal = Number(lendingData.principal_amount) || 0;
    const emiCount = Math.max(1, parseInt(lendingData.emi_count, 10) || 1);
    const interestAmount = Number(lendingData.interest_amount) || 0;
    const totalRepayment = principal + interestAmount;

    const lendingPayload = {
      id: lendingId,
      user_id: user.id,
      person_name: lendingData.person_name,
      phone_number: normalizePhoneNumber(lendingData.phone_number),
      whatsapp_number: normalizePhoneNumber(lendingData.whatsapp_number || lendingData.phone_number),
      principal_amount: principal,
      interest_enabled: !!lendingData.interest_enabled,
      interest_type: lendingData.interest_type || "flat",
      interest_rate: Number(lendingData.interest_rate) || 0,
      interest_amount: interestAmount,
      total_repayment: totalRepayment,
      emi_enabled: true,
      emi_count: emiCount,
      start_date: lendingData.start_date || todayStr(),
      first_due_date: lendingData.first_due_date || lendingData.start_date || todayStr(),
      status: "Active",
      notes: lendingData.notes || "",
      updated_at: new Date().toISOString()
    };

    const { error: lendingErr } = await supabase.from("lending").upsert([lendingPayload], { onConflict: "id" });
    if (lendingErr) {
      console.error("Supabase lending save error:", lendingErr);
      alert("Cloud save error: " + lendingErr.message);
      return;
    }

    // Generate exact money-safe EMI schedule
    const installments = calculateEmiInstallments(
      principal,
      emiCount,
      lendingData.start_date || todayStr(),
      lendingData.first_due_date || lendingData.start_date || todayStr()
    );

    // Delete existing installments if editing, then bulk insert generated installments
    await supabase.from("lending_installments").delete().eq("lending_id", lendingId).eq("user_id", user.id);

    const installmentPayloads = installments.map(inst => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      lending_id: lendingId,
      installment_number: inst.installment_number,
      due_date: inst.due_date,
      amount: inst.amount,
      paid_amount: 0,
      status: "Pending",
      updated_at: new Date().toISOString()
    }));

    const { error: instErr } = await supabase.from("lending_installments").insert(installmentPayloads);
    if (instErr) {
      console.error("Supabase installment schedule creation error:", instErr);
      alert("Schedule creation error: " + instErr.message);
      return;
    }

    setLendingModal(null);
    fetchOnlineData();
  };

  const deleteLending = async (lendingId) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this lending record and its complete EMI schedule?")) {
      const { error } = await supabase.from("lending").delete().eq("id", lendingId).eq("user_id", user.id);
      if (error) {
        console.error("Supabase lending delete error:", error);
        alert("Delete error: " + error.message);
      } else {
        fetchOnlineData();
      }
    }
  };

  const logEmiInstallmentPayment = async (installmentId, amountPaid, notes = "") => {
    if (!user) {
      alert("Please sign in to log payments.");
      return;
    }

    const inst = (local.lending_installments || []).find(i => i.id === installmentId);
    if (!inst) return;

    const currentPaid = Number(inst.paid_amount) || 0;
    const payAmt = Number(amountPaid) || 0;
    if (payAmt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const newPaid = currentPaid + payAmt;
    const totalInstAmount = Number(inst.amount) || 0;
    const isPaid = newPaid >= totalInstAmount;
    const newStatus = isPaid ? "Paid" : "Partially Paid";

    // 1. Insert into lending_payments
    const paymentPayload = {
      id: crypto.randomUUID(),
      user_id: user.id,
      lending_id: inst.lending_id,
      installment_id: inst.id,
      amount: payAmt,
      payment_date: todayStr(),
      notes: notes,
      updated_at: new Date().toISOString()
    };

    const { error: pErr } = await supabase.from("lending_payments").insert([paymentPayload]);
    if (pErr) {
      console.error("Payment insert error:", pErr);
      alert("Payment log error: " + pErr.message);
      return;
    }

    // 2. Update installment row
    const { error: instErr } = await supabase.from("lending_installments").update({
      paid_amount: newPaid,
      status: newStatus,
      paid_at: isPaid ? new Date().toISOString() : inst.paid_at,
      updated_at: new Date().toISOString()
    }).eq("id", inst.id).eq("user_id", user.id);

    if (instErr) console.error("Installment update error:", instErr);

    // 3. Check if all installments for this lending record are now Paid
    const allInsts = (local.lending_installments || []).filter(i => i.lending_id === inst.lending_id);
    const allCompleted = allInsts.every(i => (i.id === inst.id ? isPaid : i.status === "Paid"));
    if (allCompleted) {
      await supabase.from("lending").update({
        status: "Completed",
        updated_at: new Date().toISOString()
      }).eq("id", inst.lending_id).eq("user_id", user.id);
    }

    setEmiPaymentModal(null);
    fetchOnlineData();
  };

  const sendWhatsAppReminderAction = async (inst, lendingRec) => {
    if (!lendingRec) return;
    const friendName = lendingRec.person_name;
    const rawPhone = lendingRec.whatsapp_number || lendingRec.phone_number;
    const cleanPhone = normalizePhoneNumber(rawPhone);

    const totalLent = Number(lendingRec.principal_amount) || 0;
    const allInsts = (local.lending_installments || []).filter(i => i.lending_id === lendingRec.id);
    const totalPaid = allInsts.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
    const remainingTotal = Math.max(0, totalLent - totalPaid);

    const messageText = generateEmiReminderText({
      friend_name: friendName,
      emi_number: inst.installment_number,
      total_emis: lendingRec.emi_count,
      emi_amount: inst.amount,
      due_date: inst.due_date,
      remaining_amount: remainingTotal
    });

    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      if (session) {
        const response = await fetch("/api/send-whatsapp-reminder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            lending_id: lendingRec.id,
            installment_id: inst.id,
            reminder_type: "due_date",
            friend_name: friendName,
            whatsapp_number: cleanPhone,
            emi_number: inst.installment_number,
            emi_amount: inst.amount,
            due_date: inst.due_date,
            remaining_amount: remainingTotal
          })
        });

        const resData = await response.json();
        if (resData.success && resData.configured) {
          alert(resData.already_sent ? "WhatsApp reminder was already sent for this installment!" : "WhatsApp reminder sent successfully via Meta Cloud API!");
          fetchOnlineData();
          return;
        }
      }
    } catch (e) {
      console.warn("API reminder dispatch warning, launching wa.me link:", e);
    }

    const waUrl = `https://wa.me/${cleanPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");
  };

  // --- PUSH NOTIFICATION REMINDERS FOR DUES (PRE-DUE DEADLINE - DEFAULT 10 MIN) ---
  useEffect(() => {
    if (notifPermission !== "granted") return;
    if (!local.dues || local.dues.length === 0) return;

    const checkDueReminders = () => {
      const now = new Date();
      const activeDues = local.dues || [];

      activeDues.forEach(d => {
        if (d.status === "Settled" || !d.due_date) return;

        const dueTimeFormatted = d.due_time ? (d.due_time.length === 5 ? `${d.due_time}:00` : d.due_time) : "09:00:00";
        const dueDateTimeStr = `${d.due_date}T${dueTimeFormatted}`;
        const dueTimeMs = new Date(dueDateTimeStr).getTime();
        if (isNaN(dueTimeMs)) return;

        let leadMs = 10 * 60 * 1000; // Default 10 minutes pre-due
        if (d.notify_lead === "15m") leadMs = 15 * 60 * 1000;
        if (d.notify_lead === "1h") leadMs = 60 * 60 * 1000;
        if (d.notify_lead === "1d") leadMs = 24 * 60 * 60 * 1000;
        if (d.notify_lead === "none") return;

        const triggerTimeMs = dueTimeMs - leadMs;
        const diffMs = triggerTimeMs - now.getTime();

        if (diffMs <= 0 && diffMs >= -120000) {
          const storageKey = `due_notified_${d.id}_${d.due_date}_${d.due_time || ''}`;
          if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, "true");

            const remaining = Math.max(0, (Number(d.original_amount) || 0) - (Number(d.amount_paid) || 0));
            const title = d.is_emi
              ? (d.type === "lent" ? `💸 EMI Lent Due in 10m: ${d.person_name}` : `💳 Debt EMI Due in 10m: ${d.person_name}`)
              : (d.type === "lent" ? `💸 Money Lent Due in 10m: ${d.person_name}` : `💳 Debt Due in 10m: ${d.person_name}`);

            const body = d.is_emi
              ? `Installment ${(Number(d.emis_paid) || 0) + 1} of ${d.total_emis || '?'} (₹${d.emi_amount || remaining}) is due at ${d.due_time || d.due_date}.`
              : `Remaining balance: ₹${remaining}. Due at ${d.due_time || d.due_date}. Open Ascend to log payment.`;

            const options = {
              body,
              icon: "/icon-192.png",
              badge: "/favicon-32.png",
              tag: `due-reminder-${d.id}`,
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

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 20000);
    return () => clearInterval(interval);
  }, [local.dues, notifPermission]);

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
  const logReadingTenPages = async () => {
    if (!user) return;
    const activeBook = (local.books || []).find(b => b.status === "Reading") || (local.books || [])[0];
    if (activeBook) {
      const newPage = (activeBook.current_page || 0) + 10;
      const isComplete = activeBook.total_pages > 0 && newPage >= activeBook.total_pages;

      const { error } = await supabase
        .from("books")
        .update({
          current_page: newPage,
          status: isComplete ? "Completed" : activeBook.status,
          completed_date: isComplete ? todayStr() : activeBook.completed_date
        })
        .eq("id", activeBook.id)
        .eq("user_id", user.id);

      if (error) console.error("Cloud book reading log error:", error);
    }
    const readQuest = activeTasks.find(t => t.title.toLowerCase().includes("read 10 pages"));
    if (readQuest) {
      const key = `${readQuest.id}:${todayStr()}`;
      if (!local.completions[key]) {
        toggleTaskCompletion(readQuest);
      }
    }
    fetchOnlineData();
  };

  // --- CALCULATED STATS & ANALYTICS ---
  const todayCompletionsCount = useMemo(() => {
    const completions = local.completions || {};
    return activeTasks.filter(t => isTaskCompleted(t, todayStr(), completions)).length;
  }, [activeTasks, local.completions]);

  const completionPct = activeTasks.length ? Math.round((todayCompletionsCount / activeTasks.length) * 100) : 0;
  
  const todayXp = useMemo(() => {
    const completions = local.completions || {};
    return activeTasks
      .filter(t => isTaskCompleted(t, todayStr(), completions))
      .reduce((acc, t) => acc + ((t && t.xp) || 10), 0);
  }, [activeTasks, local.completions]);

  // Level logic: level = floor(Total Cumulative XP / 100) + 1
  const totalXpAllTime = useMemo(() => {
    let total = 0;
    const completions = local.completions || {};
    const tasks = local.tasks || [];
    Object.keys(completions).forEach(k => {
      if (completions[k] && typeof k === "string" && !k.startsWith("title:")) {
        const [taskId] = k.split(":");
        const task = tasks.find(t => t && t.id === taskId);
        total += task ? (task.xp || 10) : 10;
      }
    });
    // Side Quests XP (+10 Low, +20 Medium, +30 High, half XP if recovered)
    (local.side_quests || []).forEach(sq => {
      if (sq && sq.completed) {
        const base = sq.priority === "High" ? 30 : sq.priority === "Medium" ? 20 : 10;
        const xp = sq.recovered ? Math.floor(base / 2) : base;
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
    const completions = local.completions || {};
    
    // Check backwards day by day (capped at 365 days max)
    let loopGuard = 0;
    while (loopGuard++ < 365) {
      const dateKey = checkDate.toISOString().slice(0, 10);
      const dayDone = activeTasks.some(t => isTaskCompleted(t, dateKey, completions));
      if (dayDone) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not done yet, allow checking yesterday before breaking current streak
        if (dateKey === todayStr() && currentStreak === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayKey = checkDate.toISOString().slice(0, 10);
          if (activeTasks.some(t => isTaskCompleted(t, yesterdayKey, completions))) {
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
      const dayDone = activeTasks.some(t => isTaskCompleted(t, key, completions));
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
          <div
            className={`networkBadge ${syncStatus === "synced" ? "online" : syncStatus === "syncing" ? "syncing" : "offline"}`}
            title="Realtime sync status with Supabase single source of truth"
          >
            {syncStatus === "synced" ? (
              <Cloud size={14} />
            ) : syncStatus === "syncing" ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <WifiOff size={14} />
            )}
            <span>
              {syncStatus === "synced"
                ? "🟢 Realtime Synced"
                : syncStatus === "syncing"
                ? "🟡 Syncing Cloud..."
                : "🔴 Sync Degraded"}
            </span>
          </div>

          {user ? (
            <div className="userBadge">
              <span className="userEmail">{user.email}</span>
              <button className="iconBtn dangerHover" onClick={clearAllUserData} title="Reset Vault & Clear All Data Freshly 🧹">
                <Trash2 size={16} color="#ef4444" />
              </button>
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
          { id: "dues", label: "Dues 💸", icon: <Wallet size={16} /> },
          { id: "analytics", label: "Analytics & Insights", icon: <BarChart2 size={16} /> },
          { id: "ai", label: "Ascend AI 🤖", icon: <Sparkles size={16} /> },
          { id: "history", label: "Quest History 📜", icon: <CalendarDays size={16} /> },
          { id: "achievements", label: "Achievements 🏆", icon: <Trophy size={16} /> },
          { id: "ascension", label: "Ascension 🗺️", icon: <Target size={16} /> },
          { id: "challenges", label: "Challenges 🎯", icon: <Shield size={16} /> },
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

      {missingTables.length > 0 && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid #ef4444",
          color: "#fca5a5",
          padding: "12px 20px",
          margin: "12px 20px 0 20px",
          borderRadius: "10px",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}>
          <div>
            <strong style={{ fontSize: "14px", color: "#f87171" }}>⚠️ Database Tables Missing in Remote Supabase Project!</strong>
            <div style={{ marginTop: "4px", fontSize: "12px", color: "#cbd5e1" }}>
              The following user tables do not exist yet on your live Supabase project (<code>vpfuiifncfzndkxstrwe.supabase.co</code>): <strong>{missingTables.join(", ")}</strong>.
              <br />
              Open your <a href="https://supabase.com/dashboard/project/vpfuiifncfzndkxstrwe/sql" target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", fontWeight: "600" }}>Supabase SQL Editor</a> and run the contents of <code>supabase.sql</code> to create tables & enable Realtime sync!
            </div>
          </div>
          <button
            onClick={() => fetchOnlineData()}
            className="primaryBtn smallBtn"
            style={{ whiteSpace: "nowrap", padding: "6px 14px", fontSize: "12px" }}
          >
            Retry Connection 🔄
          </button>
        </div>
      )}

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
          updateDailyFocus={updateDailyFocus}
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
          onPurgeDuplicates={purgeDuplicateTasks}
        />
      )}

      {tab === "dues" && (
        <DuesView
          dues={local.dues || []}
          lending={local.lending || []}
          lendingInstallments={local.lending_installments || []}
          lendingPayments={local.lending_payments || []}
          onOpenLendingModal={(data) => setLendingModal(data)}
          onOpenLendingDetailModal={(lendingRec) => setLendingDetailModal({ lending: lendingRec })}
          onOpenEmiPaymentModal={(inst, lendingRec) => setEmiPaymentModal({ installment: inst, lending: lendingRec })}
          onDeleteLending={deleteLending}
          onOpenDueModal={setDueModal}
          onDeleteDue={deleteDue}
          onLogPaymentDue={logPaymentDue}
          onSendWhatsAppReminder={sendWhatsAppReminderAction}
        />
      )}

      {tab === "history" && (
        <HistoryView
          local={local}
          recoverSideQuest={recoverSideQuest}
        />
      )}

      {tab === "achievements" && (
        <AchievementsView
          local={local}
          streakStats={streakStats}
          totalXpAllTime={totalXpAllTime}
          currentLevel={currentLevel}
        />
      )}

      {tab === "ascension" && (
        <AscensionJourneyView
          currentLevel={currentLevel}
          totalXpAllTime={totalXpAllTime}
        />
      )}

      {tab === "challenges" && (
        <ChallengesView
          local={local}
          setLocal={setLocal}
        />
      )}

      {tab === "ai" && (
        <AscendAiView
          local={local}
          setLocal={setLocal}
          streakStats={streakStats}
          totalXpAllTime={totalXpAllTime}
          geminiKey={geminiKey}
          setGeminiKey={setGeminiKey}
          onNavigate={setTab}
          onOpenSideQuestModal={setSideQuestModal}
        />
      )}

      {tab === "reading" && (
        <ReadingView
          user={user}
          books={local.books || []}
          onOpenBookModal={setBookModal}
          logReadingTenPages={logReadingTenPages}
          fetchOnlineData={fetchOnlineData}
        />
      )}

      {tab === "wishlist" && (
        <WishlistView
          user={user}
          wishlist={local.wishlist || []}
          onOpenWishlistModal={setWishlistModal}
          fetchOnlineData={fetchOnlineData}
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
          syncWithCloud={fetchOnlineData}
          syncing={syncStatus === "syncing" || isFetchingOnline}
          notifPermission={notifPermission}
          requestNotificationPermission={requestNotificationPermission}
          geminiKey={geminiKey}
          setGeminiKey={setGeminiKey}
          handleGoogleLogin={handleGoogleLogin}
          handleLogout={handleLogout}
          onClearAllData={clearAllUserData}
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
          onSave={saveBookModal}
        />
      )}

      {wishlistModal && (
        <WishlistModal
          modalData={wishlistModal}
          onClose={() => setWishlistModal(null)}
          onSave={saveWishlistModal}
        />
      )}

      {dueModal && (
        <DueModal
          modalData={dueModal}
          onClose={() => setDueModal(null)}
          onSave={saveDueModal}
        />
      )}

      {lendingModal && (
        <LendingModal
          modalData={lendingModal}
          onClose={() => setLendingModal(null)}
          onSave={saveLendingModal}
        />
      )}

      {lendingDetailModal && (
        <LendingDetailModal
          lending={lendingDetailModal.lending}
          installments={(local.lending_installments || []).filter(i => i.lending_id === lendingDetailModal.lending.id)}
          payments={(local.lending_payments || []).filter(p => p.lending_id === lendingDetailModal.lending.id)}
          onClose={() => setLendingDetailModal(null)}
          onOpenEmiPaymentModal={(inst) => setEmiPaymentModal({ installment: inst, lending: lendingDetailModal.lending })}
          onSendWhatsAppReminder={(inst) => sendWhatsAppReminderAction(inst, lendingDetailModal.lending)}
        />
      )}

      {emiPaymentModal && (
        <EmiPaymentModal
          installment={emiPaymentModal.installment}
          lending={emiPaymentModal.lending}
          onClose={() => setEmiPaymentModal(null)}
          onConfirm={(instId, amt, notes) => logEmiInstallmentPayment(instId, amt, notes)}
        />
      )}

      <footer className="appFooter">
        <div className="footerInner">
          <div className="footerBrandRow">
            <div className="footerLogoGroup">
              <img src="/favicon-16.png" alt="Project Ascend Logo" className="footerLogoImg" />
              <span className="footerBrandName">PROJECT <span>ASCEND</span></span>
            </div>
            <span className="footerTagline">A game where your real life is the game.</span>
          </div>

          <div className="footerMetaRow">
            <span className="footerPill">⚡ Offline-First PWA</span>
            <span className="footerPill">🛡️ IndexedDB v4</span>
            <span className="footerPill">🚀 Vercel Live OS</span>
          </div>

          <div className="footerCopyright">
            <span>© {new Date().getFullYear()} PROJECT ASCEND • Personal Productivity RPG</span>
          </div>
        </div>
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
  onNavigate, sideQuests, toggleSideQuestCompletion, onOpenSideQuestModal, onNavigateToSideQuests, updateDailyFocus
}) {
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const activeBook = local.books.find(b => b.status === "Reading") || local.books[0];
  const rankInfo = getLevelRankTitle(currentLevel);
  const todayFocusGoal = (local.daily_focus || {})[todayStr()] || "";
  const [focusInput, setFocusInput] = useState(todayFocusGoal);

  const todaySideQuests = useMemo(() => {
    const filtered = (sideQuests || []).filter(sq => sq.date === todayStr());
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pA = PRIORITY_ORDER[a.priority] || 2;
      const pB = PRIORITY_ORDER[b.priority] || 2;
      if (pA !== pB) return pA - pB;
      if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
      if (a.due_time) return -1;
      if (b.due_time) return 1;
      return 0;
    });
  }, [sideQuests]);

  const todaySideQuestsDone = todaySideQuests.filter(sq => sq.completed).length;
  const sidePct = todaySideQuests.length ? Math.round((todaySideQuestsDone / todaySideQuests.length) * 100) : 0;

  return (
    <main className="viewContainer fade-in">
      {/* TODAY'S ASCENSION HERO RPG CARD */}
      <section className="heroCard">
        <div className="heroInfo">
          <div className="eyebrowText">
            <Calendar size={13} />
            <span>TODAY • {formattedDate.toUpperCase()}</span>
          </div>
          <h1>
            TODAY'S ASCENSION<br />
            <span>{rankInfo.icon} {rankInfo.title.toUpperCase()}</span>
          </h1>
          <p className="heroDesc">
            A game where your real life is the game. Complete daily responsibilities to level up.
          </p>

          {/* LEVEL BAR WIDGET */}
          <div className="levelWidget">
            <div className="levelBadge" style={{ background: rankInfo.color }}>LEVEL {currentLevel} • {rankInfo.title}</div>
            <div className="levelBarContainer">
              <div className="levelBarFill" style={{ width: `${levelProgress}%` }}></div>
            </div>
            <span className="levelXpText">{levelProgress} / 100 XP to Level {currentLevel + 1}</span>
          </div>

          {/* DUAL QUEST PROGRESS BARS */}
          <div className="dualProgressRow" style={{ marginTop: 14 }}>
            <div className="miniProgGroup">
              <small>Main Quests ({todayCompletionsCount}/{tasks.length})</small>
              <div className="levelBarContainer">
                <div className="levelBarFill" style={{ width: `${completionPct}%`, background: '#f5b942' }}></div>
              </div>
              <span>{completionPct}%</span>
            </div>
            <div className="miniProgGroup">
              <small>Side Quests ({todaySideQuestsDone}/{todaySideQuests.length})</small>
              <div className="levelBarContainer">
                <div className="levelBarFill" style={{ width: `${sidePct}%`, background: '#48bb78' }}></div>
              </div>
              <span>{sidePct}%</span>
            </div>
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

      {/* TODAY'S FOCUS CARD */}
      <section className="glassPanel marginTop" style={{ padding: "16px 20px" }}>
        <div className="panelHeader" style={{ marginBottom: 8 }}>
          <div>
            <h3>🎯 TODAY'S PRIMARY FOCUS</h3>
            <span className="panelSub">Identify your single most critical objective for today</span>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); updateDailyFocus(focusInput); }} className="focusInputRow">
          <input
            type="text"
            placeholder="e.g. Finish AI/ML learning module & submit application"
            value={focusInput}
            onChange={(e) => setFocusInput(e.target.value)}
            onBlur={() => updateDailyFocus(focusInput)}
            className="focusInput"
          />
          <button type="submit" className="primaryBtn smallBtn">
            <span>Set Focus</span>
          </button>
        </form>
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
                const isDone = isTaskCompleted(task, todayStr(), local.completions);
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
// RAG KNOWLEDGE SYNTHESIZER & AI ENGINE
// ==========================================
function buildUserRagContext(local, streakStats, totalXpAllTime) {
  const today = todayStr();
  const currentLevel = Math.floor(totalXpAllTime / 100) + 1;
  const xpInLevel = totalXpAllTime % 100;
  const xpNeeded = 100 - xpInLevel;

  // Main Quests Summary
  const mainQuestsList = (local.tasks || []).map(t => {
    const isDone = !!local.completions[`${t.id}:${today}`];
    return `- ${t.title} [Category: ${t.category || 'General'}, XP: +${t.xp || 10}, Status: ${isDone ? '✅ Completed Today' : '⏳ Pending Today'}, Locked: ${t.locked ? 'Yes' : 'No'}]`;
  }).join("\n");

  // Side Quests Summary (Today & Upcoming)
  const sideQuestsList = (local.side_quests || []).map(sq => {
    const isToday = sq.date === today;
    return `- ${sq.title} [Date: ${sq.date} ${isToday ? '(TODAY)' : ''}, Priority: ${sq.priority}, Due: ${sq.due_time || 'No Time'}, Category: ${sq.category || 'General'}, Status: ${sq.completed ? '✅ Completed' : '⏳ Pending'}${sq.description ? `, Details: "${sq.description}"` : ''}]`;
  }).join("\n");

  // Reading Center Summary
  const booksList = (local.books || []).map(b => {
    const pct = b.total_pages ? Math.round((b.current_page / b.total_pages) * 100) : 0;
    return `- "${b.title}" by ${b.author || 'Unknown'} [Status: ${b.status}, Progress: Page ${b.current_page} of ${b.total_pages || '?'} (${pct}%), Notes: "${b.notes || 'None'}"]`;
  }).join("\n");

  // Wishlist Summary
  const wishlistList = (local.wishlist || []).map(w => {
    return `- ${w.item} [Category: ${w.category || 'General'}, Cost: ₹${w.estimated_cost || 0}, Priority: ${w.priority}, Status: ${w.purchased ? '✅ Purchased' : '⏳ Pending'}]`;
  }).join("\n");

  // Core Concepts Summary
  const conceptsList = (local.concepts || []).map(c => `- ${c.title}: ${c.subtitle || 'Daily target'}`).join("\n");

  return `
=== USER PROFILE & STATS ===
- Today's Date: ${today}
- Character Level: Level ${currentLevel} (${totalXpAllTime} Total Cumulative XP)
- XP Progress: ${xpInLevel}/100 XP (${xpNeeded} XP needed for Level ${currentLevel + 1})
- Streak Stats: ${streakStats.currentStreak} Days Current Streak (Best: ${streakStats.maxStreak} Days)

=== MAIN QUESTS (DAILY ROUTINES) ===
${mainQuestsList || 'No main quests setup.'}

=== SIDE QUESTS (DATE-SPECIFIC TASKS & ERRANDS) ===
${sideQuestsList || 'No side quests recorded.'}

=== READING COMMAND CENTER ===
${booksList || 'No books in library.'}

=== WISHLIST TARGETS ===
${wishlistList || 'No wishlist items.'}

=== CORE CONCEPTS ROTATION ===
${conceptsList || 'No core concepts.'}
`.trim();
}

function queryOfflineAscendAi(queryText, ragContext, local, streakStats, totalXpAllTime) {
  const query = queryText.toLowerCase();
  const today = todayStr();
  const currentLevel = Math.floor(totalXpAllTime / 100) + 1;
  const xpInLevel = totalXpAllTime % 100;
  const xpNeeded = 100 - xpInLevel;

  const sideQuests = local.side_quests || [];
  const mainQuests = local.tasks || [];
  const books = local.books || [];
  const wishlist = local.wishlist || [];

  // Query: Today's side quests / pending side quests
  if (query.includes("side quest") || query.includes("temporary task") || query.includes("errand") || query.includes("due")) {
    const todaySide = sideQuests.filter(sq => sq.date === today);
    const pendingSide = todaySide.filter(sq => !sq.completed);
    const highSide = pendingSide.filter(sq => sq.priority === "High");

    if (todaySide.length === 0) {
      return `⚔️ **No Side Quests Scheduled for Today (${today})**\n\nYour battlefield is clear for today! You can add a new temporary task anytime using the **+ Add Side Quest** button on the Dashboard or Quests Center.`;
    }

    let response = `⚔️ **Today's Side Quests Summary (${today})**\n\n`;
    response += `You have **${todaySide.length} total side quests** today (**${todaySide.length - pendingSide.length} completed**, **${pendingSide.length} pending**).\n\n`;

    if (highSide.length > 0) {
      response += `🔥 **High Priority Pending (${highSide.length})**:\n`;
      highSide.forEach(sq => {
        response += `- **${sq.title}** ${sq.due_time ? `(⏰ Due ${sq.due_time})` : ''} [+30 XP]\n`;
      });
      response += `\n`;
    }

    if (pendingSide.length > 0) {
      response += `⏳ **All Pending Side Quests**:\n`;
      pendingSide.forEach(sq => {
        response += `- [${sq.priority}] **${sq.title}** ${sq.due_time ? `(⏰ ${sq.due_time})` : ''}\n`;
      });
    } else {
      response += `🎉 **All side quests for today are COMPLETED! Great work hero!**`;
    }

    return response;
  }

  // Query: Level / XP / Stats / Streak
  if (query.includes("level") || query.includes("xp") || query.includes("streak") || query.includes("stat")) {
    return `🏆 **Character Stats & Level Progress**\n\n` +
      `- **Current Level**: **Level ${currentLevel}**\n` +
      `- **Total Cumulative XP**: **${totalXpAllTime} XP**\n` +
      `- **Next Level**: Need **${xpNeeded} XP** to reach Level ${currentLevel + 1} (${xpInLevel}/100 XP)\n` +
      `- **Daily Streak**: **${streakStats.currentStreak} Days** (Best Record: ${streakStats.maxStreak} Days)\n\n` +
      `💡 *Tip: Complete High Priority Side Quests (+30 XP) or Main Quests (+10 XP) to level up faster!*`;
  }

  // Query: Reading / Book
  if (query.includes("read") || query.includes("book") || query.includes("page") || query.includes("library")) {
    if (books.length === 0) {
      return `📚 **Reading Command Center**\n\nNo books tracked in your library yet. Navigate to the **Reading Center** tab to add a book!`;
    }
    const readingBook = books.find(b => b.status === "Reading") || books[0];
    const pct = readingBook.total_pages ? Math.round((readingBook.current_page / readingBook.total_pages) * 100) : 0;

    let resp = `📚 **Reading Library Progress**\n\n`;
    resp += `📖 **Active Focus**: "${readingBook.title}" ${readingBook.author ? `by ${readingBook.author}` : ''}\n`;
    resp += `- **Page Progress**: Page **${readingBook.current_page}** of **${readingBook.total_pages || '?'}** (${pct}% completed)\n`;
    resp += `- **Status**: ${readingBook.status}\n`;
    if (readingBook.notes) resp += `- **Notes**: "${readingBook.notes}"\n`;

    if (books.length > 1) {
      resp += `\n📚 **Other Books in Library**:\n`;
      books.filter(b => b.id !== readingBook.id).forEach(b => {
        resp += `- "${b.title}" (${b.status})\n`;
      });
    }

    return resp;
  }

  // Query: Main Quests / Routines
  if (query.includes("main quest") || query.includes("routine") || query.includes("habit") || query.includes("today task")) {
    const doneCount = mainQuests.filter(t => local.completions[`${t.id}:${today}`]).length;
    let resp = `📜 **Main Quests Daily Routine (${today})**\n\n`;
    resp += `Progress: **${doneCount}/${mainQuests.length} Completed** (${mainQuests.length ? Math.round((doneCount / mainQuests.length) * 100) : 0}%)\n\n`;
    mainQuests.forEach(t => {
      const isDone = local.completions[`${t.id}:${today}`];
      resp += `- ${isDone ? '✅' : '⏳'} **${t.title}** [${t.category}] (+${t.xp} XP)\n`;
    });
    return resp;
  }

  // Query: Productivity Plan
  if (query.includes("plan") || query.includes("coach") || query.includes("recommend") || query.includes("action")) {
    const todaySide = sideQuests.filter(sq => sq.date === today && !sq.completed);
    const highSide = todaySide.filter(sq => sq.priority === "High");

    let resp = `💡 **Ascend AI Action Plan for Today (${today})**\n\n`;
    resp += `1. **Priority #1**: Finish high-priority side quests (${highSide.length} pending).\n`;
    if (highSide.length > 0) {
      highSide.forEach(sq => { resp += `   - ${sq.title} ${sq.due_time ? `(⏰ ${sq.due_time})` : ''}\n`; });
    }
    resp += `2. **Priority #2**: Complete main quest routines to maintain your **${streakStats.currentStreak}-day streak**.\n`;
    resp += `3. **Priority #3**: Log 10 pages in your Reading Center to earn extra XP towards Level ${currentLevel + 1}.\n`;
    return resp;
  }

  // Default General Summary Response
  const todaySide = sideQuests.filter(sq => sq.date === today && !sq.completed);
  const mainDone = mainQuests.filter(t => local.completions[`${t.id}:${today}`]).length;

  return `🤖 **Ascend AI Assistant Summary**\n\n` +
    `Here is a quick snapshot of your personal OS right now:\n\n` +
    `- 🏆 **Level**: Level ${currentLevel} (${totalXpAllTime} Total XP)\n` +
    `- 📜 **Main Quests**: ${mainDone}/${mainQuests.length} Done Today\n` +
    `- ⚔️ **Pending Side Quests**: ${todaySide.length} Pending Today\n` +
    `- 🔥 **Daily Streak**: ${streakStats.currentStreak} Days\n\n` +
    `You can ask me specific questions like:\n` +
    `• *"What side quests are pending today?"*\n` +
    `• *"How much XP do I need for next level?"*\n` +
    `• *"What page am I on in my reading book?"*\n` +
    `• *"Give me a productivity plan for today"*`;
}

async function queryGeminiAscendAi(messages, ragContext, apiKey) {
  const systemInstruction = `You are Ascend AI, an intelligent personal productivity coach and assistant built into Project Ascend (an offline-first personal operating system for daily quests, learning, habits, wishlist, reading, and level progression).

Here is the LIVE, REAL-TIME DATA CONTEXT of the user's personal operating system:
${ragContext}

INSTRUCTIONS:
1. Respond conversationally, concisely, and helpfully in GitHub-flavored markdown.
2. Direct the user accurately based on their current tasks, side quests, reading progress, and XP levels.
3. Be highly encouraging and focused on personal ascendance, high performance, and clarity.`;

  const formattedContents = messages.map(m => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const payload = {
    contents: formattedContents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API returned status ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response text returned from Gemini API");
  return text;
}

// ==========================================
// ASCEND AI VIEW COMPONENT
// ==========================================
function AscendAiView({
  local, setLocal, streakStats, totalXpAllTime, geminiKey, setGeminiKey, onNavigate, onOpenSideQuestModal
}) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState(local.ai_chat_history || []);

  const ragContext = useMemo(() => {
    return buildUserRagContext(local, streakStats, totalXpAllTime);
  }, [local, streakStats, totalXpAllTime]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInputText("");
    setLoading(true);

    try {
      let aiText = "";
      if (geminiKey && geminiKey.trim()) {
        try {
          aiText = await queryGeminiAscendAi(newHistory, ragContext, geminiKey.trim());
        } catch (geminiErr) {
          console.warn("Gemini API error, falling back to local RAG engine:", geminiErr);
          aiText = `⚠️ *[Gemini API Error: ${geminiErr.message}. Switched to built-in RAG Assistant]*\n\n` +
            queryOfflineAscendAi(query, ragContext, local, streakStats, totalXpAllTime);
        }
      } else {
        // Use built-in offline RAG Assistant
        aiText = queryOfflineAscendAi(query, ragContext, local, streakStats, totalXpAllTime);
      }

      const aiMsg = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: aiText,
        timestamp: new Date().toISOString()
      };

      const finalHistory = [...newHistory, aiMsg];
      setChatHistory(finalHistory);
      setLocal(s => ({ ...s, ai_chat_history: finalHistory }));
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all AI chat history?")) {
      setChatHistory([]);
      setLocal(s => ({ ...s, ai_chat_history: [] }));
    }
  };

  const promptChips = [
    "⚔️ What side quests are pending today?",
    "🏆 What is my Level & XP progress?",
    "📚 How am I doing on my reading focus?",
    "📜 Show main quest routines",
    "💡 Give me a 3-step productivity plan for today"
  ];

  return (
    <main className="viewContainer fade-in">
      {/* PAGE HEADER */}
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText">
            <Sparkles size={13} /> PERSONAL PRODUCTIVITY COACH & RAG ENGINE
          </div>
          <h2 className="pageTitle">ASCEND AI 🤖</h2>
          <p className="pageSubtitle">
            Ask anything about your pending tasks, side quest deadlines, reading progress, XP stats, or get custom coaching plans.
          </p>
        </div>

        <div className="headerBtnGroup">
          {chatHistory.length > 0 && (
            <button className="secondaryBtn smallBtn" onClick={clearHistory}>
              <Trash2 size={14} />
              <span>Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CHAT CONTAINER */}
      <div className="glassPanel aiChatCard">
        {/* CHAT MESSAGES THREAD */}
        <div className="aiChatThread">
          {chatHistory.length === 0 ? (
            <div className="aiEmptyChatState">
              <div className="aiAvatarBig">🤖</div>
              <h3>Welcome to Ascend AI</h3>
              <p>
                I have full, real-time knowledge of your Main Quests, Side Quests, Reading Library, Wishlist, and Level Stats.
                Ask me a question or tap a suggestion chip below!
              </p>
            </div>
          ) : (
            chatHistory.map((msg) => (
              <div key={msg.id} className={`chatBubbleRow ${msg.sender}`}>
                <div className="chatAvatar">{msg.sender === "user" ? "👤" : "🤖"}</div>
                <div className="chatBubbleContent">
                  <div className="chatBubbleHeader">
                    <strong>{msg.sender === "user" ? "You" : "Ascend AI"}</strong>
                    <small>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  <div className="chatTextBody">
                    {msg.text.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="chatBubbleRow ai">
              <div className="chatAvatar">🤖</div>
              <div className="chatBubbleContent">
                <div className="typingDots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PROMPT CHIPS */}
        <div className="promptChipsRow">
          {promptChips.map((chip, idx) => (
            <button key={idx} className="promptChipBtn" onClick={() => handleSendMessage(chip)}>
              {chip}
            </button>
          ))}
        </div>

        {/* INPUT BOX */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="aiChatInputRow">
          <input
            type="text"
            placeholder="Ask Ascend AI about tasks, due times, books, level stats..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="aiInput"
          />
          <button type="submit" className="primaryBtn" disabled={!inputText.trim() || loading}>
            <span>Send</span>
          </button>
        </form>
      </div>
    </main>
  );
}

// ==========================================
// 2. EDIT QUESTS VIEW COMPONENT
// ==========================================
function EditQuestsView({
  tasks, concepts, toggleLock, moveOrder, onOpenQuestModal, onDeleteQuest,
  onOpenConceptModal, onDeleteConcept, onPurgeDuplicates
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
        <div className="headerBtnGroup">
          {onPurgeDuplicates && (
            <button className="secondaryBtn" onClick={onPurgeDuplicates} title="Purge all duplicate quests by title from your cloud database">
              <RefreshCw size={14} />
              <span>Purge Duplicates 🧹</span>
            </button>
          )}
          <button className="primaryBtn" onClick={() => onOpenQuestModal({ isNew: true })}>
            <Plus size={16} />
            <span>Add New Quest</span>
          </button>
        </div>
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
  notifPermission, requestNotificationPermission, onPurgeDuplicates
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
          onPurgeDuplicates={onPurgeDuplicates}
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
    const filtered = (sideQuests || []).filter(sq => sq.date === selectedDate);
    return [...filtered].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pA = PRIORITY_ORDER[a.priority] || 2;
      const pB = PRIORITY_ORDER[b.priority] || 2;
      if (pA !== pB) return pA - pB;
      if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
      if (a.due_time) return -1;
      if (b.due_time) return 1;
      return 0;
    });
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
function ReadingView({ user, books, onOpenBookModal, logReadingTenPages, fetchOnlineData }) {
  const activeBook = books.find(b => b.status === "Reading") || books[0];

  const handlePageChange = async (bookId, newPage) => {
    if (!user) return;
    const val = Math.max(0, parseInt(newPage, 10) || 0);
    const targetBook = (books || []).find(b => b.id === bookId);
    if (!targetBook) return;
    const isFinished = targetBook.total_pages > 0 && val >= targetBook.total_pages;

    const { error } = await supabase
      .from("books")
      .update({
        current_page: val,
        status: isFinished ? "Completed" : targetBook.status,
        completed_date: isFinished ? todayStr() : targetBook.completed_date
      })
      .eq("id", bookId)
      .eq("user_id", user.id);

    if (error) console.error("Cloud book page update error:", error);
    fetchOnlineData();
  };

  const deleteBook = async (bookId) => {
    if (!user) return;
    if (confirm("Remove this book from your cloud library?")) {
      const { error } = await supabase.from("books").delete().eq("id", bookId).eq("user_id", user.id);
      if (error) console.error("Cloud book delete error:", error);
      fetchOnlineData();
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
function WishlistView({ user, wishlist, onOpenWishlistModal, fetchOnlineData }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'purchased'

  const togglePurchased = async (id) => {
    if (!user) return;
    const item = (wishlist || []).find(w => w.id === id);
    if (!item) return;
    const { error } = await supabase
      .from("wishlist")
      .update({ purchased: !item.purchased })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) console.error("Cloud wishlist toggle error:", error);
    fetchOnlineData();
  };

  const deleteWishItem = async (id) => {
    if (!user) return;
    if (confirm("Remove item from your cloud wishlist?")) {
      const { error } = await supabase.from("wishlist").delete().eq("id", id).eq("user_id", user.id);
      if (error) console.error("Cloud wishlist delete error:", error);
      fetchOnlineData();
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

  // Weekly Ascension Report Calculation
  const weeklyReport = useMemo(() => {
    let weekDone = 0;
    let weekTotal = tasks.length * 7;
    let weekXp = 0;
    const daysData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
      const done = tasks.filter(t => local.completions[`${t.id}:${dayStr}`]).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      weekDone += done;
      weekXp += done * 20;
      daysData.push({ dayName, pct, done, dayStr });
    }

    daysData.sort((a, b) => b.pct - a.pct);
    const bestDay = daysData[0] ? `${daysData[0].dayName} (${daysData[0].pct}%)` : "N/A";
    const needsWork = daysData[daysData.length - 1] ? `${daysData[daysData.length - 1].dayName} (${daysData[daysData.length - 1].pct}%)` : "N/A";
    const totalPct = weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0;

    let advice = "Great momentum! Keep your streak alive by completing high priority side quests daily.";
    if (totalPct < 50) {
      advice = "Your completion rate drops on weekends or busy days. Consider focusing on top 3 priority tasks first.";
    }

    return { weekDone, weekTotal, totalPct, weekXp, bestDay, needsWork, advice };
  }, [local.completions, tasks]);

  const insights = useMemo(() => {
    const totalCompletions = Object.keys(local.completions || {}).filter(k => local.completions[k]).length;
    if (totalCompletions < 3) {
      return ["Keep completing quests! Ascend is learning your productivity patterns."];
    }
    const list = [];
    if (streakStats.currentStreak >= 3) {
      list.push(`🔥 Strong momentum! You're on a ${streakStats.currentStreak}-day active streak.`);
    }
    list.push(`📈 Best completion day this week: ${weeklyReport.bestDay}`);
    list.push(`⚠️ Needs attention: ${weeklyReport.needsWork}`);
    return list;
  }, [local.completions, streakStats, weeklyReport]);

  const COLORS = ["#f5b942", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#f97316"];

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><BarChart2 size={13} /> PERFORMANCE INTELLIGENCE</div>
          <h2 className="pageTitle">ANALYTICS & INSIGHTS</h2>
          <p className="pageSubtitle">Real metrics calculated strictly from your verified daily activity log.</p>
        </div>
      </div>

      {/* WEEKLY ASCENSION REPORT CARD */}
      <div className="glassPanel">
        <div className="panelHeader">
          <div>
            <h3>WEEKLY ASCENSION REPORT</h3>
            <span className="panelSub">7-Day performance summary & coaching recommendation</span>
          </div>
        </div>

        <div className="weeklyReportGrid">
          <div className="wCard">
            <strong>{weeklyReport.weekDone} / {weeklyReport.weekTotal}</strong>
            <small>Quests Completed ({weeklyReport.totalPct}%)</small>
          </div>
          <div className="wCard">
            <strong>+{weeklyReport.weekXp} XP</strong>
            <small>XP Earned This Week</small>
          </div>
          <div className="wCard">
            <strong>{weeklyReport.bestDay}</strong>
            <small>Best Day</small>
          </div>
          <div className="wCard">
            <strong>{weeklyReport.needsWork}</strong>
            <small>Needs Work</small>
          </div>
        </div>

        <div className="weeklyAdviceBox" style={{ marginTop: 14 }}>
          <strong>💡 NEXT WEEK STRATEGY:</strong>
          <p style={{ margin: "4px 0 0 0" }}>{weeklyReport.advice}</p>
        </div>
      </div>

      {/* ASCEND INSIGHTS CARD */}
      <div className="glassPanel marginTop">
        <div className="panelHeader">
          <div>
            <h3>🧠 ASCEND INSIGHTS</h3>
            <span className="panelSub">Pattern recognition derived from actual task completion data</span>
          </div>
        </div>
        <div className="insightsList">
          {insights.map((item, idx) => (
            <div key={idx} className="insightItem">
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="metricsGrid marginTop">
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
// QUEST HISTORY VIEW COMPONENT
// ==========================================
function HistoryView({ local, recoverSideQuest }) {
  const [filter, setFilter] = useState("all"); // "all" | "main" | "side" | "completed" | "missed"

  const historyItems = useMemo(() => {
    const items = [];
    const today = todayStr();

    // Side Quests
    (local.side_quests || []).forEach(sq => {
      const isMissed = sq.date < today && !sq.completed && !sq.recovered;
      items.push({
        id: sq.id,
        title: sq.title,
        type: "Side Quest",
        date: sq.date,
        priority: sq.priority || "Medium",
        completed: sq.completed,
        recovered: sq.recovered,
        isMissed,
        xp: sq.priority === "High" ? 30 : sq.priority === "Medium" ? 20 : 10,
        timestamp: sq.completedAt || sq.createdAt || sq.date
      });
    });

    // Main Quest Completions
    Object.keys(local.completions || {}).forEach(k => {
      if (local.completions[k]) {
        const [taskId, completedOn] = k.split(":");
        const task = (local.tasks || []).find(t => t.id === taskId);
        items.push({
          id: `${taskId}-${completedOn}`,
          title: task ? task.title : "Main Quest",
          type: "Main Quest",
          date: completedOn,
          priority: "Medium",
          completed: true,
          recovered: false,
          isMissed: false,
          xp: task ? (task.xp || 10) : 10,
          timestamp: completedOn
        });
      }
    });

    // Sort descending by date
    items.sort((a, b) => b.date.localeCompare(a.date));

    if (filter === "main") return items.filter(i => i.type === "Main Quest");
    if (filter === "side") return items.filter(i => i.type === "Side Quest");
    if (filter === "completed") return items.filter(i => i.completed);
    if (filter === "missed") return items.filter(i => i.isMissed);
    return items;
  }, [local.side_quests, local.completions, local.tasks, filter]);

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><CalendarDays size={13} /> HISTORICAL LOGS</div>
          <h2 className="pageTitle">QUEST HISTORY</h2>
          <p className="pageSubtitle">Browse all past Main Quests, Side Quests, completion timestamps, and recovery logs.</p>
        </div>

        <div className="filterPillsRow">
          {["all", "main", "side", "completed", "missed"].map(f => (
            <button
              key={f}
              className={`filterPillBtn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="glassPanel">
        {historyItems.length === 0 ? (
          <div className="emptyState">No quest history found for selected filter.</div>
        ) : (
          <div className="historyTable">
            {historyItems.map(item => (
              <div key={item.id} className={`historyRow ${item.completed ? "done" : item.isMissed ? "missed" : ""}`}>
                <div className="historyColDate">
                  <strong>{item.date}</strong>
                </div>
                <div className="historyColTitle">
                  <strong>{item.title}</strong>
                  <div className="historyTags">
                    <span className={`typeTag ${item.type === "Main Quest" ? "main" : "side"}`}>{item.type}</span>
                    <span className={`prioTag ${item.priority}`}>{item.priority} Priority</span>
                  </div>
                </div>
                <div className="historyColStatus">
                  {item.completed ? (
                    <span className="statusTag success">
                      {item.recovered ? "🔄 Recovered (+15 XP)" : `✅ Completed (+${item.xp} XP)`}
                    </span>
                  ) : item.isMissed ? (
                    <div className="failedGroup">
                      <span className="statusTag danger">❌ QUEST FAILED</span>
                      <button className="primaryBtn smallBtn" onClick={() => recoverSideQuest(item.id)}>
                        Recover Quest (Half XP)
                      </button>
                    </div>
                  ) : (
                    <span className="statusTag warning">⏳ Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ==========================================
// ACHIEVEMENTS VIEW COMPONENT
// ==========================================
function AchievementsView({ local, streakStats, totalXpAllTime, currentLevel }) {
  const achievements = useMemo(() => {
    const totalCompletions = Object.keys(local.completions || {}).filter(k => local.completions[k]).length;
    const sideCompletions = (local.side_quests || []).filter(sq => sq.completed).length;
    const codingCompletions = (local.side_quests || []).filter(sq => sq.completed && (sq.category || "").toLowerCase().includes("code")).length;
    const totalPagesRead = (local.books || []).reduce((acc, b) => acc + (b.current_page || 0), 0);

    return [
      {
        id: "ach-1",
        title: "🏆 FIRST BLOOD",
        desc: "Complete your first quest.",
        progress: Math.min(totalCompletions + sideCompletions, 1),
        target: 1,
        unlocked: (totalCompletions + sideCompletions) >= 1
      },
      {
        id: "ach-2",
        title: "🔥 7-DAY WARRIOR",
        desc: "Maintain a 7-day streak.",
        progress: Math.min(streakStats.maxStreak, 7),
        target: 7,
        unlocked: streakStats.maxStreak >= 7
      },
      {
        id: "ach-3",
        title: "💀 NO EXCUSES",
        desc: "Complete all Main Quests for 7 consecutive days.",
        progress: Math.min(streakStats.currentStreak, 7),
        target: 7,
        unlocked: streakStats.currentStreak >= 7
      },
      {
        id: "ach-4",
        title: "📚 KNOWLEDGE SEEKER",
        desc: "Read 100 pages total across your books.",
        progress: Math.min(totalPagesRead, 100),
        target: 100,
        unlocked: totalPagesRead >= 100
      },
      {
        id: "ach-5",
        title: "💻 CODE WARRIOR",
        desc: "Complete 50 coding or technical quests.",
        progress: Math.min(codingCompletions, 50),
        target: 50,
        unlocked: codingCompletions >= 50
      },
      {
        id: "ach-6",
        title: "🚀 ASCENSION",
        desc: "Reach Level 10.",
        progress: Math.min(currentLevel, 10),
        target: 10,
        unlocked: currentLevel >= 10
      },
      {
        id: "ach-7",
        title: "🗡️ SIDE QUEST HERO",
        desc: "Complete 20 Side Quests.",
        progress: Math.min(sideCompletions, 20),
        target: 20,
        unlocked: sideCompletions >= 20
      },
      {
        id: "ach-8",
        title: "⚡ CENTURION",
        desc: "Earn 1,000 total cumulative XP.",
        progress: Math.min(totalXpAllTime, 1000),
        target: 1000,
        unlocked: totalXpAllTime >= 1000
      }
    ];
  }, [local, streakStats, totalXpAllTime, currentLevel]);

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Trophy size={13} /> MILESTONES & BADGES</div>
          <h2 className="pageTitle">ACHIEVEMENTS</h2>
          <p className="pageSubtitle">Unlock RPG trophies by hitting real-world productivity milestones.</p>
        </div>
      </div>

      <div className="achievementsGrid">
        {achievements.map(ach => {
          const pct = Math.round((ach.progress / ach.target) * 100);
          return (
            <div key={ach.id} className={`achievementCard glassPanel ${ach.unlocked ? "unlocked" : "locked"}`}>
              <div className="achHead">
                <h3>{ach.title}</h3>
                <span className={`statusTag ${ach.unlocked ? "success" : "dim"}`}>
                  {ach.unlocked ? "UNLOCKED 🔓" : "LOCKED 🔒"}
                </span>
              </div>
              <p className="achDesc">{ach.desc}</p>
              <div className="achProgressRow">
                <div className="achBar">
                  <div className="achFill" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="achNum">{ach.progress} / {ach.target}</span>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ==========================================
// ASCENSION JOURNEY VIEW COMPONENT
// ==========================================
function AscensionJourneyView({ currentLevel, totalXpAllTime }) {
  const ranks = [
    { level: 1, title: "🌱 Novice Ascendant", desc: "Beginning of your RPG journey", minXp: 0 },
    { level: 2, title: "⚔️ Disciplined Seeker", desc: "Building consistent daily routines", minXp: 100 },
    { level: 4, title: "🔥 Consistent Adventurer", desc: "Sustaining 7+ day streaks", minXp: 300 },
    { level: 6, title: "🧠 Knowledge Builder", desc: "Mastering core concepts & reading focus", minXp: 500 },
    { level: 8, title: "💻 Data Warrior", desc: "Executing high priority technical quests", minXp: 700 },
    { level: 10, title: "⚡ Technical Champion", desc: "Overcoming major multi-day challenges", minXp: 900 },
    { level: 15, title: "🚀 Grand Ascended Master", desc: "Pinnacle of personal ascendance", minXp: 1400 }
  ];

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Target size={13} /> LONG-TERM CHARACTER GROWTH</div>
          <h2 className="pageTitle">ASCENSION JOURNEY</h2>
          <p className="pageSubtitle">Your RPG evolution tree from Novice Ascendant to Grand Ascended Master.</p>
        </div>
      </div>

      <div className="journeyTree glassPanel">
        {ranks.map((r, i) => {
          const isCurrent = currentLevel >= r.level && (i === ranks.length - 1 || currentLevel < ranks[i + 1].level);
          const isReached = currentLevel >= r.level;
          return (
            <React.Fragment key={r.level}>
              <div className={`journeyStepCard ${isCurrent ? "current" : isReached ? "reached" : "future"}`}>
                <div className="stepRankTitle">{r.title}</div>
                <div className="stepLevelTag">Level {r.level}+ ({r.minXp} Total XP)</div>
                <p className="stepDesc">{r.desc}</p>
                {isCurrent && <div className="currentBadge">CURRENT RANK</div>}
              </div>
              {i < ranks.length - 1 && <div className={`journeyConnector ${isReached ? "reached" : ""}`}>↓</div>}
            </React.Fragment>
          );
        })}
      </div>
    </main>
  );
}

// ==========================================
// CHALLENGES VIEW COMPONENT
// ==========================================
function ChallengesView({ local, setLocal }) {
  const challenges = local.challenges || [];

  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Shield size={13} /> LONG-TERM OBJECTIVES</div>
          <h2 className="pageTitle">CHALLENGES</h2>
          <p className="pageSubtitle">Multi-day challenges designed to push your boundaries and earn massive XP.</p>
        </div>
      </div>

      <div className="challengesGrid">
        {challenges.map(c => {
          const pct = Math.round((c.completedDays / c.targetDays) * 100);
          return (
            <div key={c.id} className="challengeCard glassPanel">
              <div className="chHead">
                <div>
                  <span className="catTag">{c.category}</span>
                  <h3>{c.title}</h3>
                </div>
                <span className="xpBadge">+{c.rewardXp} XP</span>
              </div>
              <div className="chProgress">
                <div className="progressInfo">
                  <span>{c.completedDays} of {c.targetDays} Days</span>
                  <span>{pct}%</span>
                </div>
                <div className="levelBarContainer">
                  <div className="levelBarFill" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ==========================================
// 6. SETTINGS VIEW COMPONENT
// ==========================================
function SettingsView({ user, online, syncWithCloud, syncing, notifPermission, requestNotificationPermission, geminiKey, setGeminiKey, handleGoogleLogin, handleLogout, onClearAllData }) {
  return (
    <main className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText"><Settings size={13} /> ARCHITECTURE & SYNC</div>
          <h2 className="pageTitle">SYSTEM SETTINGS</h2>
          <p className="pageSubtitle">Manage Google OAuth, cloud synchronization, push notifications, AI configuration, and offline storage state.</p>
        </div>
      </div>

      <div className="glassPanel">
        <h3>🔐 User Authentication & Google OAuth</h3>
        <p className="settingsDesc">
          {user
            ? `Signed in as ${user.email}. Your data is automatically backed up and synced to Supabase PostgreSQL.`
            : "Operating in local guest mode. Sign in with your Google account via Supabase to enable cloud backup and cross-device sync."}
        </p>

        <div className="settingsActions" style={{ marginTop: 12 }}>
          {user ? (
            <button className="secondaryBtn" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign Out ({user.email})</span>
            </button>
          ) : (
            <button className="primaryBtn" onClick={handleGoogleLogin}>
              <LogIn size={16} />
              <span>Sign in with Google Account</span>
            </button>
          )}

          {online && user && (
            <button className="secondaryBtn" onClick={syncWithCloud} disabled={syncing}>
              <RefreshCw size={16} className={syncing ? "spin" : ""} />
              <span>{syncing ? "Syncing with Supabase..." : "Force Cloud Sync Now"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="glassPanel marginTop">
        <h3>🤖 Ascend AI LLM Configuration (Google Gemini API)</h3>
        <p className="settingsDesc">
          Ascend AI functions 100% offline out-of-the-box using the built-in RAG assistant engine. Optionally paste your free Google Gemini API Key below to enable full conversational LLM reasoning.
        </p>

        <div className="formGroup" style={{ marginTop: 12, maxWidth: 500 }}>
          <label>Google Gemini API Key (Optional)</label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={(e) => {
              setGeminiKey(e.target.value);
              localStorage.setItem("ascend_gemini_api_key", e.target.value.trim());
            }}
          />
          <small className="dimText" style={{ marginTop: 4, display: "block" }}>
            {geminiKey ? "✅ Gemini API Key Configured" : "💡 Leave blank to use 100% offline RAG assistant engine."}
          </small>
        </div>
      </div>

      <div className="glassPanel marginTop">
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
        <h3>Offline & PWA Configuration</h3>
        <p className="settingsDesc">
          Project Ascend uses IndexedDB as its primary database. The web app functions 100% offline, caching app shell assets via Service Worker. When internet reconnects, state automatically syncs to your Supabase PostgreSQL cloud tables.
        </p>
      </div>

      <div className="glassPanel marginTop" style={{ border: "1px solid rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.05)" }}>
        <h3 style={{ color: "#f87171" }}>🚨 Danger Zone: Reset Account & Clear All Data</h3>
        <p className="settingsDesc">
          Permanently delete all saved quests, history, completion records, reading books, wishlist items, dues, and lending data from your cloud account and start fresh with default starter quests.
        </p>

        <div className="settingsActions" style={{ marginTop: 14 }}>
          <button
            className="secondaryBtn"
            onClick={onClearAllData}
            style={{ background: "rgba(239, 68, 68, 0.15)", borderColor: "#ef4444", color: "#fca5a5" }}
          >
            <Trash2 size={16} />
            <span>Reset Vault & Clear All Data Freshly 🧹</span>
          </button>
        </div>
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

function DuesView({
  dues,
  lending,
  lendingInstallments,
  lendingPayments,
  onOpenLendingModal,
  onOpenLendingDetailModal,
  onOpenEmiPaymentModal,
  onDeleteLending,
  onOpenDueModal,
  onDeleteDue,
  onLogPaymentDue,
  onSendWhatsAppReminder
}) {
  const [subTab, setSubTab] = useState("lending"); // "lending" | "debts"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all"); // "all" | "active" | "completed" | "overdue"

  const today = todayStr();

  // Lending Aggregates
  const totalLentAmount = useMemo(() => {
    return (lending || []).reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
  }, [lending]);

  const totalLendingPaymentsReceived = useMemo(() => {
    return (lendingPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [lendingPayments]);

  const totalOutstanding = Math.max(0, totalLentAmount - totalLendingPaymentsReceived);

  const activeLendingCount = useMemo(() => {
    return (lending || []).filter(l => l.status === "Active").length;
  }, [lending]);

  const overdueAmount = useMemo(() => {
    return (lendingInstallments || []).reduce((sum, inst) => {
      const status = deriveInstallmentStatus(inst, today);
      if (status === "Overdue") {
        const remainingInst = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.paid_amount) || 0));
        return sum + remainingInst;
      }
      return sum;
    }, 0);
  }, [lendingInstallments, today]);

  const nextUpcomingEmi = useMemo(() => {
    const unpaid = (lendingInstallments || [])
      .filter(inst => {
        const st = deriveInstallmentStatus(inst, today);
        return st === "Pending" || st === "Partially Paid" || st === "Overdue";
      })
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];

    return unpaid || null;
  }, [lendingInstallments, today]);

  // Debts Aggregates
  const debtsList = useMemo(() => Array.isArray(dues) ? dues : [], [dues]);
  const totalDebtsAmount = useMemo(() => {
    return debtsList.reduce((sum, d) => sum + (Number(d.original_amount) || 0), 0);
  }, [debtsList]);

  const totalDebtsPaid = useMemo(() => {
    return debtsList.reduce((sum, d) => sum + (Number(d.amount_paid) || 0), 0);
  }, [debtsList]);

  const totalDebtsOutstanding = Math.max(0, totalDebtsAmount - totalDebtsPaid);

  // Filtered Lending items
  const filteredLending = useMemo(() => {
    return (lending || []).filter(l => {
      const matchesSearch = (l.person_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.phone_number || "").includes(searchQuery);

      if (!matchesSearch) return false;

      const insts = (lendingInstallments || []).filter(i => i.lending_id === l.id);
      const isOverdue = insts.some(i => deriveInstallmentStatus(i, today) === "Overdue");

      if (filterTag === "active") return l.status === "Active";
      if (filterTag === "completed") return l.status === "Completed";
      if (filterTag === "overdue") return isOverdue;
      return true;
    });
  }, [lending, lendingInstallments, searchQuery, filterTag, today]);

  return (
    <div className="viewContainer fade-in">
      <div className="pageHeaderRow">
        <div>
          <div className="eyebrowText">
            <Wallet size={13} /> FINANCIAL COMMAND CENTER
          </div>
          <h2 className="pageTitle">DUES & EMI TRACKER 💸</h2>
          <p className="pageSubtitle">
            Separate receivables from liabilities. Manage money lent with automated EMI schedules and track debts owed in real-time online.
          </p>
        </div>

        <div className="headerBtnGroup">
          <button className="primaryBtn" onClick={() => onOpenLendingModal({ isNew: true })}>
            <Plus size={16} />
            <span>+ Add Lending</span>
          </button>
          <button className="secondaryBtn" onClick={() => onOpenDueModal({ isNew: true, defaultType: "owed" })}>
            <Plus size={16} />
            <span>+ Add Debt</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div className="subTabNavRow">
        <button
          className={`subTabNavBtn ${subTab === "lending" ? "active" : ""}`}
          onClick={() => setSubTab("lending")}
        >
          <ArrowUpRight size={16} style={{ color: "#10b981" }} />
          <span>Lending (Money Lent)</span>
          <span className="statusCountTag" style={{ marginLeft: 6, background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            {activeLendingCount} Active
          </span>
        </button>

        <button
          className={`subTabNavBtn ${subTab === "debts" ? "active" : ""}`}
          onClick={() => setSubTab("debts")}
        >
          <ArrowDownLeft size={16} style={{ color: "#ef4444" }} />
          <span>Debts (Money Owed)</span>
          <span className="statusCountTag" style={{ marginLeft: 6, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
            {debtsList.filter(d => d.status !== "Paid").length} Active
          </span>
        </button>
      </div>

      {/* LENDING SUB-TAB CONTENT */}
      {subTab === "lending" && (
        <>
          {/* LENDING METRICS GRID */}
          <div className="metricsGrid">
            <div className="metricCard">
              <div className="metricIcon gold"><ArrowUpRight size={22} style={{ color: "#10b981" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#10b981" }}>₹{totalLentAmount.toLocaleString('en-IN')}</strong>
                <small>Total Principal Lent</small>
              </div>
            </div>

            <div className="metricCard">
              <div className="metricIcon star"><CheckCircle2 size={22} style={{ color: "#3b82f6" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#3b82f6" }}>₹{totalLendingPaymentsReceived.toLocaleString('en-IN')}</strong>
                <small>Total Received</small>
              </div>
            </div>

            <div className="metricCard">
              <div className="metricIcon flame"><Wallet size={22} style={{ color: "#f5b942" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#f5b942" }}>₹{totalOutstanding.toLocaleString('en-IN')}</strong>
                <small>Total Outstanding ({activeLendingCount} Active)</small>
              </div>
            </div>

            <div className="metricCard">
              <div className="metricIcon book"><Clock size={22} style={{ color: overdueAmount > 0 ? "#ef4444" : "#a0aec0" }} /></div>
              <div className="metricData">
                <strong style={{ color: overdueAmount > 0 ? "#ef4444" : "#e2e8f0" }}>
                  {overdueAmount > 0 ? `₹${overdueAmount.toLocaleString('en-IN')} Overdue` : "0 Overdue"}
                </strong>
                <small>{nextUpcomingEmi ? `Next EMI due: ${nextUpcomingEmi.due_date}` : "No upcoming EMIs"}</small>
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="lendingFilterBar marginTop">
            <input
              type="text"
              className="searchInput"
              placeholder="🔍 Search by person name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <div className="filterBtnGroup">
              {[
                { id: "all", label: "All Records" },
                { id: "active", label: "Active" },
                { id: "overdue", label: "⚠️ Overdue" },
                { id: "completed", label: "✓ Completed" }
              ].map(f => (
                <button
                  key={f.id}
                  className={`filterTagBtn ${filterTag === f.id ? "active" : ""}`}
                  onClick={() => setFilterTag(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* LENDING LIST */}
          {filteredLending.length === 0 ? (
            <div className="glassPanel emptyState" style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                No lending records match your filter criteria. Click "+ Add Lending" to create a new EMI lending record!
              </p>
            </div>
          ) : (
            <div className="questList">
              {filteredLending.map(l => (
                <LendingCard
                  key={l.id}
                  lending={l}
                  installments={(lendingInstallments || []).filter(i => i.lending_id === l.id)}
                  today={today}
                  onOpenDetail={onOpenLendingDetailModal}
                  onOpenPaymentModal={onOpenEmiPaymentModal}
                  onSendWhatsApp={onSendWhatsAppReminder}
                  onEdit={(rec) => onOpenLendingModal({ isNew: false, lending: rec })}
                  onDelete={onDeleteLending}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* DEBTS SUB-TAB CONTENT */}
      {subTab === "debts" && (
        <>
          <div className="metricsGrid">
            <div className="metricCard">
              <div className="metricIcon flame"><ArrowDownLeft size={22} style={{ color: "#ef4444" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#ef4444" }}>₹{totalDebtsAmount.toLocaleString('en-IN')}</strong>
                <small>Total Principal Debts</small>
              </div>
            </div>

            <div className="metricCard">
              <div className="metricIcon star"><CheckCircle2 size={22} style={{ color: "#10b981" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#10b981" }}>₹{totalDebtsPaid.toLocaleString('en-IN')}</strong>
                <small>Total Debts Paid</small>
              </div>
            </div>

            <div className="metricCard">
              <div className="metricIcon gold"><Wallet size={22} style={{ color: "#f56565" }} /></div>
              <div className="metricData">
                <strong style={{ color: "#f56565" }}>₹{totalDebtsOutstanding.toLocaleString('en-IN')}</strong>
                <small>Outstanding Liabilities</small>
              </div>
            </div>
          </div>

          <div className="glassPanel marginTop">
            <div className="panelHeader">
              <div>
                <h3>💳 DEBTS (MONEY I OWE)</h3>
                <span className="panelSub">Payable to creditors ({debtsList.filter(d => d.status !== "Paid").length} Active)</span>
              </div>
              <button className="secondaryBtn smallBtn" onClick={() => onOpenDueModal({ isNew: true, defaultType: "owed" })}>
                <Plus size={14} />
                <span>+ Add Debt</span>
              </button>
            </div>

            {debtsList.length === 0 ? (
              <div className="emptyState" style={{ padding: "32px 16px", textAlign: "center" }}>
                No debt records logged. Click "+ Add Debt" to track money owed to others.
              </div>
            ) : (
              <div className="questList">
                {debtsList.map(d => (
                  <DueQuestCard
                    key={d.id}
                    due={d}
                    today={today}
                    type="owed"
                    onLogPayment={onLogPaymentDue}
                    onDelete={onDeleteDue}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LendingCard({ lending, installments, today, onOpenDetail, onOpenPaymentModal, onSendWhatsApp, onEdit, onDelete }) {
  const principal = Number(lending.principal_amount) || 0;
  const totalPaid = installments.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const remaining = Math.max(0, principal - totalPaid);
  const pct = principal > 0 ? Math.min(100, Math.round((totalPaid / principal) * 100)) : 0;

  const paidCount = installments.filter(i => deriveInstallmentStatus(i, today) === "Paid").length;
  const totalCount = installments.length || lending.emi_count || 1;

  const nextUnpaidInst = installments
    .filter(i => deriveInstallmentStatus(i, today) !== "Paid")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];

  const hasOverdue = installments.some(i => deriveInstallmentStatus(i, today) === "Overdue");
  const isCompleted = lending.status === "Completed" || remaining === 0;

  const emiAmount = installments[0] ? Number(installments[0].amount) : Math.round(principal / totalCount);

  return (
    <div className={`questItem ${isCompleted ? "completed" : ""}`} style={{ flexDirection: "column", alignItems: "stretch", gap: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="questContent" style={{ flex: 1 }}>
          <div className="questTitleRow">
            <strong className="questTitle" style={{ fontSize: "16px" }}>{lending.person_name}</strong>
            {lending.phone_number && <span className="catTag" style={{ background: "rgba(255,255,255,0.06)", color: "#a0aec0" }}>📱 {lending.phone_number}</span>}
            {isCompleted && <span className="badgeStatus paid">✓ Completed</span>}
            {hasOverdue && !isCompleted && <span className="badgeStatus overdue">⚠️ Overdue</span>}
            {!isCompleted && !hasOverdue && <span className="badgeStatus pending">Active</span>}
          </div>

          <div className="questMeta" style={{ flexWrap: "wrap", gap: 10, marginTop: 6 }}>
            <span className="targetTag" style={{ color: "#3b82f6", fontWeight: 700 }}>
              🔄 EMI: ₹{emiAmount.toLocaleString('en-IN')}/mo ({lending.emi_count} months)
            </span>
            <span className="targetTag">
              Progress: {paidCount}/{totalCount} paid
            </span>
            {nextUnpaidInst && (
              <span className="targetTag" style={{ color: hasOverdue ? "#ef4444" : "#f5b942", fontWeight: 700 }}>
                <Clock size={12} /> Next Due: {nextUnpaidInst.due_date} (₹{Number(nextUnpaidInst.amount).toLocaleString('en-IN')})
              </span>
            )}
          </div>
        </div>

        <div className="questRight" style={{ flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <strong style={{ fontSize: "18px", color: "#10b981" }}>
            +₹{remaining.toLocaleString('en-IN')}
          </strong>
          <small style={{ fontSize: "11px", color: "#8b96a8" }}>
            ₹{totalPaid.toLocaleString('en-IN')} paid of ₹{principal.toLocaleString('en-IN')}
          </small>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="levelBarContainer" style={{ height: 5, borderRadius: 3, background: "#1e2638" }}>
        <div className="levelBarFill" style={{ width: `${pct}%`, background: isCompleted ? "#10b981" : hasOverdue ? "#ef4444" : "#3b82f6" }}></div>
      </div>

      {/* CARD ACTIONS */}
      <div className="questTitleRow" style={{ justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="primaryBtn smallBtn" onClick={() => onOpenDetail(lending)} style={{ padding: "5px 12px", fontSize: "12px" }}>
            View EMI Schedule 📋
          </button>

          {!isCompleted && nextUnpaidInst && (
            <button className="secondaryBtn smallBtn" onClick={() => onOpenPaymentModal(nextUnpaidInst, lending)} style={{ padding: "5px 10px", fontSize: "12px" }}>
              + Log Payment
            </button>
          )}

          {!isCompleted && nextUnpaidInst && (
            <button className="whatsappBtn" onClick={() => onSendWhatsApp(nextUnpaidInst, lending)}>
              WhatsApp Reminder 📲
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button className="iconBtn small" onClick={() => onEdit(lending)} title="Edit Lending">
            <Pencil size={13} />
          </button>
          <button className="iconBtn small dangerHover" onClick={() => onDelete(lending.id)} title="Delete Lending">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LendingModal({ modalData, onClose, onSave }) {
  const lending = modalData.lending || {};
  const [personName, setPersonName] = useState(lending.person_name || "");
  const [phoneNumber, setPhoneNumber] = useState(lending.phone_number || "");
  const [whatsappNumber, setWhatsappNumber] = useState(lending.whatsapp_number || lending.phone_number || "");
  const [principalAmount, setPrincipalAmount] = useState(lending.principal_amount || "");
  
  const [durationPreset, setDurationPreset] = useState(() => {
    const count = lending.emi_count;
    if ([1, 2, 3, 6, 9, 12].includes(count)) return String(count);
    if (count > 0) return "custom";
    return "3";
  });
  const [customDuration, setCustomDuration] = useState(lending.emi_count || 3);

  const [startDate, setStartDate] = useState(lending.start_date || todayStr());
  
  const defaultFirstDueDate = useMemo(() => {
    const d = new Date((lending.start_date || todayStr()) + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [lending.start_date]);

  const [firstDueDate, setFirstDueDate] = useState(lending.first_due_date || defaultFirstDueDate);
  const [notes, setNotes] = useState(lending.notes || "");

  const [interestEnabled, setInterestEnabled] = useState(!!lending.interest_enabled);
  const [interestRate, setInterestRate] = useState(lending.interest_rate || 0);

  const emiCount = durationPreset === "custom" ? Math.max(1, parseInt(customDuration, 10) || 1) : parseInt(durationPreset, 10);

  const liveInstallments = useMemo(() => {
    if (!principalAmount || Number(principalAmount) <= 0) return [];
    return calculateEmiInstallments(principalAmount, emiCount, startDate, firstDueDate);
  }, [principalAmount, emiCount, startDate, firstDueDate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!personName.trim() || !principalAmount || Number(principalAmount) <= 0) {
      alert("Please enter borrower name and a positive lent amount.");
      return;
    }

    onSave({
      id: lending.id,
      person_name: personName.trim(),
      phone_number: phoneNumber.trim(),
      whatsapp_number: whatsappNumber.trim() || phoneNumber.trim(),
      principal_amount: Number(principalAmount),
      interest_enabled: interestEnabled,
      interest_rate: interestEnabled ? Number(interestRate) : 0,
      interest_amount: interestEnabled ? Math.round(Number(principalAmount) * (Number(interestRate) / 100)) : 0,
      emi_count: emiCount,
      start_date: startDate,
      first_due_date: firstDueDate,
      notes: notes.trim()
    });
  };

  return (
    <div className="modalBackdrop fade-in">
      <div className="modalCard glassPanel" style={{ maxWidth: "580px" }}>
        <div className="modalHeader">
          <h3>{modalData.isNew ? "💸 Add New Lending Record" : "✏️ Edit Lending Record"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Borrower / Friend Name *</label>
            <input
              type="text"
              required
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              placeholder="e.g. Arun, Priya, Rahul..."
            />
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => {
                  setPhoneNumber(e.target.value);
                  if (!whatsappNumber) setWhatsappNumber(e.target.value);
                }}
                placeholder="+919876543210"
              />
            </div>
            <div className="formGroup">
              <label>WhatsApp Number</label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+919876543210"
              />
            </div>
          </div>

          <div className="formGroup">
            <label>Total Principal Amount Lent (₹) *</label>
            <input
              type="number"
              required
              min="1"
              value={principalAmount}
              onChange={e => setPrincipalAmount(e.target.value)}
              placeholder="e.g. 12000"
            />
          </div>

          <div className="formGroup">
            <label>EMI Duration Options (Months) *</label>
            <div className="durationPresetsGrid">
              {["1", "2", "3", "6", "9", "12"].map(d => (
                <button
                  key={d}
                  type="button"
                  className={`durationBtn ${durationPreset === d ? "active" : ""}`}
                  onClick={() => setDurationPreset(d)}
                >
                  {d} Month{d !== "1" ? "s" : ""}
                </button>
              ))}
              <button
                type="button"
                className={`durationBtn ${durationPreset === "custom" ? "active" : ""}`}
                onClick={() => setDurationPreset("custom")}
              >
                Custom
              </button>
            </div>

            {durationPreset === "custom" && (
              <div style={{ marginTop: "10px" }}>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  placeholder="Enter number of months..."
                  className="searchInput"
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Start Date (Lent Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label>First Payment Due Date *</label>
              <input
                type="date"
                required
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
              />
            </div>
          </div>

          {liveInstallments.length > 0 && (
            <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px 14px", borderRadius: "10px" }}>
              <strong style={{ fontSize: "13px", color: "#60a5fa", display: "block", marginBottom: 6 }}>
                📊 Calculated EMI Schedule Summary:
              </strong>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>Total Amount: ₹{Number(principalAmount).toLocaleString('en-IN')}</span>
                <span>Duration: {emiCount} months</span>
                <span>EMI: ₹{liveInstallments[0].amount.toLocaleString('en-IN')}/mo</span>
              </div>
            </div>
          )}

          <div className="formGroup">
            <label>Notes / Reason</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Laptop loan split with friend..."
              rows={2}
            />
          </div>

          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Create Lending</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LendingDetailModal({ lending, installments, payments, onClose, onOpenEmiPaymentModal, onSendWhatsAppReminder }) {
  const principal = Number(lending.principal_amount) || 0;
  const totalPaid = installments.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);
  const remaining = Math.max(0, principal - totalPaid);
  const today = todayStr();

  return (
    <div className="modalBackdrop fade-in">
      <div className="modalCard glassPanel" style={{ maxWidth: "750px", width: "95%" }}>
        <div className="modalHeader">
          <div>
            <h3>📋 EMI Schedule for {lending.person_name}</h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {lending.phone_number ? `Phone: ${lending.phone_number}` : ""}
            </span>
          </div>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="metricsGrid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "14px 0" }}>
          <div className="metricCard" style={{ padding: 12 }}>
            <small>Total Lent</small>
            <strong style={{ fontSize: 16, color: "#10b981" }}>₹{principal.toLocaleString('en-IN')}</strong>
          </div>
          <div className="metricCard" style={{ padding: 12 }}>
            <small>Total Paid</small>
            <strong style={{ fontSize: 16, color: "#3b82f6" }}>₹{totalPaid.toLocaleString('en-IN')}</strong>
          </div>
          <div className="metricCard" style={{ padding: 12 }}>
            <small>Remaining Balance</small>
            <strong style={{ fontSize: 16, color: "#f5b942" }}>₹{remaining.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <h4 style={{ fontSize: "14px", marginTop: 16, marginBottom: 8, color: "var(--text-main)" }}>
          Installments breakdown ({installments.length} EMIs):
        </h4>

        <div className="emiTableContainer">
          <table className="emiTable">
            <thead>
              <tr>
                <th>EMI #</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => {
                const status = deriveInstallmentStatus(inst, today);
                const isPaid = status === "Paid";
                const isOverdue = status === "Overdue";
                const isPartial = status === "Partially Paid";

                return (
                  <tr key={inst.id}>
                    <td><strong>#{inst.installment_number}</strong></td>
                    <td>{inst.due_date}</td>
                    <td><strong>₹{Number(inst.amount).toLocaleString('en-IN')}</strong></td>
                    <td>₹{Number(inst.paid_amount || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badgeStatus ${isPaid ? "paid" : isPartial ? "partial" : isOverdue ? "overdue" : "pending"}`}>
                        {status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {!isPaid && (
                          <button
                            className="secondaryBtn smallBtn"
                            onClick={() => onOpenEmiPaymentModal(inst)}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            Log Pay
                          </button>
                        )}
                        {!isPaid && (
                          <button
                            className="whatsappBtn"
                            onClick={() => onSendWhatsAppReminder(inst)}
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                          >
                            WhatsApp 📲
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {payments.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: "14px", marginBottom: 8, color: "var(--text-main)" }}>
              Payment History ({payments.length} payments):
            </h4>
            <div className="emiTableContainer">
              <table className="emiTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount Paid</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.payment_date}</td>
                      <td><strong style={{ color: "#10b981" }}>+₹{Number(p.amount).toLocaleString('en-IN')}</strong></td>
                      <td>{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modalFooter" style={{ marginTop: 20 }}>
          <button className="primaryBtn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function EmiPaymentModal({ installment, lending, onClose, onConfirm }) {
  const remainingInst = Math.max(0, (Number(installment.amount) || 0) - (Number(installment.paid_amount) || 0));
  const [payAmount, setPayAmount] = useState(remainingInst);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    onConfirm(installment.id, Number(payAmount), notes);
  };

  return (
    <div className="modalBackdrop fade-in">
      <div className="modalCard glassPanel" style={{ maxWidth: "460px" }}>
        <div className="modalHeader">
          <h3>+ Log Payment for {lending.person_name}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div style={{ background: "rgba(59, 130, 246, 0.08)", padding: 12, borderRadius: 8, fontSize: 13 }}>
            <div><strong>Installment #{installment.installment_number}</strong> — Due Date: {installment.due_date}</div>
            <div>Installment Amount: ₹{Number(installment.amount).toLocaleString('en-IN')}</div>
            <div>Already Paid: ₹{Number(installment.paid_amount || 0).toLocaleString('en-IN')}</div>
            <div style={{ color: "#f5b942", fontWeight: 700, marginTop: 4 }}>
              Remaining Unpaid for this EMI: ₹{remainingInst.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="formGroup">
            <label>Payment Amount Received (₹) *</label>
            <input
              type="number"
              required
              min="1"
              max={remainingInst * 2}
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label>Notes / Payment Ref</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. GPay transaction ID, cash..."
            />
          </div>

          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Confirm Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DueQuestCard({ due, today, type, onLogPayment, onDelete }) {
  const original = Number(due.original_amount) || 0;
  const paid = Number(due.amount_paid) || 0;
  const remaining = Math.max(0, original - paid);
  const pct = original > 0 ? Math.min(100, Math.round((paid / original) * 100)) : 0;
  const isSettled = due.status === "Paid" || remaining === 0;

  return (
    <div className={`questItem ${isSettled ? "completed" : ""}`} style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="questContent" style={{ flex: 1 }}>
          <div className="questTitleRow">
            <strong className="questTitle" style={{ fontSize: "15px" }}>{due.person_name}</strong>
            {isSettled && <span className="badgeStatus paid">✓ Paid</span>}
            {!isSettled && <span className="badgeStatus overdue">Pending</span>}
          </div>

          {due.reason && <p className="questDescText" style={{ marginTop: 2, marginBottom: 4 }}>{due.reason}</p>}
        </div>

        <div className="questRight" style={{ flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <strong style={{ fontSize: "16px", color: "#ef4444" }}>
            -₹{remaining.toLocaleString('en-IN')}
          </strong>
          <small style={{ fontSize: "11px", color: "#8b96a8" }}>
            {paid > 0 ? `₹${paid.toLocaleString('en-IN')} paid of ₹${original.toLocaleString('en-IN')}` : `₹${original.toLocaleString('en-IN')} total`}
          </small>
        </div>
      </div>

      <div className="levelBarContainer" style={{ height: 4, borderRadius: 2, background: "#1e2638" }}>
        <div className="levelBarFill" style={{ width: `${pct}%`, background: isSettled ? "#10b981" : "#ef4444" }}></div>
      </div>

      <div className="questTitleRow" style={{ justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {!isSettled && (
            <button className="primaryBtn smallBtn" onClick={() => onLogPayment(due)} style={{ padding: "4px 10px", fontSize: "11px" }}>
              Log Debt Payment
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <button className="iconBtn small dangerHover" onClick={() => onDelete(due.id)} title="Delete debt">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DueModal({ modalData, onClose, onSave }) {
  const due = modalData.due || {};
  const [personName, setPersonName] = useState(due.person_name || "");
  const [originalAmount, setOriginalAmount] = useState(due.original_amount || "");
  const [amountPaid, setAmountPaid] = useState(due.amount_paid || 0);
  const [dueDate, setDueDate] = useState(due.due_date || "");
  const [reason, setReason] = useState(due.reason || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!personName.trim() || !originalAmount || Number(originalAmount) <= 0) {
      alert("Please provide creditor name and total amount owed.");
      return;
    }

    onSave({
      isNew: modalData.isNew,
      id: due.id,
      person_name: personName.trim(),
      original_amount: Number(originalAmount),
      amount_paid: Number(amountPaid) || 0,
      due_date: dueDate || null,
      reason: reason.trim(),
      status: Number(amountPaid) >= Number(originalAmount) ? "Paid" : "Pending"
    });
  };

  return (
    <div className="modalBackdrop fade-in">
      <div className="modalCard glassPanel" style={{ maxWidth: "500px" }}>
        <div className="modalHeader">
          <h3>💳 {modalData.isNew ? "Add Debt Owed" : "Edit Debt Record"}</h3>
          <button className="iconBtn small" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Lender / Creditor Name *</label>
            <input
              type="text"
              required
              value={personName}
              onChange={e => setPersonName(e.target.value)}
              placeholder="e.g. Bank, HDFC, Friend..."
            />
          </div>

          <div className="formRowGrid">
            <div className="formGroup">
              <label>Total Amount Owed (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={originalAmount}
                onChange={e => setOriginalAmount(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="formGroup">
              <label>Amount Already Paid (₹)</label>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="formGroup">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label>Notes / Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Credit card bill, borrowed for shopping..."
              rows={2}
            />
          </div>

          <div className="modalFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primaryBtn">Save Debt</button>
          </div>
        </form>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Ascend Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#0b0d14",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚡</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "8px", color: "#fff" }}>
              Vault Recovery Shield
            </h2>
            <p style={{ color: "#a0aec0", fontSize: "0.95rem", marginBottom: "16px", lineHeight: "1.5" }}>
              A rendering glitch occurred. Click below to refresh cleanly and restore your session.
            </p>
            {this.state.error && (
              <pre style={{
                background: "rgba(0,0,0,0.4)",
                color: "#f56565",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                textAlign: "left",
                overflowX: "auto",
                marginBottom: "20px",
                maxHeight: "120px"
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (e) {}
                window.location.reload();
              }}
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Reset & Reload Vault 🔄
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- RENDER APPLICATION ---
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
