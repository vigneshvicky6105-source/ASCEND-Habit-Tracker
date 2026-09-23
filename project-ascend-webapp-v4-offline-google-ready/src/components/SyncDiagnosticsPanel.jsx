import React, { useState, useEffect } from "react";
import { syncEngine } from "../lib/syncEngine";
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Database,
  Download, Trash2, Zap, X, ChevronDown, ChevronUp, Terminal, Wifi, WifiOff, Lock
} from "lucide-react";

export function SyncDiagnosticsPanel({ user, isOpen, onClose }) {
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("metrics"); // 'metrics' | 'logs'
  const [actionMsg, setActionMsg] = useState("");

  const refreshDiagnostics = async () => {
    try {
      const data = await syncEngine.getDiagnostics(user);
      setDiag(data);
    } catch (e) {
      console.error("Failed to fetch sync diagnostics:", e);
    }
  };

  useEffect(() => {
    refreshDiagnostics();
    const interval = setInterval(refreshDiagnostics, 1500);
    const unsubscribe = syncEngine.subscribeStatus(() => refreshDiagnostics());
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user]);

  if (!isOpen) return null;

  const handleAction = async (actionName, actionFn) => {
    setLoading(true);
    setActionMsg(`Running ${actionName}...`);
    try {
      await actionFn();
      setActionMsg(`✅ ${actionName} completed successfully.`);
      await refreshDiagnostics();
    } catch (err) {
      setActionMsg(`❌ ${actionName} failed: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
      setTimeout(() => setActionMsg(""), 4000);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "HEALTHY": return "#10b981"; // Emerald
      case "AUTH": return "#f59e0b"; // Amber
      case "SUPABASE": return "#ef4444"; // Red
      case "RLS": return "#dc2626"; // Crimson
      case "INDEXEDDB": return "#8b5cf6"; // Purple
      case "REALTIME": return "#06b6d4"; // Cyan
      case "NETWORK": return "#f97316"; // Orange
      case "CONFLICT": return "#eab308"; // Yellow
      case "DEPLOYMENT": return "#ec4899"; // Pink
      default: return "#6b7280"; // Gray
    }
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 99999,
      width: minimized ? "320px" : "640px",
      maxWidth: "calc(100vw - 40px)",
      maxHeight: "85vh",
      background: "rgba(15, 20, 32, 0.95)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(245, 185, 66, 0.3)",
      borderRadius: "14px",
      boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
      color: "#e2e8f0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      transition: "all 0.2s ease"
    }}>
      {/* HEADER */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(30, 41, 59, 0.8)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Activity size={18} style={{ color: "#f5b942" }} />
          <strong style={{ fontSize: "14px", letterSpacing: "0.5px" }}>ASCEND SYNC DIAGNOSTICS</strong>
          {diag && (
            <span style={{
              background: getCategoryColor(diag.problemCategory),
              color: "#ffffff",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700
            }}>
              {diag.problemCategory}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setMinimized(!minimized)}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
            title={minimized ? "Expand panel" : "Minimize panel"}
          >
            {minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
            title="Close panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* NAV TABS */}
          <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <button
              onClick={() => setActiveTab("metrics")}
              style={{
                flex: 1,
                padding: "8px",
                background: activeTab === "metrics" ? "rgba(245, 185, 66, 0.15)" : "transparent",
                border: "none",
                borderBottom: activeTab === "metrics" ? "2px solid #f5b942" : "none",
                color: activeTab === "metrics" ? "#f5b942" : "#94a3b8",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              📊 Metrics & State (15)
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              style={{
                flex: 1,
                padding: "8px",
                background: activeTab === "logs" ? "rgba(245, 185, 66, 0.15)" : "transparent",
                border: "none",
                borderBottom: activeTab === "logs" ? "2px solid #f5b942" : "none",
                color: activeTab === "logs" ? "#f5b942" : "#94a3b8",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              📋 Live Sync Log ({syncEngine.logsHistory.length})
            </button>
          </div>

          {actionMsg && (
            <div style={{
              padding: "8px 14px",
              background: "rgba(59, 130, 246, 0.2)",
              borderBottom: "1px solid rgba(59, 130, 246, 0.4)",
              fontSize: "12px",
              color: "#93c5fd"
            }}>
              {actionMsg}
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div style={{ padding: "14px", overflowY: "auto", flex: 1, maxHeight: "55vh" }}>
            {activeTab === "metrics" && diag && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                <MetricTile label="Authenticated User ID" value={diag.userId} code />
                <MetricTile label="Authentication Status" value={diag.authStatus} status={diag.authStatus === "Authenticated"} />
                <MetricTile label="Supabase Connection" value={diag.supabaseConnected ? "Connected" : "Not Configured"} status={diag.supabaseConnected} />
                <MetricTile label="Realtime Connection" value={diag.realtimeStatus} status={diag.realtimeStatus === "SUBSCRIBED"} />
                <MetricTile label="Sync Engine Status" value={diag.syncStatus} highlight={diag.syncStatus === "ERROR" ? "#ef4444" : "#10b981"} />
                <MetricTile label="Last Successful Sync" value={diag.lastSyncTime !== "Never" ? new Date(diag.lastSyncTime).toLocaleTimeString() : "Never"} />
                <MetricTile label="Last Pull Time" value={diag.lastPullTime !== "Never" ? new Date(diag.lastPullTime).toLocaleTimeString() : "Never"} />
                <MetricTile label="Last Push Time" value={diag.lastPushTime !== "Never" ? new Date(diag.lastPushTime).toLocaleTimeString() : "Never"} />
                <MetricTile label="Pending Operations" value={diag.pendingCount} highlight={diag.pendingCount > 0 ? "#f59e0b" : "#10b981"} />
                <MetricTile label="Failed Operations" value={diag.failedCount} highlight={diag.failedCount > 0 ? "#ef4444" : "#10b981"} />
                <MetricTile label="IndexedDB Cache Status" value={diag.idbStatus} status={diag.idbStatus === "Ready"} />
                <MetricTile label="Current Environment" value={diag.environment} />
                <MetricTile label="Supabase Project Host" value={diag.supabaseHostname} code />
                <MetricTile label="Last Successful Op" value={diag.lastSuccessfulOp} fullWidth />
                <MetricTile label="Last Sync Error" value={diag.lastError} highlight={diag.lastError !== "None" ? "#ef4444" : "#94a3b8"} fullWidth />
              </div>
            )}

            {activeTab === "logs" && (
              <div style={{
                background: "#090d16",
                borderRadius: "8px",
                padding: "10px",
                fontFamily: "monospace",
                fontSize: "11px",
                overflowY: "auto",
                maxHeight: "350px",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                {syncEngine.logsHistory.length === 0 ? (
                  <span style={{ color: "#64748b" }}>No log records recorded yet.</span>
                ) : (
                  syncEngine.logsHistory.map((log) => (
                    <div key={log.id} style={{ marginBottom: "6px", lineHeight: "1.4" }}>
                      <span style={{ color: "#64748b" }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                      <span style={{
                        color: log.category === "ERROR" ? "#ef4444" : log.category === "SUCCESS" ? "#10b981" : log.category === "REALTIME" ? "#06b6d4" : "#f5b942",
                        fontWeight: 700
                      }}>
                        [{log.category}]
                      </span>{" "}
                      <span style={{ color: "#e2e8f0" }}>{log.message}</span>
                      {log.details && <span style={{ color: "#94a3b8", display: "block", paddingLeft: "12px" }}>{log.details}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS BAR */}
          <div style={{
            padding: "12px 14px",
            background: "rgba(30, 41, 59, 0.9)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px"
          }}>
            <button
              disabled={loading}
              onClick={() => handleAction("Force Pull", () => syncEngine.forcePull(user))}
              style={btnStyle}
            >
              📥 Force Pull
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("Force Push", () => syncEngine.forcePush(user))}
              style={btnStyle}
            >
              📤 Force Push
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("Full Reconcile", () => syncEngine.fullReconcile(user))}
              style={btnStyle}
            >
              🔄 Full Reconcile
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("Retry Failed", () => syncEngine.retryFailedOperations(user))}
              style={btnStyle}
            >
              ⚡ Retry Failed
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("Clear Local Cache", () => syncEngine.clearLocalCache(user))}
              style={{ ...btnStyle, borderColor: "rgba(239, 68, 68, 0.5)", color: "#fca5a5" }}
            >
              🗑️ Clear Cache
            </button>
            <button
              disabled={loading}
              onClick={() => handleAction("Export Log", () => syncEngine.exportDebugLog(user))}
              style={{ ...btnStyle, borderColor: "rgba(16, 185, 129, 0.5)", color: "#6ee7b7" }}
            >
              📋 Export Log
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricTile({ label, value, status, highlight, code, fullWidth }) {
  return (
    <div style={{
      background: "rgba(30, 41, 59, 0.5)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "8px",
      padding: "8px 10px",
      gridColumn: fullWidth ? "1 / -1" : "span 1"
    }}>
      <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{
        fontSize: "12px",
        fontWeight: 600,
        color: highlight || (status !== undefined ? (status ? "#10b981" : "#ef4444") : "#f8fafc"),
        fontFamily: code ? "monospace" : "inherit",
        wordBreak: "break-all"
      }}>
        {value !== null && value !== undefined ? String(value) : "N/A"}
      </div>
    </div>
  );
}

const btnStyle = {
  background: "rgba(51, 65, 85, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "6px",
  color: "#f8fafc",
  padding: "7px 4px",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center"
};
