import { useState, useRef, useCallback } from 'react';

const SAMPLE_RATE = 16000;
const MAX_DURATION_MS = 60_000;
const SILENCE_TIMEOUT_MS = 5_000;
const MIN_DURATION_MS = 1_000;
const SILENCE_THRESHOLD = 0.015;

/**
 * Encode Float32Array PCM samples into a 16-bit PCM WAV Blob at the given sample rate.
 */
function encodeWav(samples: Float32Array, sr: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sr * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataBytes = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface UseVoiceRecorderResult {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioDurationMs: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    try { processorRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    try { contextRef.current?.close(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    setIsRecording(false);

    // Wait a tick so the processor flushes its last buffer, then encode.
    setTimeout(() => {
      const totalLen = chunksRef.current.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLen);
      let off = 0;
      for (const chunk of chunksRef.current) {
        merged.set(chunk, off);
        off += chunk.length;
      }
      const durationMs = Date.now() - startTimeRef.current;
      setAudioDurationMs(durationMs);

      if (durationMs < MIN_DURATION_MS || totalLen === 0) {
        setAudioBlob(null);
        setError('Recording too short. Please hold the button longer.');
      } else {
        setAudioBlob(encodeWav(merged, SAMPLE_RATE));
        setError(null);
      }
      chunksRef.current = [];
      cleanup();
    }, 120);
  }, [cleanup]);

  const resetSilenceTimer = useCallback(
    (analyser: AnalyserNode) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        // 5 seconds of silence → auto-stop
        stopRecording();
      }, SILENCE_TIMEOUT_MS);
    },
    [stopRecording],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setAudioDurationMs(0);
    chunksRef.current = [];
    stoppedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ sampleRate: SAMPLE_RATE });
      contextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // Use ScriptProcessorNode for PCM capture (widely supported).
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let silenceStart = Date.now();

      processor.onaudioprocess = (e) => {
        if (stoppedRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        chunksRef.current.push(copy);

        // RMS-based silence detection
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);

        if (rms > SILENCE_THRESHOLD) {
          silenceStart = Date.now();
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(stopRecording, SILENCE_TIMEOUT_MS);
        } else if (Date.now() - silenceStart > SILENCE_TIMEOUT_MS) {
          stopRecording();
        }
      };

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(ctx.destination);

      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Hard cap at 60 seconds
      maxTimerRef.current = setTimeout(stopRecording, MAX_DURATION_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, [stopRecording]);

  const cancelRecording = useCallback(() => {
    if (!stoppedRef.current) {
      stoppedRef.current = true;
      setIsRecording(false);
      chunksRef.current = [];
      cleanup();
    }
  }, [cleanup]);

  return { isRecording, audioBlob, audioDurationMs, error, startRecording, stopRecording, cancelRecording };
}
