'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import apiServiceHandler from '../service/apiService';

const RECORDER_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

// Quiet speakers: the recorded audio is amplified (then compressed so loud
// voices don't clip) before it's sent for transcription.
const MIC_GAIN = 2.5;

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return RECORDER_MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

// Microphone stream with the browser's auto-gain / noise suppression on, run
// through a gain + compressor so a low voice still records at a usable level.
async function openBoostedMicStream() {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const stopRaw = () => raw.getTracks().forEach(t => t.stop());
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const src  = ctx.createMediaStreamSource(raw);
    const gain = ctx.createGain();
    gain.gain.value = MIC_GAIN;
    const comp = ctx.createDynamicsCompressor();
    const dest = ctx.createMediaStreamDestination();
    src.connect(gain).connect(comp).connect(dest);
    return { stream: dest.stream, close: () => { stopRaw(); ctx.close().catch(() => {}); } };
  } catch {
    return { stream: raw, close: stopRaw };
  }
}

/**
 * Voice-to-text input for a single answer box. Prefers the browser's native
 * SpeechRecognition (live, word-by-word transcript) where available (Chrome/Edge).
 * Firefox and other browsers without SpeechRecognition fall back to recording audio via
 * MediaRecorder and transcribing it server-side (OpenAI Whisper, POST speech/transcribe)
 * once the learner stops the recording — the transcript then appears after a short delay
 * instead of live.
 *
 * Low voices: native recognition often hears nothing from a quiet speaker, so
 * alongside it a volume-boosted backup recording is made; if live recognition
 * produced no text by the time the learner stops, the backup is transcribed
 * server-side instead. Native recognition that stops on its own after a pause
 * is restarted until the learner taps stop.
 */
export default function useVoiceAnswer() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState('');

  const recognitionRef = useRef(null);
  const recorderRef = useRef(null); // { rec, close } — MediaRecorder (fallback or backup)
  const userStoppedRef = useRef(false);
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

  async function transcribeBlob(blob, mySession) {
    setIsTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'answer.webm');
      const res = await apiServiceHandler('POST', 'speech/transcribe', fd);
      const text = String(res?.data?.text ?? '').trim();
      if (sessionIdRef.current !== mySession) return;
      if (text) setTranscript(prev => (prev ? `${prev} ${text}`.trim() : text));
      else setMicError('We couldn’t hear an answer. Move closer to the microphone and speak a little louder.');
    } catch {
      if (sessionIdRef.current === mySession) {
        setMicError('Could not transcribe your recording. Please try again.');
      }
    } finally {
      if (sessionIdRef.current === mySession) setIsTranscribing(false);
    }
  }

  // Starts a boosted MediaRecorder. onDone(blob|null) runs when it stops.
  async function startRecorder(onDone) {
    const { stream, close } = await openBoostedMicStream();
    const mimeType = pickRecorderMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      close();
      const blob = chunks.length ? new Blob(chunks, { type: rec.mimeType || 'audio/webm' }) : null;
      onDone(blob && blob.size > 0 ? blob : null);
    };
    const handle = { rec, close };
    recorderRef.current = handle;
    rec.start();
    return handle;
  }

  // Stops the given recorder (default: the current one). Passing the handle
  // keeps an old session's cleanup from stopping a newer recording.
  function stopRecorder(handle = recorderRef.current) {
    if (!handle) return;
    if (recorderRef.current === handle) recorderRef.current = null;
    if (handle.rec.state !== 'inactive') handle.rec.stop();
  }

  function startNativeRecording() {
    const mySession = sessionIdRef.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    // An empty string here causes some browsers to reject the request outright —
    // fall back to the page's language, defaulting to English.
    rec.lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'en-US';
    let final = transcript;
    let heardSomething = false;
    let fatal = false;

    // Backup recording for quiet voices — transcribed only if live recognition
    // came up empty. Failing to start it (e.g. no second mic handle) is fine.
    let backupBlob = null;
    let backupDone = !hasMediaRecorder;
    let recognitionDone = false;
    let backupHandle = null;
    let stopBackupWhenReady = false;
    const finishIfReady = () => {
      if (!recognitionDone || !backupDone) return;
      if (sessionIdRef.current !== mySession || fatal) return;
      if (!heardSomething && backupBlob) transcribeBlob(backupBlob, mySession);
      else if (!heardSomething) setMicError('No speech detected. Speak a little louder, closer to the microphone.');
    };
    if (hasMediaRecorder) {
      startRecorder(blob => { backupBlob = blob; backupDone = true; finishIfReady(); })
        .then(h => { backupHandle = h; if (stopBackupWhenReady) stopRecorder(h); })
        .catch(() => { backupDone = true; finishIfReady(); });
    }

    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (text.trim()) heardSomething = true;
        if (e.results[i].isFinal) final += text;
        else interim += text;
      }
      if (sessionIdRef.current === mySession) setTranscript(final + interim);
    };
    rec.onend = () => {
      // Chrome ends a "continuous" session after a stretch of silence — keep
      // listening until the learner taps stop.
      if (!userStoppedRef.current && !fatal && sessionIdRef.current === mySession) {
        try { rec.start(); return; } catch { /* fall through and finish */ }
      }
      if (recognitionRef.current === rec) recognitionRef.current = null;
      if (sessionIdRef.current === mySession) setIsRecording(false);
      recognitionDone = true;
      if (backupHandle) stopRecorder(backupHandle);
      else stopBackupWhenReady = true; // backup mic still opening — stop it once it starts
      finishIfReady();
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // onend restarts / finishes
      fatal = true;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone access was blocked. Allow microphone permission in your browser and try again.');
      } else if (e.error === 'network') {
        setMicError('Speech recognition needs an internet connection. Check your connection and try again.');
      } else {
        setMicError('Speech recognition ran into an error. Please try again.');
      }
    };
    recognitionRef.current = rec;
    userStoppedRef.current = false;
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      recognitionDone = true;
      if (backupHandle) stopRecorder(backupHandle); else stopBackupWhenReady = true;
      setMicError('Could not start the microphone. Please try again.');
    }
  }

  async function startRecordedFallback() {
    const mySession = sessionIdRef.current;
    try {
      await startRecorder(blob => {
        setIsRecording(false);
        if (!blob || sessionIdRef.current !== mySession) return;
        transcribeBlob(blob, mySession);
      });
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
    userStoppedRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // onend stops the backup recorder and finishes up
      return;
    }
    if (recorderRef.current) {
      stopRecorder(); // onstop flips isRecording off once transcription kicks off
      return;
    }
    setIsRecording(false);
  }

  // Discards the current answer text (and any recording in progress) so the
  // learner can start over.
  const clear = useCallback(() => {
    userStoppedRef.current = true;
    sessionIdRef.current += 1; // pending results/transcriptions are ignored
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    stopRecorder();
    setIsRecording(false);
    setTranscript('');
    setRecordTime(0);
    setMicError('');
    setIsTranscribing(false);
  }, []);

  return {
    transcript, setTranscript,
    isRecording, recordTime, micError, isTranscribing,
    startRecording, stopRecording, reset, clear,
    // Whether voice input for this browser goes through the record-then-transcribe
    // fallback (no live text) rather than native live SpeechRecognition.
    usesFallback: !hasNativeSpeech && hasMediaRecorder,
  };
}
