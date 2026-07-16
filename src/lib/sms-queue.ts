// SMS send queue with exponential backoff retries.
// Tracks each recipient as a job: queued → sending → retrying → sent | failed.
// Subscribers (UI) get notified of every status change.

import { sendSms } from "./native-bridge";
import { debugLog } from "./debug-log";

export type SmsJobStatus = "queued" | "sending" | "retrying" | "sent" | "fallback" | "failed";

export type SmsJob = {
  id: string;
  phone: string;
  message: string;
  status: SmsJobStatus;
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
};

const MAX_ATTEMPTS = 4;
// Backoff: 2s, 5s, 12s, 30s
const BACKOFFS = [2000, 5000, 12000, 30000];

const jobs = new Map<string, SmsJob>();
const listeners = new Set<(jobs: SmsJob[]) => void>();

const emit = () => {
  const snap = Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  listeners.forEach((fn) => { try { fn(snap); } catch { /* noop */ } });
};

const update = (id: string, patch: Partial<SmsJob>) => {
  const j = jobs.get(id);
  if (!j) return;
  Object.assign(j, patch, { updatedAt: Date.now() });
  emit();
};

export const subscribeSmsQueue = (fn: (jobs: SmsJob[]) => void): (() => void) => {
  listeners.add(fn);
  fn(Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt));
  return () => { listeners.delete(fn); };
};

export const getSmsJobs = (): SmsJob[] =>
  Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);

export const clearFinishedJobs = () => {
  for (const [id, j] of jobs) {
    if (j.status === "sent" || j.status === "fallback" || j.status === "failed") jobs.delete(id);
  }
  emit();
};

const attempt = async (id: string): Promise<void> => {
  const job = jobs.get(id);
  if (!job) return;

  update(id, { status: job.attempt === 0 ? "sending" : "retrying", attempt: job.attempt + 1 });
  debugLog("sms", `Attempt ${job.attempt + 1}/${job.maxAttempts} → ${job.phone}`);

  try {
    const res = await sendSms([job.phone], job.message);
    if (res.sent) {
      update(id, { status: "sent" });
      debugLog("sms", `✅ Silently delivered to ${job.phone}`);
      return;
    }
    if (res.fallback) {
      // Web fallback opened sms: link — we cannot confirm send, mark as fallback (terminal).
      update(id, { status: "fallback" });
      return;
    }
    throw new Error(res.error || "Unknown SMS failure");
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    const j = jobs.get(id);
    if (!j) return;
    if (j.attempt >= j.maxAttempts) {
      update(id, { status: "failed", lastError: err });
      debugLog("error", `❌ SMS to ${j.phone} failed after ${j.attempt} attempts`, { error: err });
      return;
    }
    const delay = BACKOFFS[Math.min(j.attempt - 1, BACKOFFS.length - 1)];
    update(id, { status: "retrying", lastError: err, nextRetryAt: Date.now() + delay });
    debugLog("sms", `Retrying ${j.phone} in ${delay}ms (attempt ${j.attempt}) — ${err}`);
    setTimeout(() => { void attempt(id); }, delay);
  }
};

export const enqueueSms = (phone: string, message: string): string => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: SmsJob = {
    id,
    phone,
    message,
    status: "queued",
    attempt: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  emit();
  // Kick off immediately
  setTimeout(() => { void attempt(id); }, 50);
  return id;
};

export const enqueueBulkSms = (phones: string[], message: string): string[] =>
  phones.map((p) => enqueueSms(p, message));
