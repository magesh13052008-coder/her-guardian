// Lightweight debug logger — persists last N events to localStorage so the
// /debug screen can show what happened after a packaged APK run.

export type LogKind = "sms" | "location" | "wakelock" | "permission" | "sos" | "info" | "error";

export type LogEntry = {
  ts: number;            // epoch ms
  kind: LogKind;
  message: string;
  data?: Record<string, unknown>;
};

const KEY = "hg_debug_log_v1";
const MAX = 200;

const read = (): LogEntry[] => {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const write = (entries: LogEntry[]) => {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX))); } catch { /* noop */ }
};

const listeners = new Set<() => void>();

export const debugLog = (kind: LogKind, message: string, data?: Record<string, unknown>) => {
  const entry: LogEntry = { ts: Date.now(), kind, message, data };
  const next = [...read(), entry].slice(-MAX);
  write(next);
  // eslint-disable-next-line no-console
  console.log(`[hg:${kind}]`, message, data ?? "");
  listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });
};

export const getLogs = (): LogEntry[] => read().slice().reverse(); // newest first
export const clearLogs = () => { write([]); listeners.forEach((fn) => fn()); };

export const subscribeLogs = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

// Track last wake lock event time
export const getLastWakeLockTime = (): number | null => {
  const logs = read();
  const wl = [...logs].reverse().find((l) => l.kind === "wakelock");
  return wl?.ts ?? null;
};
