/**
 * Zustand stores for global state management.
 */

import { create } from 'zustand';
import type { Session, ConsentItem, InterviewQuestion, Language, RedFlag } from '../types';

// Re-export auth store
export { useAuthStore } from './authStore';

// ============================================
// SESSION STORE — Active kiosk session state
// ============================================

interface SessionState {
  session: Session | null;
  currentQuestionIndex: number;
  conversationHistory: { role: string; content: string }[];
  detectedRedFlags: RedFlag[];
  documentsUploaded: number;
  consentGiven: boolean;

  setSession: (session: Session | null) => void;
  updateSession: (updates: Partial<Session>) => void;
  setCurrentQuestion: (index: number) => void;
  addMessage: (role: string, content: string) => void;
  addRedFlag: (flag: RedFlag) => void;
  incrementDocuments: () => void;
  setConsentGiven: (given: boolean) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  currentQuestionIndex: 0,
  conversationHistory: [],
  detectedRedFlags: [],
  documentsUploaded: 0,
  consentGiven: false,

  setSession: (session) => set({ session }),
  updateSession: (updates) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...updates } : null,
    })),
  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),
  addMessage: (role, content) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, { role, content }],
    })),
  addRedFlag: (flag) =>
    set((state) => ({
      detectedRedFlags: [...state.detectedRedFlags, flag],
    })),
  incrementDocuments: () =>
    set((state) => ({ documentsUploaded: state.documentsUploaded + 1 })),
  setConsentGiven: (given) => set({ consentGiven: given }),
  resetSession: () =>
    set({
      session: null,
      currentQuestionIndex: 0,
      conversationHistory: [],
      detectedRedFlags: [],
      documentsUploaded: 0,
      consentGiven: false,
    }),
}));

// ============================================
// UI STORE — Theme, accessibility, language
// ============================================

interface UIState {
  language: Language;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  lowLiteracyMode: boolean;
  ttsSpeed: number;
  sidebarOpen: boolean;

  setLanguage: (lang: Language) => void;
  setFontSize: (size: 'small' | 'medium' | 'large' | 'extra-large') => void;
  toggleHighContrast: () => void;
  toggleLowLiteracyMode: () => void;
  setTTSSpeed: (speed: number) => void;
  toggleSidebar: () => void;
}

const defaultLanguage: Language = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  icon: '🇮🇳',
};

export const useUIStore = create<UIState>((set) => ({
  language: defaultLanguage,
  fontSize: 'medium',
  highContrast: false,
  lowLiteracyMode: false,
  ttsSpeed: 1.0,
  sidebarOpen: false,

  setLanguage: (lang) => set({ language: lang }),
  setFontSize: (size) => set({ fontSize: size }),
  toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
  toggleLowLiteracyMode: () => set((s) => ({ lowLiteracyMode: !s.lowLiteracyMode })),
  setTTSSpeed: (speed) => set({ ttsSpeed: speed }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// ============================================
// AUDIO STORE — Recording state
// ============================================

interface AudioState {
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: number;
  transcription: string;
  confidence: number;

  setRecording: (recording: boolean) => void;
  setPaused: (paused: boolean) => void;
  setAudioLevel: (level: number) => void;
  setTranscription: (text: string, confidence: number) => void;
  resetAudio: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isRecording: false,
  isPaused: false,
  audioLevel: 0,
  transcription: '',
  confidence: 0,

  setRecording: (recording) => set({ isRecording: recording }),
  setPaused: (paused) => set({ isPaused: paused }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setTranscription: (text, confidence) => set({ transcription: text, confidence }),
  resetAudio: () =>
    set({
      isRecording: false,
      isPaused: false,
      audioLevel: 0,
      transcription: '',
      confidence: 0,
    }),
}));
