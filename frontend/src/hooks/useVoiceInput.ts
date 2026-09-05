import { useCallback, useEffect, useRef, useState } from 'react';
import { bhashini } from '../services/BhashiniService';

interface UseVoiceInputOptions {
  language: () => string;
  maxDurationMs?: number;
}

/**
 * Real mic loop: MediaRecorder → BhashiniService.speechToText (backend proxied,
 * browser Web Speech fallback). Automatically stops after maxDurationMs and
 * transcribes the clip. `begin()` falls back to `dictate()` (Web Speech only)
 * when no MediaRecorder/mic is available.
 */
export function useVoiceInput(options: UseVoiceInputOptions) {
  const { language, maxDurationMs = 15000 } = options;
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(async (): Promise<string> => {
    const rec = recorderRef.current;
    if (!rec) return '';
    const lang = language();
    return new Promise((resolve) => {
      rec.onstop = async () => {
        cleanup();
        setRecording(false);
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
          const r = await bhashini.speechToText(blob, lang);
          resolve(r.transcript || '');
        } finally {
          setProcessing(false);
        }
      };
      try {
        rec.stop();
      } catch {
        cleanup();
        setRecording(false);
        resolve('');
      }
    });
  }, [cleanup, language]);

  const start = useCallback(async (): Promise<boolean> => {
    chunksRef.current = [];
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      streamRef.current = stream;
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      autoStopRef.current = window.setTimeout(() => {
        void stop();
      }, maxDurationMs);
      return true;
    } catch {
      return false;
    }
  }, [maxDurationMs, stop]);

  const dictate = useCallback(async (): Promise<string> => {
    setRecording(false);
    try {
      const r = await bhashini.dictate(language());
      return r.transcript || '';
    } catch {
      return '';
    }
  }, [language]);

  /** Optimistically shows "listening", then starts recording or falls back to dictate. */
  const begin = useCallback(async (): Promise<boolean> => {
    setRecording(true);
    const ok = await start();
    if (ok) return true;
    setRecording(false);
    return false;
  }, [start]);

  const micAvailable = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  return { recording, processing, begin, stop, dictate, cleanup, micAvailable };
}