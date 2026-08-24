'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from './QuizResult.module.css';

function toArr(res) {
  if (Array.isArray(res))             return res;
  if (Array.isArray(res?.data))       return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  if (Array.isArray(res?.list))       return res.list;
  return [];
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTimeOfDay(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const DIFF_LABEL = { beginner: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced' };

const ChevronIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default function QuizResult() {
  const user = useSelector(selectUser);

  const [orgId, setOrgId] = useState(null);
  const [learners, setLearners] = useState([]);
  const [coursesForDrop, setCoursesForDrop] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [selectedLearner, setSelectedLearner] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);

  const [attempt, setAttempt] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [questionBank, setQuestionBank] = useState([]);
  const [searched, setSearched] = useState(false);

  // ── Resolve org, learners, org courses ──────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingBase(true);
      try {
        let resolvedOrgId = user?.orgId ? String(user.orgId) : null;
        if (!resolvedOrgId) {
          const uid = user?._id || user?.id;
          if (uid) {
            const r = await apiServiceHandler('GET', `user/admin/edit/${uid}`).catch(() => null);
            const rec = r?.data ?? r;
            resolvedOrgId = rec?.orgId ? String(rec.orgId) : null;
          }
        }
        if (!resolvedOrgId) return;
        if (cancelled) return;
        setOrgId(resolvedOrgId);

        const [learnerRes, ocRes] = await Promise.all([
          apiServiceHandler('GET', `user/admin/list?orgId=${resolvedOrgId}&user_type=employee&orgRole=employee`).catch(() => null),
          apiServiceHandler('GET', `organization-course/list?orgId=${resolvedOrgId}`).catch(() => null),
        ]);
        if (cancelled) return;

        setLearners(toArr(learnerRes));

        const drop = toArr(ocRes).map(oc => {
          const c = oc.courseId;
          return c?._id ? { _id: String(c._id), title: c.title || 'Untitled' } : null;
        }).filter(Boolean);
        setCoursesForDrop(drop);
      } finally {
        if (!cancelled) setLoadingBase(false);
      }
    }
    if (user) load();
    return () => { cancelled = true; };
  }, [user?._id]);

  // ── Chapters for selected course ────────────────────────────
  useEffect(() => {
    if (!selectedCourse) { setChapters([]); setSelectedChapter(''); return; }
    let cancelled = false;
    setLoadingChapters(true);
    setChapters([]);
    setSelectedChapter('');
    async function loadChapters() {
      try {
        const res = await apiServiceHandler('GET', `chapter/list?courseId=${selectedCourse}`).catch(() => null);
        if (!cancelled) setChapters(toArr(res));
      } finally {
        if (!cancelled) setLoadingChapters(false);
      }
    }
    loadChapters();
    return () => { cancelled = true; };
  }, [selectedCourse]);

  // ── Attempt + question bank for learner / course / chapter ──
  useEffect(() => {
    if (!selectedLearner || !selectedCourse || !selectedChapter) {
      setAttempt(null);
      setAttemptCount(0);
      setQuestionBank([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setLoadingResult(true);
    setSearched(true);
    async function loadResult() {
      try {
        const res = await apiServiceHandler('GET', `quiz-attempt/course-all?courseId=${selectedCourse}`).catch(() => null);
        if (cancelled) return;
        const all = toArr(res);
        const matches = all.filter(a => {
          const uid = String(a.userId?._id || a.userId || '');
          if (uid !== selectedLearner) return false;
          const cid = String(a.chapterId?._id || a.chapterId || '');
          if (cid !== selectedChapter) return false;
          return true;
        });
        setAttemptCount(matches.length);
        const latest = matches[0] || null;
        setAttempt(latest);

        if (latest) {
          const topicId = String(latest.topicId?._id || latest.topicId || '');
          if (topicId) {
            const qRes = await apiServiceHandler('GET', `quiz-questions/list?quizId=${topicId}`).catch(() => null);
            if (!cancelled) setQuestionBank(toArr(qRes));
          } else if (!cancelled) {
            setQuestionBank([]);
          }
        } else if (!cancelled) {
          setQuestionBank([]);
        }
      } finally {
        if (!cancelled) setLoadingResult(false);
      }
    }
    loadResult();
    return () => { cancelled = true; };
  }, [selectedLearner, selectedCourse, selectedChapter]);

  const activeCourse = coursesForDrop.find(c => c._id === selectedCourse);
  const activeLearner = learners.find(l => String(l._id) === selectedLearner);
  const learnerName = activeLearner
    ? (activeLearner.name || activeLearner.fullName || `${activeLearner.firstName || ''} ${activeLearner.lastName || ''}`.trim() || 'Learner')
    : '';

  const answers = attempt && Array.isArray(attempt.answers) ? attempt.answers : [];
  const questionMap = {};
  questionBank.forEach(q => { questionMap[String(q._id)] = q; });

  const score = attempt ? Number(attempt.totalScore || 0) : 0;
  const passed = attempt ? attempt.passed === true : false;
  const topicTitle = attempt?.topicId?.title || '';
  const chapterTitle = attempt?.chapterId?.title || '';
  const label = chapterTitle ? `${chapterTitle} — ${topicTitle}` : topicTitle;

  return (
    <div className={s.page}>

      {/* ── Filter bar ── */}
      <div className={s.filterCard}>
        <p className={s.filterMeta}>Quiz Review</p>
        <h2 className={s.filterTitle}>Quiz Result</h2>
        <div className={s.filterRow}>
          <div className={s.filterGroup}>
            <label className={s.filterLabel}>Learner</label>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                value={selectedLearner}
                onChange={e => setSelectedLearner(e.target.value)}
                disabled={loadingBase}
              >
                <option value="">
                  {loadingBase ? 'Loading learners…' : '— Select a learner —'}
                </option>
                {learners.map(l => {
                  const uid = String(l._id || '');
                  const name = l.name || l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Learner';
                  return <option key={uid} value={uid}>{name}</option>;
                })}
              </select>
              <span className={s.selectArrow}>{ChevronIcon}</span>
            </div>
          </div>

          <div className={s.filterGroup}>
            <label className={s.filterLabel}>Course</label>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                disabled={loadingBase}
              >
                <option value="">
                  {loadingBase ? 'Loading courses…' : '— Select a course —'}
                </option>
                {coursesForDrop.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <span className={s.selectArrow}>{ChevronIcon}</span>
            </div>
          </div>

          <div className={s.filterGroup}>
            <label className={s.filterLabel}>Chapter</label>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
                disabled={!selectedCourse || loadingChapters}
              >
                <option value="">
                  {loadingChapters ? 'Loading chapters…' : '— Select a chapter —'}
                </option>
                {chapters.map((ch, i) => (
                  <option key={String(ch._id)} value={String(ch._id)}>
                    Ch {i + 1} – {ch.title || `Chapter ${i + 1}`}
                  </option>
                ))}
              </select>
              <span className={s.selectArrow}>{ChevronIcon}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prompt state ── */}
      {(!selectedLearner || !selectedCourse || !selectedChapter) && (
        <div className={s.emptyWrap}>
          <svg viewBox="0 0 48 48" fill="none" width="52" height="52" style={{ opacity: 0.25 }}>
            <rect x="6" y="8" width="36" height="32" rx="4" stroke="#0b7b7b" strokeWidth="2.5" />
            <path d="M14 18h20M14 24h14M14 30h10" stroke="#0b7b7b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className={s.emptyTitle}>Select a learner, course and chapter to view quiz results</p>
          <span className={s.emptySub}>Choose a learner, a course and a chapter from the filters above.</span>
        </div>
      )}

      {/* ── Loading ── */}
      {selectedLearner && selectedCourse && selectedChapter && loadingResult && (
        <div className={s.loadingWrap}><div className={s.spinner} /></div>
      )}

      {/* ── No attempts found ── */}
      {selectedLearner && selectedCourse && selectedChapter && !loadingResult && searched && !attempt && (
        <div className={s.emptyWrap}>
          <svg viewBox="0 0 48 48" fill="none" width="52" height="52" style={{ opacity: 0.25 }}>
            <circle cx="24" cy="24" r="18" stroke="#0b7b7b" strokeWidth="2.5" />
            <path d="M24 16v8M24 30v2" stroke="#0b7b7b" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className={s.emptyTitle}>No quiz attempts found</p>
          <span className={s.emptySub}>
            {learnerName || 'This learner'} has not attempted any quiz for the selected chapter yet.
          </span>
        </div>
      )}

      {/* ── Result ── */}
      {selectedLearner && selectedCourse && selectedChapter && !loadingResult && attempt && (
        <>
          {attemptCount > 1 && (
            <div className={s.attemptsBanner}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Showing latest of {attemptCount} attempt{attemptCount > 1 ? 's' : ''} by {learnerName}
              {' '}for this chapter
            </div>
          )}

          {/* Summary bar */}
          <div className={s.summaryCard}>
            <div className={s.summaryTopBar}>
              <div className={s.summaryLeft}>
                <h3 className={s.summaryLearner}>{learnerName}</h3>
                <p className={s.summaryMeta}>{label || activeCourse?.title}</p>
              </div>
              <span className={`${s.resultBadge} ${passed ? s.badgePassed : s.badgeFailed}`}>
                {passed ? `Passed — ${score}%` : `Failed — ${score}%`}
              </span>
            </div>
            <div className={s.summaryStatsRow}>
              <div className={s.summaryStat}>
                <span className={s.summaryStatVal}>{score}%</span>
                <span className={s.summaryStatLbl}>Final Score</span>
              </div>
              <div className={s.summaryDivider} />
              <div className={s.summaryStat}>
                <span className={s.summaryStatVal}>
                  {answers.filter(a => a.status === 'answered').length}/{answers.length}
                </span>
                <span className={s.summaryStatLbl}>Answered</span>
              </div>
              <div className={s.summaryDivider} />
              <div className={s.summaryStat}>
                <span className={s.summaryStatDate}>{fmtDate(attempt.createdAt)}</span>
                <span className={s.summaryStatLbl}>{fmtTimeOfDay(attempt.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* ── Question comparison grid ── */}
          {answers.length > 0 && (
            <div className={s.compareGrid}>

              {/* Left: learner's given answers */}
              <div className={s.compareCard}>
                <div className={s.compareHead}>
                  <p className={s.compareMeta}>What {learnerName || 'the learner'} answered</p>
                  <h3 className={s.compareTitle}>Learner&apos;s Answers</h3>
                </div>
                <div className={s.qList}>
                  {answers.map((a, i) => {
                    const skipped = a.status === 'skipped';
                    const aiScore = Number(a.aiScore || 0);
                    const maxScore = Number(a.maxScore || 0);
                    const pct = maxScore > 0 ? Math.round((aiScore / maxScore) * 100) : 0;
                    const isWeak = !skipped && pct < 60;
                    const difficulty = questionMap[String(a.questionId)]?.difficulty;
                    const diffLabel = DIFF_LABEL[difficulty];
                    return (
                      <div key={i} className={`${s.qRow} ${isWeak || skipped ? s.qRowWrong : ''}`}>
                        <div className={s.qHead}>
                          <span className={s.qHeadLeft}>
                            <span className={s.qNum}>Q{i + 1}</span>
                            {diffLabel && (
                              <span className={`${s.diffBadge} ${s[`diff_${difficulty}`] || ''}`}>{diffLabel}</span>
                            )}
                          </span>
                          <span className={`${s.scoreBadge} ${isWeak || skipped ? s.scoreBadgeWrong : s.scoreBadgeOk}`}>
                            {skipped ? '—' : `${aiScore}/${maxScore}`}
                          </span>
                        </div>
                        <p className={s.qText}>{a.questionText || 'Question'}</p>
                        {skipped ? (
                          <span className={s.qSkipped}>Skipped</span>
                        ) : (
                          <p className={s.qAnswer}>{a.userAnswer || '—'}</p>
                        )}
                        {a.aiFeedback && <p className={s.qFeedback}>{a.aiFeedback}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: actual questions and answers */}
              <div className={s.compareCard}>
                <div className={s.compareHead}>
                  <p className={s.compareMeta}>Correct reference</p>
                  <h3 className={s.compareTitle}>Actual Questions &amp; Answers</h3>
                </div>
                <div className={s.qList}>
                  {answers.map((a, i) => {
                    const q = questionMap[String(a.questionId)];
                    const diffLabel = DIFF_LABEL[q?.difficulty];
                    return (
                      <div key={i} className={s.qRow}>
                        <div className={s.qHead}>
                          <span className={s.qHeadLeft}>
                            <span className={s.qNum}>Q{i + 1}</span>
                            {diffLabel && (
                              <span className={`${s.diffBadge} ${s[`diff_${q?.difficulty}`] || ''}`}>{diffLabel}</span>
                            )}
                          </span>
                        </div>
                        <p className={s.qText}>{q?.question || a.questionText || 'Question'}</p>
                        <p className={s.qAnswer}>{q?.answer || 'No reference answer available.'}</p>
                        {q?.explanation && <p className={s.qFeedback}>{q.explanation}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
