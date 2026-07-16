import { useEffect, useRef, useState } from "react";

export type MicPermission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

/**
 * Background Web Speech listener. Calls onTrigger when transcript contains the target phrase.
 * Exposes microphone permission state so the UI can show clear Listening / Not listening /
 * Permission blocked status and keep the manual fallback visible.
 */
export function useSafeWordListener(opts: {
  enabled: boolean;
  phrase: string; // raw lowercase phrase
  onTrigger: () => void;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const recognitionRef = useRef<any>(null);
  const triggeredAt = useRef(0);

  // Query microphone permission (best-effort — not all browsers implement it).
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unsupported");
      return;
    }
    const perms = (navigator as Navigator & { permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> } }).permissions;
    if (!perms?.query) {
      setMicPermission("prompt");
      return;
    }
    let status: PermissionStatus | null = null;
    perms.query({ name: "microphone" as PermissionName }).then((s) => {
      status = s;
      setMicPermission(s.state as MicPermission);
      s.addEventListener?.("change", () => setMicPermission(s.state as MicPermission));
    }).catch(() => setMicPermission("prompt"));
    return () => { status?.removeEventListener?.("change", () => {}); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    if (!opts.enabled || !opts.phrase) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognitionRef.current = recognition;

    const phrase = opts.phrase.trim().toLowerCase();

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = (event.results[i][0].transcript || "").toLowerCase();
        if (t.includes(phrase)) {
          const now = Date.now();
          if (now - triggeredAt.current < 15_000) return; // debounce 15s
          triggeredAt.current = now;
          opts.onTrigger();
          return;
        }
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied");
        setMicPermission("denied");
        setListening(false);
        return;
      }
      if (e.error === "audio-capture") {
        setError("No microphone detected");
        setListening(false);
        return;
      }
      if (e.error === "network") {
        setError("Speech recognition network error — will retry");
      }
      // no-speech / aborted → let onend restart silently
    };
    recognition.onend = () => {
      setListening(false);
      if (opts.enabled && opts.phrase) {
        setTimeout(() => {
          try { recognition.start(); setListening(true); } catch { /* noop */ }
        }, 500);
      }
    };
    recognition.onstart = () => { setListening(true); setError(null); setMicPermission("granted"); };

    try { recognition.start(); } catch { /* already started */ }

    return () => {
      try { recognition.onend = null; recognition.stop(); } catch { /* noop */ }
    };
  }, [opts.enabled, opts.phrase]);

  const requestMic = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      setError(null);
      return true;
    } catch {
      setMicPermission("denied");
      setError("Microphone permission denied");
      return false;
    }
  };

  return { supported, listening, error, micPermission, requestMic };
}
