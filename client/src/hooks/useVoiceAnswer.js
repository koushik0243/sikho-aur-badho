'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import apiServiceHandler from '../service/apiService';

const RECORDER_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return RECORDER_MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

/**
 * Voice-to-text input for a single answer box. Prefers the browser's native
 * SpeechRecognition (live, word-by-word transcript) where available (Chrome/Edge).
 * Firefox and other browsers without SpeechRecognition fall back to recording audio via
 * MediaRecorder and transcribing it server-side (OpenAI Whisper, POST speech/transcribe)
 * once the learner stops the recording — the transcript then appears after a short delay
 * instead of live.
 */
export default function useVoiceAnswer() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  // Bumped by reset() so a MediaRecorder transcription that resolves after the learner
  // has already moved on to another question can't clobber that question's transcript.
  const sessionIdRef = useRef(0);

  const hasNativeSpeech = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  // Recording stopwatch
  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordTime(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const reset = useCallback((initialTranscript = '') => {
    sessionIdRef.current += 1;
    setTranscript(initialTranscript);
    setRecordTime(0);
    setMicError('');
    setIsTranscribing(false);
  }, []);

  function startNativeRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    // An empty string here causes some browsers to reject the request outright —
    // fall back to the page's language, defaulting to English.
    rec.lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en-US';
    let final = transcript;
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final + interim);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = (e) => {
      setIsRecording(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone access was blocked. Allow microphone permission in your browser and try again.');
      } else if (e.error === 'no-speech') {
        setMicError('No speech detected. Try again and speak after tapping the mic.');
      } else if (e.error === 'network') {
        setMicError('Speech recognition needs an internet connection. Check your connection and try again.');
      } else {
        setMicError('Speech recognition ran into an error. Please try again.');
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      setMicError('Could not start the microphone. Please try again.');
    }
  }

  async function startRecordedFallback() {
    const mySession = sessionIdRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      rec.ondataavailable = e => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.length === 0 || sessionIdRef.current !== mySession) return;

        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'answer.webm');
          const res = await apiServiceHandler('POST', 'speech/transcribe', fd);
          const text = String(res?.data?.text ?? '').trim();
          if (sessionIdRef.current === mySession) {
            setTranscript(prev => (prev ? `${prev} ${text}`.trim() : text));
          }
        } catch {
          if (sessionIdRef.current === mySession) {
            setMicError('Could not transcribe your recording. Please try again.');
          }
        } finally {
          if (sessionIdRef.current === mySession) setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      setMicError('Microphone access was blocked or unavailable. Allow microphone permission and try again.');
    }
  }

  function startRecording() {
    setMicError('');
    if (hasNativeSpeech) {
      startNativeRecording();
    } else if (hasMediaRecorder) {
      startRecordedFallback();
    } else {
      setMicError('Voice input isn’t supported in this browser.');
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // onstop flips isRecording off once transcription kicks off
      mediaRecorderRef.current = null;
      return;
    }
    setIsRecording(false);
  }

  return {
    transcript, setTranscript,
    isRecording, recordTime, micError, isTranscribing,
    startRecording, stopRecording, reset,
    // Whether voice input for this browser goes through the record-then-transcribe
    // fallback (no live text) rather than native live SpeechRecognition.
    usesFallback: !hasNativeSpeech && hasMediaRecorder,
  };
}
