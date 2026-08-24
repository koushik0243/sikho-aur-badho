'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser } from '../../../../redux/slices/authSlice';
import apiServiceHandler, { clearGetCache } from '../../../../service/apiService';
import { API_URL } from '../../../../lib/constant';
import useVoiceAnswer from '../../../../hooks/useVoiceAnswer';
import s from "./CourseView.module.css";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  star:     <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>,
  users:    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>,
  clock:    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>,
  calendar: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>,
  play:     <svg viewBox="0 0 20 20" fill="currentColor"><path width="24" height="24"d="M8 5L19 12L8 19V5Z" /></svg>,
  pause:    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
  playFill: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>,
  rewind:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>,
  forward:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg>,
  caption:  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2h2a2 2 0 012 2v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4a2 2 0 012-2h2a2 2 0 012 2v1z"/></svg>,
  thumbUp:  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>,
  thumbDn:  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z"/></svg>,
  settings: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>,
  lock:     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>,
  check:    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>,
  chevDown: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>,
  mic:      <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/></svg>,
  send:     <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>,
  camera:   <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>,
  clipCheck:<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
  fileDown: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg>,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArr(res) {
  if (Array.isArray(res))                return res;
  if (Array.isArray(res?.data))          return res.data;
  if (Array.isArray(res?.data?.data))    return res.data.data;
  if (Array.isArray(res?.data?.list))    return res.data.list;
  if (Array.isArray(res?.list))          return res.list;
  if (Array.isArray(res?.result))        return res.result;
  return [];
}

function fmtDur(hr, min, sec) {
  const h = Number(hr || 0), m = Number(min || 0), sc = Number(sec || 0);
  if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
  if (m > 0) return `${m}:${String(sc).padStart(2, '0')} min`;
  if (sc > 0) return `${sc}s`;
  return null;
}
function fmtSecs(secs) {
  if (!secs || isNaN(secs) || secs <= 0) return null;
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  if (m > 0) return `${m}:${String(s).padStart(2, '0')} min`;
  return `${s}s`;
}
function timeAgo(d) {
  if (!d) return 'Recently';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  const w = Math.floor(days / 7);
  return w < 5 ? `${w} week${w > 1 ? 's' : ''} ago` : new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── VideoPlayer ───────────────────────────────────────────────────────────────
function VideoPlayer({ videoSrc, imgSrc, isPlaying, onToggle, onPlayStateChange, topicId, courseId, savedPosition, onProgress, onDurationLoad, isCompleted, serverPct }) {
  const videoRef      = useRef(null);
  const lastSavedRef  = useRef(0);
  const maxReachedRef = useRef(0); // furthest second ever reached this session
  const [paused,   setPaused]   = useState(true);
  const [timeNow,  setTimeNow]  = useState(0);
  const [dur,      setDur]      = useState(0);
  const [speed,    setSpeed]    = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null

  // When topic changes: restore saved position and reset session tracking
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const pos = savedPosition || 0;
    maxReachedRef.current = pos;   // set BEFORE currentTime so handleSeeking doesn't block it
    v.currentTime = pos;
    setTimeNow(pos);
    setPaused(true);
    onPlayStateChange?.(false);
  }, [topicId]);

  function saveProgress(v) {
    if (!topicId || !courseId || !v.duration) return;
    onProgress?.({ topicId, courseId, watchedSeconds: Math.floor(v.currentTime), durationSeconds: Math.floor(v.duration), lastPosition: Math.floor(v.currentTime) });
    lastSavedRef.current = Date.now();
  }

  function handleTimeUpdate(e) {
    const v  = e.target;
    const ct = v.currentTime;
    if (ct > maxReachedRef.current) maxReachedRef.current = ct;
    setTimeNow(ct);
    if (Date.now() - lastSavedRef.current >= 10000) saveProgress(v);
  }

  // Block forward-seeks: user cannot skip to unseen parts
  function handleSeeking(e) {
    const v = e.target;
    if (v.currentTime > maxReachedRef.current + 0.5) {
      v.currentTime = maxReachedRef.current;
    }
  }

  function handleEnded(e) {
    const v = e.target;
    if (!topicId || !courseId || !v.duration) return;
    const d = Math.floor(v.duration);
    onProgress?.({ topicId, courseId, watchedSeconds: d, durationSeconds: d, lastPosition: 0 });
    maxReachedRef.current = d;
    setPaused(true);
    onPlayStateChange?.(false);
  }

  function handleLoadedMetadata(e) {
    const d = e.target.duration || 0;
    setDur(d);
    if (d > 0) onDurationLoad?.(topicId, d);
  }
  function handlePlay()  { setPaused(false); onPlayStateChange?.(true); }
  function handlePause() { setPaused(true); onPlayStateChange?.(false); }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.play(); else v.pause();
  }

  function handleRewatch() {
    const v = videoRef.current;
    if (!v) return;
    maxReachedRef.current = 0;
    v.currentTime = 0;
    setTimeNow(0);
    v.play();
  }

  const SPEEDS = [1, 1.25, 1.5, 2];
  function cycleSpeed() {
    const v = videoRef.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (v) v.playbackRate = next;
  }

  // Rewind is always safe; forward is clamped to the furthest-watched point
  // so users still can't skip ahead of unseen content.
  function seekRelative(delta) {
    const v = videoRef.current;
    if (!v) return;
    const cap = delta > 0 ? maxReachedRef.current : v.duration || 0;
    const target = Math.max(0, Math.min(v.currentTime + delta, cap));
    v.currentTime = target;
    setTimeNow(target);
  }

  // Clicking the progress track seeks within the already-watched region only
  function handleProgressClick(e) {
    const v = videoRef.current;
    if (!v || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pct * dur;
    if (target <= maxReachedRef.current + 0.5) {
      v.currentTime = target;
      setTimeNow(target);
    }
  }

  function fmtT(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // localPct: real-time playback position bar
  const localPct   = dur > 0 ? Math.min(100, Math.round((timeNow / dur) * 100)) : 0;
  // displayPct: best-ever watched % (server-persisted, shown as badge)
  const displayPct = serverPct > 0 ? serverPct : Math.min(100, dur > 0 ? Math.round((maxReachedRef.current / dur) * 100) : 0);
  // Show Re-watch when video is server-completed and currently paused at start
  const showRewatch = isCompleted && paused && timeNow < 1;

  if (videoSrc) {
    return (
      <>
        <div className={s.videoWrap}>
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            className={s.videoElement}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={handleEnded}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={handlePlay}
            onPause={handlePause}
            onClick={togglePlay}
          />

          {/* Watched % badge — top-right */}
          <div className={s.watchPctBadge}>
            {isCompleted
              ? <span className={s.watchPctCompleted}>{Icon.check} Completed</span>
              : displayPct > 0
                ? <span>{displayPct}% watched</span>
                : null
            }
          </div>
        </div>

        {/* Progress bar — below the video. Seeking is limited to the
            already-watched region so users still can't skip ahead. */}
        <div className={s.videoProgressWrap} onClick={handleProgressClick}>
          <div className={s.videoProgressTrack}>
            <div className={s.videoProgressFill} style={{ width: `${localPct}%` }}/>
            {displayPct > localPct && (
              <div className={s.videoProgressMax} style={{ left: `${displayPct}%` }}/>
            )}
            <div className={s.videoProgressHandle} style={{ left: `${localPct}%` }}/>
          </div>
        </div>

        {/* Control bar — below the progress bar, own light background */}
        <div className={s.videoControlBar}>
          <div className={s.videoControlLeft}>
            {showRewatch ? (
              <button className={s.rewatchBtn} onClick={handleRewatch}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                </svg>
                Re-watch
              </button>
            ) : (
              <button className={s.videoCtrlIconBtn} onClick={togglePlay} title={paused ? 'Play' : 'Pause'}>
                {paused ? Icon.playFill : Icon.pause}
              </button>
            )}
            <button className={s.videoCtrlIconBtn} onClick={() => seekRelative(-10)} title="Rewind 10s">
              {Icon.rewind}
            </button>
            <button className={s.speedBadge} onClick={cycleSpeed} title="Playback speed">
              {speed}x
            </button>
            <button className={s.videoCtrlIconBtn} onClick={() => seekRelative(10)} title="Forward 10s">
              {Icon.forward}
            </button>
            <span className={s.videoTimeTxt}>{fmtT(timeNow)} / {fmtT(dur)}</span>
          </div>
          <div className={s.videoControlRight}>
            <button
              className={`${s.videoCtrlIconBtn} ${captionsOn ? s.videoCtrlIconBtnActive : ''}`}
              onClick={() => setCaptionsOn(v => !v)}
              title="Captions">
              {Icon.caption}
            </button>
            <button
              className={`${s.videoCtrlIconBtn} ${feedback === 'up' ? s.videoCtrlIconBtnActive : ''}`}
              onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
              title="Helpful">
              {Icon.thumbUp}
            </button>
            <button
              className={`${s.videoCtrlIconBtn} ${feedback === 'down' ? s.videoCtrlIconBtnActive : ''}`}
              onClick={() => setFeedback(f => f === 'down' ? null : 'down')}
              title="Not helpful">
              {Icon.thumbDn}
            </button>
            <button className={s.videoCtrlIconBtn} title="Settings">
              {Icon.settings}
            </button>
          </div>
        </div>
      </>
    );
  }

  // No-video fallback
  return (
    <div className={s.videoWrap}>
      {imgSrc
        ? <img src={imgSrc} alt="" className={s.videoThumb}/>
        : <div className={s.videoPlaceholder}/>
      }
      <div className={s.playOverlay}>
        <button className={s.playCircle} onClick={onToggle}>
          {isPlaying ? Icon.pause : Icon.playFill}
        </button>
      </div>
      <div className={s.controls}>
        <button className={s.ctrlBtn}>{isPlaying ? Icon.pause : Icon.play}</button>
        <span className={s.ctrlGap}/>
      </div>
    </div>
  );
}

// ── OverviewTab ───────────────────────────────────────────────────────────────
function OverviewTab({ course, chapter }) {
  const points = [];
  if (course?.what_will_learn) points.push(course.what_will_learn);
  if (chapter?.desc) points.push(chapter.desc);
  const fallback = [
    'Sequential unlock — previous chapter must be passed',
    'Must watch 100% to unlock quiz',
    'Playback tracking (5s intervals)',
    'Admin override available',
  ];
  return (
    <div className={s.overviewSection}>
      {course?.desc && <p className={s.overviewDesc}>{course.desc}</p>}
      <h4 className={s.overviewTitle}>Chapter logic</h4>
      <ul className={s.bulletList}>
        {(points.length > 0 ? points : fallback).map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}

// ── NoteTab ───────────────────────────────────────────────────────────────────
function NoteTab({ courseId, chapterId, topicId, topicTitle, notes, setNotes }) {
  const [text,   setText]   = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiServiceHandler('POST', 'note/create', {
        courseId,
        chapterId: chapterId || undefined,
        topicId:   topicId   || undefined,
        text: text.trim(),
      });
      const newNote = res?.data ?? res;
      if (newNote?._id) {
        setNotes(prev => [newNote, ...prev]);
        setText('');
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await apiServiceHandler('DELETE', `note/delete/${id}`);
      setNotes(prev => prev.filter(n => String(n._id) !== String(id)));
    } catch { /* silent */ }
  }

  function fmtNoteDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · '
      + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={s.noteWrap}>
      <span className={s.contextChip}>@ {topicTitle || 'Current Topic'}</span>
      <textarea
        className={s.noteArea}
        placeholder="Write your notes here…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleSave(); }}
      />
      <div className={s.noteFooter}>
        <span className={s.noteHint}>Ctrl+Enter to save</span>
        <button className={s.sendBtn} onClick={handleSave} disabled={!text.trim() || saving} title="Save note">
          {saving ? <span style={{fontSize:11,padding:'0 4px'}}>…</span> : Icon.send}
        </button>
      </div>

      {/* Saved notes list */}
      {notes.length > 0 ? (
        <div className={s.notesList}>
          <p className={s.notesListLabel}>Saved Notes ({notes.length})</p>
          {notes.map(n => (
            <div key={String(n._id)} className={s.noteItem}>
              <div className={s.noteItemHeader}>
                <span className={s.noteItemDate}>{fmtNoteDate(n.createdAt)}</span>
                <button className={s.noteDeleteBtn} onClick={() => handleDelete(n._id)} title="Delete">✕</button>
              </div>
              <p className={s.noteItemText}>{n.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={s.notesEmpty}>No notes saved for this topic yet.</p>
      )}
    </div>
  );
}

// ── ReviewsTab ────────────────────────────────────────────────────────────────
const RATING_LABEL = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function ReviewsTab({ enableReview, courseId, chapterId }) {
  const [reviews,      setReviews]      = useState([]);
  const [myReview,     setMyReview]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [userRating,   setUserRating]   = useState(0);
  const [hover,        setHover]        = useState(0);
  const [reviewText,   setReviewText]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({}); // reviewId -> 'up' | 'down' (local only, no backend support)

  useEffect(() => {
    if (!courseId || !chapterId) return;
    let cancelled = false;
    async function fetchReviews() {
      setLoading(true);
      try {
        const [listRes, mineRes] = await Promise.all([
          apiServiceHandler('GET', `review/list?courseId=${courseId}&chapterId=${chapterId}`).catch(() => null),
          apiServiceHandler('GET', `review/mine?chapterId=${chapterId}`).catch(() => null),
        ]);
        if (cancelled) return;
        setReviews(toArr(listRes));
        const mine = mineRes?.data ?? mineRes;
        if (mine?._id) {
          setMyReview(mine);
          setUserRating(mine.rating || 0);
          setReviewText(mine.text || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchReviews();
    return () => { cancelled = true; };
  }, [courseId, chapterId]);

  if (!enableReview) {
    return (
      <div className={s.reviewsDisabled}>
        <span className={s.reviewsDisabledIcon}>{Icon.lock}</span>
        <p className={s.reviewsDisabledMsg}>Reviews are disabled for this course.</p>
        <p className={s.reviewsDisabledSub}>The instructor has turned off reviews for this content.</p>
      </div>
    );
  }

  async function handleSubmit() {
    if (!userRating || !reviewText.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiServiceHandler('POST', 'review/submit', {
        courseId, chapterId,
        rating: userRating,
        text: reviewText.trim(),
      });
      const saved = res?.data ?? res;
      if (saved?._id) {
        setMyReview(saved);
        setReviews(prev => {
          const without = prev.filter(r => String(r._id) !== String(saved._id));
          return [{ ...saved, userId: { name: 'You' } }, ...without];
        });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  function fmtDate(d) {
    if (!d) return '';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    const w = Math.floor(days / 7);
    return w < 5 ? `${w} week${w > 1 ? 's' : ''} ago`
      : new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  const activeRating = hover || userRating;
  const alreadyReviewed = !!myReview;

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews) * 10) / 10
    : 0;
  const starCounts = [5, 4, 3, 2, 1].map(star => reviews.filter(r => r.rating === star).length);

  function toggleHelpful(reviewId, vote) {
    setHelpfulVotes(prev => ({ ...prev, [reviewId]: prev[reviewId] === vote ? null : vote }));
  }

  return (
    <div className={s.reviewsWrap}>
      {/* ── Rating summary ── */}
      <div className={s.reviewSummaryCard}>
        <div className={s.reviewSummaryLeft}>
          <span className={s.reviewsPill}>Reviews</span>
          <h3 className={s.reviewSummaryTitle}>Our Customer Reviews</h3>
          <p className={s.leaveRatingLabel}>Leave a Rating</p>
          <div className={s.reviewStarRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n}
                style={{ cursor: 'pointer', color: activeRating >= n ? '#f59e0b' : '#d1d5db', display: 'flex' }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setUserRating(n)}>
                {Icon.star}
              </span>
            ))}
            {userRating > 0 && <span className={s.ratingHint}>{RATING_LABEL[userRating]}</span>}
          </div>
        </div>

        {totalReviews > 0 && (
          <div className={s.reviewSummaryRight}>
            <div className={s.reviewAvgBox}>
              <span className={s.reviewAvgNum}>{avgRating}</span>
              <div className={s.reviewAvgStars}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} style={{ color: Math.round(avgRating) >= n ? '#f59e0b' : '#d1d5db' }}>{Icon.star}</span>
                ))}
              </div>
              <span className={s.reviewAvgCount}>{totalReviews} Rating{totalReviews !== 1 ? 's' : ''}</span>
            </div>
            <div className={s.reviewBars}>
              {[5, 4, 3, 2, 1].map((star, i) => {
                const pct = totalReviews > 0 ? Math.round((starCounts[i] / totalReviews) * 100) : 0;
                return (
                  <div className={s.reviewBarRow} key={star}>
                    <span className={s.reviewBarLabel}>{star}</span>
                    <div className={s.reviewBarTrack}>
                      <div className={s.reviewBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={s.reviewBarPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Write / Edit review form ── */}
      <div className={s.reviewFormBox}>
        <h4 className={s.reviewFormTitle}>
          {alreadyReviewed ? 'Your Review for this Chapter' : 'Write a Review'}
        </h4>
        {userRating === 0 && (
          <p className={s.reviewFormHint}>Pick a star rating above, then share a few words about this chapter.</p>
        )}
        <textarea
          className={s.reviewTextarea}
          placeholder="Share your experience with this chapter..."
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          rows={3}
        />
        <div className={s.reviewFormFooter}>
          {submitted && <p className={s.reviewSuccess}>
            {alreadyReviewed ? 'Review updated!' : 'Thank you! Your review has been submitted.'}
          </p>}
          <button className={s.reviewSubmitBtn} onClick={handleSubmit}
            disabled={!userRating || !reviewText.trim() || saving}>
            {saving ? 'Saving…' : alreadyReviewed ? 'Update Review' : 'Submit Review'}
          </button>
        </div>
      </div>

      {/* ── Review list */}
      {loading ? (
        <p className={s.reviewsLoading}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className={s.reviewsEmpty}>No reviews yet for this chapter. Be the first!</p>
      ) : (
        <>
          <h3 className={s.reviewsListTitle}>Chapter Reviews ({reviews.length})</h3>
          {reviews.map((r) => {
            const name = r.userId?.name || 'Learner';
            const rid  = String(r._id);
            const vote = helpfulVotes[rid];
            return (
              <div key={rid} className={s.reviewCard}>
                <div className={s.reviewAvatar}>{name[0].toUpperCase()}</div>
                <div className={s.reviewBody}>
                  <div className={s.reviewMeta}>
                    <span className={s.reviewName}>{name}</span>
                    <span className={s.reviewAge}>{fmtDate(r.createdAt)}</span>
                  </div>
                  <div className={s.reviewStars}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ color: r.rating >= n ? '#f59e0b' : '#d1d5db' }}>{Icon.star}</span>
                    ))}
                  </div>
                  <p className={s.reviewText}>{r.text}</p>
                  <div className={s.reviewHelpfulRow}>
                    <span className={s.reviewHelpfulLabel}>Was this review helpful?</span>
                    <button
                      className={`${s.reviewHelpfulBtn} ${vote === 'up' ? s.reviewHelpfulBtnActive : ''}`}
                      onClick={() => toggleHelpful(rid, 'up')}
                      aria-label="Mark helpful">
                      {Icon.thumbUp}
                    </button>
                    <button
                      className={`${s.reviewHelpfulBtn} ${vote === 'down' ? s.reviewHelpfulBtnActive : ''}`}
                      onClick={() => toggleHelpful(rid, 'down')}
                      aria-label="Mark not helpful">
                      {Icon.thumbDn}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Topic type detection ──────────────────────────────────────────────────────
function getTopicType(topic) {
  if (!topic) return 'lesson';
  const vt = String(topic.video_type || topic.type || topic.contentType || '').toLowerCase().trim();
  if (vt === 'zoom_link' || vt === 'zoom' || vt === 'live' || vt === 'meeting') return 'zoom';
  if (vt === 'quiz') return 'quiz';
  if (vt === 'assignment') return 'assignment';
  // 'lesson' is the video/watch type
  return 'lesson';
}

function getTopicIcon(topic, isActive) {
  const type = getTopicType(topic);
  if (type === 'zoom')       return Icon.camera;
  if (type === 'quiz')       return Icon.clipCheck;
  if (type === 'assignment') return Icon.fileDown;
  return isActive ? Icon.pause : Icon.play;
}

// ── ZoomPanel ─────────────────────────────────────────────────────────────────
function ZoomPanel({ topic }) {
  const link = topic.videoUrl || topic.zoom_link || topic.zoomUrl || topic.link || '';
  const rawTime = topic.zoom_time || topic.scheduled_at || topic.start_time || null;

  function fmtZoomTime(d) {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const displayTime = fmtZoomTime(rawTime);

  return (
    <div className={s.zoomPanel}>
      <div className={s.zoomMeta}>
        <p className={s.zoomMetaRow}>
          <span className={s.zoomMetaLabel}>Topic:</span>{' '}{topic.title}
        </p>
        {displayTime && (
          <p className={s.zoomMetaRow}>
            <span className={s.zoomMetaLabel}>Time:</span>{' '}{displayTime}
          </p>
        )}
      </div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={s.zoomJoinBtn}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" style={{flexShrink:0}}>
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
          </svg>
          Join The Zoom Meeting
        </a>
      ) : (
        <p className={s.panelNote}>Zoom link will be available when the session goes live.</p>
      )}
    </div>
  );
}

// ── QuizPanel ─────────────────────────────────────────────────────────────────
const QuizIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

function ResultCircle({ passed, s }) {
  if (passed) {
    return (
      <div className={s.circleWrap}>
        <div className={`${s.circle} ${s.circlePassed}`}>
          <svg viewBox="0 0 48 48" fill="none" width="52" height="52">
            <circle cx="24" cy="24" r="22" stroke="#16a34a" strokeWidth="3" fill="#dcfce7" />
            <path d="M14 24l7 7 13-13" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className={`${s.circleRing} ${s.circleRingPassed}`} />
      </div>
    );
  }
  return (
    <div className={s.circleWrap}>
      <div className={`${s.circle} ${s.circleFailed}`}>
        <svg viewBox="0 0 48 48" fill="none" width="52" height="52">
          <circle cx="24" cy="24" r="22" stroke="#dc2626" strokeWidth="3" fill="#fee2e2" />
          <path d="M16 16l16 16M32 16L16 32" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className={`${s.circleRing} ${s.circleRingFailed}`} />
    </div>
  );
}

const QRowCheckIcon = (
  <svg viewBox="0 0 20 20" fill="none" width="13" height="13">
    <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QRowXIcon = (
  <svg viewBox="0 0 20 20" fill="none" width="12" height="12">
    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

function QuizPanel({ topic, chapterTitle, onQuizPass }) {
  const [phase,       setPhase]       = useState('start');
  const [questions,   setQuestions]   = useState([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState({});   // qId -> { transcript, status }
  const [quizTimeLeft, setQuizTimeLeft] = useState(3600); // 60-minute total timer
  const [evalResult,   setEvalResult]   = useState(null);
  const {
    transcript, setTranscript,
    isRecording, recordTime, micError, isTranscribing,
    startRecording, stopRecording, reset: resetVoiceInput, usesFallback,
  } = useVoiceAnswer();
  const answersRef     = useRef({});
  answersRef.current   = answers;

  async function startQuiz() {
    setPhase('loading');
    try {
      // forLearner=true opts into the server's aptitude-level-weighted question selection
      // (see quiz_question.service.js listQuestionsForLearner) instead of the full admin pool.
      const res = await apiServiceHandler('GET', `quiz-questions/list?quizId=${topic._id}&forLearner=true`);
      const qs  = toArr(res);
      if (qs.length === 0) { setPhase('empty'); return; }
      const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      const sorted = [...qs].sort((a, b) => {
        const da = diffOrder[String(a.difficulty || '').toLowerCase()] ?? 1;
        const db = diffOrder[String(b.difficulty || '').toLowerCase()] ?? 1;
        return da - db;
      });
      setQuestions(sorted);
      setCurrentIdx(0);
      setAnswers({});
      setEvalResult(null);
      setQuizTimeLeft(3600);
      setPhase('question');
    } catch { setPhase('empty'); }
  }

  // 60-minute total quiz countdown
  useEffect(() => {
    if (phase !== 'question') return;
    if (quizTimeLeft <= 0) { handleTimeExpired(); return; }
    const t = setTimeout(() => setQuizTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, quizTimeLeft]);

  // Reset mic + restore saved transcript on question change (timer continues across questions)
  useEffect(() => {
    if (phase !== 'question') return;
    stopRecording();
    const q     = questions[currentIdx];
    const saved = q ? answersRef.current[String(q._id)] : null;
    resetVoiceInput(saved?.transcript || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, phase]);

  function fmtSecs(n) {
    return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
  }

  function handleTimeExpired() {
    stopRecording();
    const allAnswers = { ...answers };
    const q = questions[currentIdx];
    if (q) allAnswers[String(q._id)] = { status: transcript ? 'answered' : 'skipped', transcript };
    for (let i = currentIdx + 1; i < questions.length; i++) {
      allAnswers[String(questions[i]._id)] = { status: 'skipped', transcript: '' };
    }
    submitQuiz(questions, allAnswers);
  }

  function advance(status) {
    stopRecording();
    const q   = questions[currentIdx];
    const qId = String(q._id);
    const saved = { status, transcript: status === 'answered' ? transcript : '' };
    const newAnswers = { ...answers, [qId]: saved };
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      submitQuiz(questions, newAnswers);
    } else {
      setCurrentIdx(i => i + 1);
    }
  }

  function goBack() {
    stopRecording();
    setCurrentIdx(i => i - 1);
  }

  function goForward() {
    stopRecording();
    if (currentIdx + 1 >= questions.length) {
      submitQuiz(questions, answers);
    } else {
      setCurrentIdx(i => i + 1);
    }
  }

  async function submitQuiz(qs, allAnswers) {
    setPhase('evaluating');
    try {
      const payload = {
        topicId:   topic._id,
        courseId:  topic.courseId  || undefined,
        chapterId: topic.chapterId || undefined,
        answers: qs.map(q => ({
          questionId:   q._id,
          questionText: q.question,
          userAnswer:   allAnswers[String(q._id)]?.transcript || '',
          status:       allAnswers[String(q._id)]?.status     || 'skipped',
        })),
      };
      const res    = await apiServiceHandler('POST', 'quiz-attempt/submit', payload);
      const result = res?.data || res;
      setEvalResult(result);
      if (result?.passed) onQuizPass?.(String(topic._id));
      setPhase('results');
    } catch {
      setPhase('results');
    }
  }

  // ── Start / Loading ──────────────────────────────────────────
  if (phase === 'start' || phase === 'loading') {
    return (
      <div className={s.panelInner}>
        <div className={s.panelIcon} style={{ background: '#fef9e7', color: '#d97706' }}>{QuizIcon}</div>
        <h3 className={s.panelTitle}>{topic.title}</h3>
        <p className={s.panelSub}>Complete this quiz to test your understanding of the chapter</p>
        <button className={s.panelBtn} onClick={startQuiz} disabled={phase === 'loading'}>
          {phase === 'loading' ? 'Loading…' : 'Start Quiz'}
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className={s.panelInner}>
        <div className={s.panelIcon} style={{ background: '#fef9e7', color: '#d97706' }}>{QuizIcon}</div>
        <h3 className={s.panelTitle}>{topic.title}</h3>
        <p className={s.panelSub}>No questions have been added to this quiz yet.</p>
        <button className={s.panelBtn} onClick={() => setPhase('start')}>Go Back</button>
      </div>
    );
  }

  // ── Evaluating ───────────────────────────────────────────────
  if (phase === 'evaluating') {
    return (
      <div className={s.quizEvaluating}>
        <div className={s.quizEvalSpinner}/>
        <h3 className={s.quizEvalTitle}>Evaluating Your Answers…</h3>
        <p className={s.quizEvalSub}>AI is reviewing your responses. This may take a moment.</p>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────
  if (phase === 'results') {
    const score       = evalResult?.totalScore ?? 0;
    const passed      = evalResult?.passed     ?? false;
    const evaluated   = evalResult?.answers    ?? [];
    const timeTaken   = Math.max(0, 3600 - quizTimeLeft);
    const timeTakenStr = `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`;
    const correctCount = evaluated.filter(a => a.status !== 'skipped' && a.maxScore > 0 && (a.aiScore / a.maxScore) * 100 >= 60).length;
    const chapterLabel  = chapterTitle ? `${chapterTitle} — ${topic.title}` : topic.title;

    return (
      <div className={s.resultWrap}>

        {/* Score card */}
        <div className={s.resultCard}>
          <div className={s.resultTopBar}>
            <h2 className={s.resultTitle}>Quiz Result</h2>
            <span className={`${s.resultBadge} ${passed ? s.badgePassed : s.badgeFailed}`}>
              {passed ? `Passed — ${score}%` : `Failed — ${score}%`}
            </span>
          </div>

          <div className={s.resultBody}>
            <ResultCircle passed={passed} s={s} />
            <h3 className={`${s.outcomeText} ${passed ? s.outcomePassed : s.outcomeFailed}`}>
              {passed ? 'Quiz Passed!' : 'Quiz Failed'}
            </h3>
            <p className={s.chapterLabel}>{chapterLabel}</p>

            <div className={s.resStatsRow}>
              <div className={s.resStat}>
                <span className={s.resStatVal}>{score}%</span>
                <span className={s.resStatLbl}>Final Score</span>
              </div>
              <div className={s.resStat}>
                <span className={s.resStatVal}>{correctCount}/{evaluated.length}</span>
                <span className={s.resStatLbl}>Correct</span>
              </div>
              <div className={s.resStat}>
                <span className={s.resStatVal}>{timeTakenStr}</span>
                <span className={s.resStatLbl}>Time Taken</span>
              </div>
            </div>

            <p className={s.threshold}>Pass Threshold: 60%</p>
          </div>
        </div>

        {/* Per-question breakdown */}
        {evaluated.length > 0 && (
          <div className={s.breakdownSection}>
            <p className={s.breakdownMeta}>My Progress</p>
            <h3 className={s.breakdownTitle}>Question Breakdown</h3>

            <div className={s.qList}>
              {evaluated.map((a, i) => {
                const skipped = a.status === 'skipped';
                const pct     = a.maxScore > 0 ? Math.round((a.aiScore / a.maxScore) * 100) : 0;
                const isWrong = skipped || pct < 60;
                return (
                  <div key={i} className={`${s.qRow} ${isWrong ? s.qRowWrong : ''}`}>
                    <span className={`${s.qIconCircle} ${isWrong ? s.qIconWrong : s.qIconOk}`}>
                      {isWrong ? QRowXIcon : QRowCheckIcon}
                    </span>
                    <div className={s.qContent}>
                      <p className={s.qText}>Q{i + 1} - {a.questionText}</p>
                      {skipped ? (
                        <span className={s.qSkipped}>Skipped</span>
                      ) : a.userAnswer ? (
                        <p className={s.qAnswerText}>{a.userAnswer}</p>
                      ) : null}
                      {a.aiFeedback && <p className={s.qFeedback}>{a.aiFeedback}</p>}
                    </div>
                    <span className={`${s.qScorePill} ${isWrong ? s.qScorePillWrong : s.qScorePillOk}`}>
                      {skipped ? '—' : `${pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={s.resultBtns}>
          <button className={s.panelBtn}
            onClick={() => { setAnswers({}); setCurrentIdx(0); setQuizTimeLeft(3600); setEvalResult(null); setPhase('question'); }}>
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  // ── Question ─────────────────────────────────────────────────
  const q          = questions[currentIdx];
  const total      = questions.length;
  const qId        = String(q._id);
  const savedAns   = answers[qId];
  const isAnswered = savedAns?.status === 'answered';
  const hasBack    = currentIdx > 0;

  return (
    <div className={s.quizVoiceWrap}>
      {/* Header bar */}
      <div className={s.quizVoiceHeader}>
        <div className={s.quizVoiceHeaderLeft}>
          <span className={s.quizVoiceTitle}>{topic.title}</span>
          <span className={s.quizVoiceSep}>\</span>
          <span className={s.quizVoiceTag}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
            </svg>
            Voice Enabled
          </span>
        </div>
        <div className={s.quizVoiceStats}>
          <div className={s.quizVoiceStat}>
            <span className={s.quizVoiceStatLbl}>Watch</span>
            <span className={s.quizVoiceStatIcon}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
            </span>
          </div>
          <div className={s.quizVoiceStatDivider}/>
          <div className={s.quizVoiceStat}>
            <span className={s.quizVoiceStatLbl}>Time</span>
            <span className={s.quizVoiceStatVal} style={{ color: quizTimeLeft <= 300 ? '#dc2626' : undefined }}>
              {fmtSecs(quizTimeLeft)}
            </span>
          </div>
          <div className={s.quizVoiceStatDivider}/>
          <div className={s.quizVoiceStat}>
            <span className={s.quizVoiceStatLbl}>Q. No</span>
            <span className={s.quizVoiceStatVal}>Q{currentIdx + 1}/{total}</span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className={s.quizVoiceBody}>
        <p className={s.quizVoiceQuestion}>&ldquo;{q.question}&rdquo;</p>
        <p className={s.quizScoringTags}>
          Speech-To-Text &middot; Semantic Scoring &middot; Partial Credit Enabled
        </p>

        {/* Answer area */}
        <div className={s.quizVoiceAnswerBox}>
          <div className={s.quizTranscriptArea}>
            {isAnswered ? (
              <span>{savedAns.transcript || <em>No speech recorded.</em>}</span>
            ) : transcript ? (
              <span>{transcript}</span>
            ) : (
              <span className={s.quizTranscriptPlaceholder}>Your answer will appear here as you speak…</span>
            )}
          </div>

          {isAnswered ? (
            <div className={s.quizAnsweredBadge}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Answer submitted — read only
            </div>
          ) : (
            <div className={s.quizMicRow}>
              <button
                className={`${s.quizMicCircleBtn} ${isRecording ? s.quizMicActive : ''}`}
                onClick={() => isRecording ? stopRecording() : startRecording()}
                disabled={isTranscribing}
                title={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
                </svg>
              </button>
              <div className={s.quizWaveform}>
                {isRecording
                  ? [0,1,2,3,4,5,6,7].map(i => (
                      <span key={i} className={s.quizWaveBar} style={{ animationDelay: `${i * 80}ms` }}/>
                    ))
                  : [0,1,2,3,4,5,6,7].map(i => (
                      <span key={i} className={s.quizWaveBarStatic}/>
                    ))
                }
              </div>
              <span className={s.quizMicPrompt}>
                {isTranscribing
                  ? 'Transcribing your answer…'
                  : isRecording
                  ? (usesFallback ? 'Recording · Tap Mic To Stop And Transcribe…' : 'Tap Mic To Stop · Speak Clearly In Hindi Or English…')
                  : 'Tap Mic To Start · Speak Your Answer…'}
              </span>
              <span className={s.quizMicTimer}>{fmtSecs(recordTime)}</span>
            </div>
          )}

          {micError && <p className={s.quizMicError}>{micError}</p>}
        </div>
      </div>

      {/* Footer */}
      <div className={s.quizVoiceFooter}>
        {hasBack && (
          <button className={s.quizBackBtn} onClick={goBack}>
            ← Back
          </button>
        )}
        {isAnswered ? (
          <button className={s.quizSubmitAnswerBtn} onClick={goForward}>
            {currentIdx + 1 < total ? 'Next →' : 'Submit Quiz'}
          </button>
        ) : (
          <>
            <button
              className={s.quizSubmitAnswerBtn}
              onClick={() => advance('answered')}
              disabled={isRecording || isTranscribing}
            >
              Submit Answer
            </button>
            <button className={s.quizSkipBtn} onClick={() => advance('skipped')}>
              Skip Question
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── AssignmentPanel ───────────────────────────────────────────────────────────
function AssignmentPanel({ topic, isDone, onDone }) {
  const [downloading, setDownloading] = useState(false);
  const attachment = Array.isArray(topic.attachments) && topic.attachments.length > 0 ? topic.attachments[0] : null;
  const fileUrl  = attachment?.url || topic.videoUrl || topic.file_url || topic.fileUrl || '';
  const fileName = attachment?.name || (fileUrl ? fileUrl.split('/').pop() : 'assignment');

  async function handleDownload() {
    if (!fileUrl || downloading) return;
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`;
    setDownloading(true);
    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = fileName;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={s.panelInner}>
      <div className={s.panelIcon} style={{ background: isDone ? '#f0fdf4' : '#eff6ff', color: isDone ? '#16a34a' : '#2563eb' }}>
        {isDone ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        )}
      </div>
      <h3 className={s.panelTitle}>{topic.title}</h3>

      {isDone ? (
        <>
          <div className={s.assignDoneBadge}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Assignment Completed
          </div>
          {fileUrl && (
            <button className={s.panelBtn} onClick={handleDownload} disabled={downloading} style={{ marginTop: 12 }}>
              {downloading ? 'Downloading…' : 'Download Again'}
            </button>
          )}
        </>
      ) : (
        <>
          <p className={s.panelSub}>Download and complete the assignment, then mark it as done</p>
          <div className={s.assignBtnRow}>
            <button
              className={`${s.panelBtn}${(!fileUrl || downloading) ? ` ${s.panelBtnDisabled}` : ''}`}
              onClick={handleDownload}
              disabled={!fileUrl || downloading}
            >
              {downloading ? 'Downloading…' : 'Download'}
            </button>
            <button className={s.assignDoneBtn} onClick={() => onDone?.(String(topic._id))}>
              Mark as Done
            </button>
          </div>
          {!fileUrl && <p className={s.panelNote}>Assignment file will be uploaded by your instructor.</p>}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CourseDetailPage({ params }) {
  const { courseId } = use(params);
  const router   = useRouter();

  const [course,       setCourse]       = useState(null);
  const [chapters,     setChapters]     = useState([]);
  const [topics,       setTopics]       = useState([]);
  const [reviewStats,  setReviewStats]  = useState({ avgRating: 0, total: 0 });
  const [activeChId,   setActiveChId]   = useState(null);
  const [activeTopId,  setActiveTopId]  = useState(null);
  const [expanded,     setExpanded]     = useState({});
  const [activeTab,    setActiveTab]    = useState('overview');
  const [playing,      setPlaying]      = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [notes,           setNotes]           = useState([]);
  const [progressMap,     setProgressMap]     = useState({}); // topicId -> progress record
  const [quizPassedMap,   setQuizPassedMap]   = useState({}); // topicId -> true if any attempt passed
  const [assignDoneMap,   setAssignDoneMap]   = useState({}); // topicId -> true if marked done
  const [videoDurMap,     setVideoDurMap]     = useState({}); // topicId -> actual duration seconds
  const [enrolledCount,   setEnrolledCount]   = useState(0); // distinct learners assigned this course, across all orgs

  const user = useSelector(selectUser);
  const userId = user ? String(user._id || user.id || '') : '';

  useEffect(() => {
    clearGetCache();
    if (!courseId) return;
    let cancelled = false;

    async function load() {
      try {
        const [courseRes, chRes, topRes, statsRes, progRes, quizRes, assignRes] = await Promise.all([
          apiServiceHandler('GET', `course/${courseId}`).catch(() => null),
          apiServiceHandler('GET', `chapter/list?courseId=${courseId}`).catch(() => null),
          apiServiceHandler('GET', `topic/list?courseId=${courseId}`).catch(() => null),
          apiServiceHandler('GET', `review/stats?courseId=${courseId}`).catch(() => null),
          apiServiceHandler('GET', `progress/course?courseId=${courseId}`).catch(() => null),
          apiServiceHandler('GET', `quiz-attempt/course?courseId=${courseId}`).catch(() => null),
          // No orgId filter — counts learners assigned this course across every organization
          apiServiceHandler('GET', `course-assignment/list?courseId=${courseId}`).catch(() => null),
        ]);
        if (cancelled) return;

        const courseData  = courseRes?.data ?? courseRes;

        // Safety net: if this course requires an aptitude test and the learner
        // hasn't taken it yet (e.g. they navigated here directly by URL, bypassing
        // the course list's "Resume" gating), send them there first.
        const aptitudeSelectedIds = Array.isArray(courseData?.aptitudeSelectedQuestionIds)
          ? courseData.aptitudeSelectedQuestionIds
          : [];
        if (courseData?.aptitudeEnabled && aptitudeSelectedIds.length > 0) {
          const attemptRes = await apiServiceHandler('GET', `aptitude-attempt/list?courseId=${courseId}`).catch(() => null);
          if (cancelled) return;
          const priorAttempts = toArr(attemptRes);
          if (priorAttempts.length === 0) {
            router.replace(`/learner/courses/${courseId}/aptitude-test`);
            return;
          }
        }

        const chapterList = toArr(chRes);
        const topicList   = toArr(topRes);
        const stats       = statsRes?.data ?? statsRes;

        const assignedUserIds = new Set(
          toArr(assignRes)
            .map(a => String(a.userId?._id || a.userId || ''))
            .filter(Boolean)
        );
        setEnrolledCount(assignedUserIds.size);
        const progData    = progRes?.data ?? progRes;

        setCourse(courseData);
        setChapters(chapterList);
        setTopics(topicList);
        if (stats?.total !== undefined) setReviewStats(stats);
        if (Array.isArray(progData?.topics)) {
          const map = {};
          progData.topics.forEach(p => { map[String(p.topicId)] = p; });
          setProgressMap(map);
        }

        // Build quiz-passed map from historical attempts
        const attempts = toArr(quizRes);
        if (attempts.length > 0) {
          const qmap = {};
          attempts.forEach(a => {
            const tid = String(a.topicId?._id || a.topicId || '');
            if (tid && a.passed) qmap[tid] = true;
          });
          setQuizPassedMap(qmap);
        }

        // Load assignment-done state from localStorage
        try {
          const uid = String((user?._id || user?.id) ?? '');
          const raw = localStorage.getItem(`lms_assign_${uid}_${courseId}`);
          if (raw) setAssignDoneMap(JSON.parse(raw));
        } catch { /* ignore */ }

        if (chapterList.length > 0) {
          // Always start on the first chapter (it is always unlocked)
          const firstId     = String(chapterList[0]._id || '');
          setActiveChId(firstId);
          setExpanded({ [firstId]: true });
          const firstTopics = topicList.filter(t => String(t.chapterId?._id || t.chapterId || '') === firstId);
          if (firstTopics.length > 0) setActiveTopId(String(firstTopics[0]._id || ''));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [courseId]);

  async function handleVideoProgress({ topicId, courseId: cid, watchedSeconds, durationSeconds, lastPosition }) {
    try {
      const res = await apiServiceHandler('POST', 'progress/update', {
        topicId, courseId: cid, watchedSeconds, durationSeconds, lastPosition,
      });
      const record = res?.data ?? res;
      if (record?.topicId) {
        setProgressMap(prev => ({ ...prev, [String(record.topicId)]: record }));
      }
    } catch { /* silent */ }
  }

  // Fetch notes whenever the active topic changes — runs independently of which tab is open
  useEffect(() => {
    if (!courseId || !activeTopId) return;
    let cancelled = false;
    async function loadNotes() {
      try {
        const params = [`courseId=${courseId}`];
        if (activeChId)  params.push(`chapterId=${activeChId}`);
        if (activeTopId) params.push(`topicId=${activeTopId}`);
        const res = await apiServiceHandler('GET', `note/list?${params.join('&')}`);
        if (!cancelled) setNotes(toArr(res));
      } catch { /* silent */ }
    }
    loadNotes();
    return () => { cancelled = true; };
  }, [courseId, activeChId, activeTopId]);

  // Group topics by chapterId
  const topicsByChapter = {};
  for (const t of topics) {
    const cid = String(t.chapterId?._id || t.chapterId || '');
    if (!topicsByChapter[cid]) topicsByChapter[cid] = [];
    topicsByChapter[cid].push(t);
  }

  const activeTopic   = topics.find(t => String(t._id) === activeTopId);
  const activeChapter = chapters.find(c => String(c._id) === activeChId);

  // ── Chapter gating ────────────────────────────────────────────────────────
  function isChapterComplete(chIdx) {
    // A chapter that was never unlocked can't be "complete" — without this, a
    // later locked chapter with no quiz of its own would still count as done
    // (nothing to gate on) and incorrectly cascade to unlock the chapter after
    // it, even though the learner never actually reached it.
    if (!isChapterUnlocked(chIdx)) return false;
    const ch = chapters[chIdx];
    if (!ch) return false;
    const chTopics = topicsByChapter[String(ch._id)] || [];
    const quizTopics = chTopics.filter(t => getTopicType(t) === 'quiz');
    // A chapter unlocks the next one once its own quiz is passed — lesson-watch
    // percentage and assignment status no longer gate progression. A chapter
    // with no quiz has nothing to gate on, so it doesn't block the next chapter.
    if (quizTopics.length === 0) return true;
    return quizTopics.every(t => quizPassedMap[String(t._id)] === true);
  }
  function isChapterUnlocked(chIdx) {
    return chIdx === 0 || isChapterComplete(chIdx - 1);
  }

  function handleDurationLoad(topicId, secs) {
    if (topicId && secs > 0) setVideoDurMap(prev => ({ ...prev, [topicId]: secs }));
  }

  function handleQuizPass(topicId) {
    setQuizPassedMap(prev => ({ ...prev, [topicId]: true }));
  }

  function handleAssignmentDone(topicId) {
    setAssignDoneMap(prev => {
      const next = { ...prev, [topicId]: true };
      try {
        const uid = String((user?._id || user?.id) ?? '');
        localStorage.setItem(`lms_assign_${uid}_${courseId}`, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }

  function toggleChapter(chId) {
    setExpanded(prev => ({ ...prev, [chId]: !prev[chId] }));
  }
  function selectTopic(chIdx, chId, topId) {
    if (!isChapterUnlocked(chIdx)) return;
    setActiveChId(chId);
    setActiveTopId(topId);
    setPlaying(false);
    setVideoPlaying(false);
    setExpanded(prev => ({ ...prev, [chId]: true }));
  }

  if (loading) {
    return <div className={s.loadingWrap}><div className={s.spinner}/></div>;
  }
  if (!course) {
    return (
      <div className={s.errorWrap}>
        <p>Course not found.</p>
        <button onClick={() => router.push('/learner/courses')}>Back to Courses</button>
      </div>
    );
  }

  const imgSrc    = course.course_image ? `${API_URL}${course.course_image}` : null;
  const totalDur  = `${course.duration_hr || 0}h ${course.duration_min || 0}m`;

  const videoTopics = topics.filter(t => t.video_type === 'lesson' || !t.video_type);
  const progValues  = videoTopics.map(t => progressMap[String(t._id)]);
  const totalProgDur = progValues.reduce((s, p) => s + (p?.durationSeconds || 0), 0);
  const totalWatched = progValues.reduce((s, p) => s + Math.min(p?.watchedSeconds || 0, p?.durationSeconds || 0), 0);
  const overallPercent = totalProgDur > 0 ? Math.min(100, Math.round((totalWatched / totalProgDur) * 100)) : 0;
  const topicType = getTopicType(activeTopic);
  const watchTitle = `Watch — ${activeTopic ? activeTopic.title : course.title}`;

  return (
    <div className={s.page}>
      {/* Breadcrumb */}
      <div className={s.breadcrumb}>
        <span className={s.breadItem}>My Courses</span>
        <span className={s.breadSep}>/</span>
        <span className={s.breadItem}>{course.title}</span>
        {activeTopic && (
          <>
            <span className={s.breadSep}>/</span>
            <span className={s.breadCurrent}>{activeTopic.title}</span>
          </>
        )}
      </div>

      <div className={s.layout}>
        {/* ── Left: header (bare) → stats (bare) → content card → tabs card ── */}
        <div className={s.mainCol}>

          {/* Header — no background div */}
          <h1 className={s.watchTitle}>{watchTitle}</h1>

          {/* Stats — no outer background div; individual stat items keep their own boxes */}
          <div className={s.statsRow}>
            {reviewStats.total > 0 && (
              <div className={s.stat}>
                <span className={s.statStarIcon}>{Icon.star}</span>
                <span className={s.statVal}>{reviewStats.avgRating}</span>
                <span className={s.statLbl}>{reviewStats.total} {reviewStats.total === 1 ? 'Rating' : 'Ratings'}</span>
              </div>
            )}
            <div className={s.stat}>
              <span className={s.statIcon}>{Icon.users}</span>
              <span className={s.statVal}>{enrolledCount.toLocaleString()}</span>
              <span className={s.statLbl}>Students Enrolled</span>
            </div>
            <div className={s.stat}>
              <span className={s.statIcon}>{Icon.clock}</span>
              <span className={s.statVal}>{totalDur}</span>
              <span className={s.statLbl}>Total Duration</span>
            </div>
            <div className={s.stat}>
              <span className={s.statIcon}>{Icon.calendar}</span>
              <span className={s.statVal}>{timeAgo(course.updatedAt)}</span>
              <span className={s.statLbl}>Last Updated</span>
            </div>
          </div>

          {/* Content — video / zoom / quiz / assignment — its own background card */}
          <div className={s.contentCard}>
            {topicType === 'zoom'       && activeTopic && <ZoomPanel topic={activeTopic}/>}
            {topicType === 'quiz'       && activeTopic && (
              <QuizPanel
                topic={activeTopic}
                chapterTitle={activeChapter?.title}
                onQuizPass={handleQuizPass}
              />
            )}
            {topicType === 'assignment' && activeTopic && (
              <AssignmentPanel
                topic={activeTopic}
                isDone={assignDoneMap[String(activeTopic._id)] === true}
                onDone={handleAssignmentDone}
              />
            )}
            {(topicType === 'lesson' || !activeTopic) && (() => {
              const rawVid   = activeTopic?.videoUrl || '';
              const videoSrc = rawVid ? (rawVid.startsWith('http') ? rawVid : `${API_URL}${rawVid}`) : null;
              const topProg  = progressMap[activeTopId];
              return (
                <VideoPlayer
                  videoSrc={videoSrc}
                  imgSrc={imgSrc}
                  isPlaying={playing}
                  onToggle={() => setPlaying(p => !p)}
                  onPlayStateChange={setVideoPlaying}
                  topicId={activeTopId}
                  courseId={courseId}
                  savedPosition={topProg?.lastPosition}
                  onProgress={handleVideoProgress}
                  onDurationLoad={handleDurationLoad}
                  isCompleted={topProg?.completed === true}
                  serverPct={topProg?.percentage ?? 0}
                />
              );
            })()}
          </div>

          {/* Tabs — its own background card. Hidden entirely for quiz topics (no tabs, no reviews). */}
          {activeTopic?.video_type !== 'quiz' && (
            <div className={s.tabsPanel}>
              <div className={s.tabBar}>
                {['overview', 'note', 'reviews'].map(tab => (
                  <button key={tab}
                    className={`${s.tabBtn} ${activeTab === tab ? s.tabActive : ''}`}
                    onClick={() => setActiveTab(tab)}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              <div className={s.tabContent}>
                {activeTab === 'overview' && <OverviewTab course={course} chapter={activeChapter}/>}
                {activeTab === 'note'     && <NoteTab courseId={courseId} chapterId={activeChId} topicId={activeTopId} topicTitle={activeTopic?.title} notes={notes} setNotes={setNotes}/>}
                {activeTab === 'reviews'  && <ReviewsTab enableReview={course?.enable_review !== false} courseId={courseId} chapterId={activeChId}/>}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: chapters ── */}
        <aside className={s.aside}>
          <div className={s.progressLabel}>
            My Progress
            {videoTopics.length > 0 && (
              <span className={s.progressPct} style={{ color: overallPercent >= 80 ? '#16a34a' : '#6b7280' }}>
                {overallPercent}%
              </span>
            )}
          </div>
          {videoTopics.length > 0 && (
            <div className={s.progressBarWrap}>
              <div className={s.progressBarTrack}>
                <div className={s.progressBarFill} style={{ width: `${overallPercent}%` }}/>
              </div>
            </div>
          )}
          <h2 className={s.chaptersHeading}>Course Chapters</h2>
          <div className={s.chapterList}>
            {chapters.length > 0 ? chapters.map((ch, idx) => {
              const chId      = String(ch._id || '');
              const isActive  = chId === activeChId;
              const isOpen    = !!expanded[chId];
              const chTopics  = topicsByChapter[chId] || [];
              const topCount  = chTopics.length || Number(ch.totalTopics || 0);
              const dur       = ch.duration || (topCount > 0 ? `${topCount * 4}:00 min` : null);
              const unlocked  = isChapterUnlocked(idx);
              const chDone    = isChapterComplete(idx);

              return (
                <div key={chId || idx} className={`${s.chapterCard} ${isActive ? s.chapterActive : ''} ${!unlocked ? s.chapterLocked : ''}`}>
                  <div className={s.chapterHeader} onClick={() => unlocked ? toggleChapter(chId) : undefined}>
                    {!unlocked && (
                      <span className={s.chLeadLockIcon}>{Icon.lock}</span>
                    )}
                    <div className={s.chInfo}>
                      <span className={s.chTitle}>
                        Ch {idx + 1} &ndash; {ch.title || `Chapter ${idx + 1}`}
                      </span>
                      {(topCount > 0 || dur) && (
                        <span className={s.chMeta}>
                          {topCount > 0 ? `${topCount} topics` : ''}
                          {topCount > 0 && dur ? ' · ' : ''}
                          {dur || ''}
                        </span>
                      )}
                    </div>
                    {!unlocked ? (
                      <button className={s.chActiveBtn} disabled onClick={e => e.stopPropagation()}>Active</button>
                    ) : (
                      <span className={s.chevronBox}>
                        {chDone ? (
                          <span className={s.chDoneIcon}>{Icon.check}</span>
                        ) : (
                          <span style={{ display:'flex', width:14, height:14, transition:'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                            {Icon.chevDown}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {unlocked && isOpen && (
                    <div className={s.topicList}>
                      {chTopics.length === 0 && (
                        <p className={s.noTopicsNote}>No topics in this chapter yet.</p>
                      )}
                      {chTopics.map(topic => {
                        const topId  = String(topic._id || '');
                        const isCurr = topId === activeTopId;
                        const tType  = getTopicType(topic);
                        const topDur = fmtSecs(videoDurMap[topId]) || fmtDur(topic.duration_hr, topic.duration_min, topic.duration_sec);
                        const prog   = progressMap[topId];
                        const pct    = prog?.percentage ?? 0;
                        // Per-topic completion
                        const topicDone = tType === 'zoom'       ? true
                                        : tType === 'quiz'       ? quizPassedMap[topId] === true
                                        : tType === 'assignment' ? assignDoneMap[topId] === true
                                        : prog?.completed === true;
                        return (
                          <div key={topId}
                            className={`${s.topicRow} ${isCurr ? s.topicActive : ''}`}
                            onClick={() => selectTopic(idx, chId, topId)}>
                            <span className={`${s.topicPlayIcon} ${s['topicIcon__' + tType] || ''}`}>
                              {topicDone && tType !== 'lesson'
                                ? <span className={s.topicDoneCheck}>{Icon.check}</span>
                                : getTopicIcon(topic, isCurr && videoPlaying)
                              }
                            </span>
                            <div className={s.topicInfo}>
                              <span className={s.topicName}>{topic.title}</span>
                              {topDur && <span className={s.topicDur}>{topDur}</span>}
                              {tType === 'lesson' && pct > 0 && !topicDone && (
                                <div className={s.topicProgressMini}>
                                  <div className={s.topicProgressFill} style={{ width: `${pct}%` }}/>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }) : (
              /* No chapters yet — show course details instead */
              <div className={s.courseInfoFallback}>
                {course.desc && (
                  <div className={s.fallbackBlock}>
                    <p className={s.fallbackLabel}>About This Course</p>
                    <p className={s.fallbackText}>{course.desc}</p>
                  </div>
                )}
                {course.what_will_learn && (
                  <div className={s.fallbackBlock}>
                    <p className={s.fallbackLabel}>What You&apos;ll Learn</p>
                    <p className={s.fallbackText}>{course.what_will_learn}</p>
                  </div>
                )}
                <div className={s.fallbackStats}>
                  <div className={s.fallbackStatRow}>
                    <span className={s.fallbackStatIcon}>{Icon.clock}</span>
                    <span className={s.fallbackStatTxt}>{totalDur} total duration</span>
                  </div>
                  {Number(course.max_students || 0) > 0 && (
                    <div className={s.fallbackStatRow}>
                      <span className={s.fallbackStatIcon}>{Icon.users}</span>
                      <span className={s.fallbackStatTxt}>{Number(course.max_students).toLocaleString()} students enrolled</span>
                    </div>
                  )}
                  <div className={s.fallbackStatRow}>
                    <span className={s.fallbackStatIcon}>{Icon.calendar}</span>
                    <span className={s.fallbackStatTxt}>Last updated {timeAgo(course.updatedAt)}</span>
                  </div>
                </div>
                <p className={s.noChaptersNote}>Chapters will appear here once added by your instructor.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
