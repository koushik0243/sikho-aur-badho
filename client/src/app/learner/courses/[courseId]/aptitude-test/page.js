'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import apiServiceHandler, { clearGetCache } from '../../../../../service/apiService';
import useVoiceAnswer from '../../../../../hooks/useVoiceAnswer';
import s from './AptitudeTest.module.css';

/* ── Helpers ─────────────────────────────────────────────────── */
function toArr(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function fmtSecs(n) {
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };

/* ── Icons ───────────────────────────────────────────────────── */
const MicIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const EyeIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const QuoteIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
  </svg>
);

const BreakdownIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <path fillRule="evenodd" d="M2 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 002 2H4a2 2 0 01-2-2V4zm3 1h6a1 1 0 010 2H5a1 1 0 010-2zm0 3h6a1 1 0 010 2H5a1 1 0 010-2zm0 3h4a1 1 0 010 2H5a1 1 0 010-2z" clipRule="evenodd" />
    <path d="M12 2h2a2 2 0 012 2v13.5a1.5 1.5 0 01-3 0V4a2 2 0 00-1-1.732z" />
  </svg>
);

function LevelIcon(level) {
  if (level === 'expert') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" width="26" height="26">
        <path d="M10 2l2.163 4.279 4.725.687-3.419 3.331.807 4.703L10 12.75l-4.276 2.25.807-4.703-3.419-3.331 4.725-.687L10 2z" />
      </svg>
    );
  }
  if (level === 'intermediate') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" width="26" height="26">
        <path fillRule="evenodd" d="M3 13a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM8 9a1 1 0 011-1h1a1 1 0 011 1v8a1 1 0 01-1 1H9a1 1 0 01-1-1V9zM13 5a1 1 0 011-1h1a1 1 0 011 1v12a1 1 0 01-1 1h-1a1 1 0 01-1-1V5z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="26" height="26">
      <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.367-2.445a1 1 0 00-1.176 0l-3.367 2.445c-.784.57-1.838-.196-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.826 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" clipRule="evenodd" />
    </svg>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function AptitudeTestPage({ params }) {
  const { courseId } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState('checking'); // checking | start | question | evaluating | results | empty
  const [courseTitle, setCourseTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // qId -> { transcript, status }
  const [testTimeLeft, setTestTimeLeft] = useState(3600); // 60-minute total timer
  const [evalResult, setEvalResult] = useState(null);
  const {
    transcript, setTranscript,
    isRecording, recordTime, micError, isTranscribing,
    startRecording, stopRecording, reset: resetVoiceInput, usesFallback,
  } = useVoiceAnswer();
  const answersRef = useRef({});
  answersRef.current = answers;

  /* ── Load course + selected questions, redirect if not needed ── */
  useEffect(() => {
    clearGetCache();
    if (!courseId) return;
    let cancelled = false;

    async function load() {
      try {
        const [courseRes, attemptRes] = await Promise.all([
          apiServiceHandler('GET', `course/${courseId}`).catch(() => null),
          apiServiceHandler('GET', `aptitude-attempt/list?courseId=${courseId}`).catch(() => null),
        ]);
        if (cancelled) return;

        const course = courseRes?.data ?? courseRes;
        const selectedIds = Array.isArray(course?.aptitudeSelectedQuestionIds)
          ? course.aptitudeSelectedQuestionIds.map(id => String(id?._id ?? id))
          : [];
        const priorAttempts = toArr(attemptRes);

        // Nothing to test, or already attempted — no point showing this page.
        if (!course?.aptitudeEnabled || selectedIds.length === 0 || priorAttempts.length > 0) {
          router.replace(`/learner/courses/${courseId}`);
          return;
        }

        setCourseTitle(course.title || 'this course');

        const qRes = await apiServiceHandler('GET', `aptitude-questions/list?courseId=${courseId}`).catch(() => null);
        const allQuestions = toArr(qRes);
        const selectedSet = new Set(selectedIds);
        const selectedQuestions = allQuestions.filter(q => selectedSet.has(String(q._id)));

        if (cancelled) return;
        if (selectedQuestions.length === 0) {
          router.replace(`/learner/courses/${courseId}`);
          return;
        }

        const diffOrder = { beginner: 0, intermediate: 1, advanced: 2 };
        const sorted = [...selectedQuestions].sort((a, b) => {
          const da = diffOrder[String(a.difficulty || '').toLowerCase()] ?? 1;
          const db = diffOrder[String(b.difficulty || '').toLowerCase()] ?? 1;
          return da - db;
        });

        setQuestions(sorted);
        setPhase('start');
      } catch {
        if (!cancelled) router.replace(`/learner/courses/${courseId}`);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [courseId, router]);

  function startTest() {
    setCurrentIdx(0);
    setAnswers({});
    setEvalResult(null);
    setTestTimeLeft(3600);
    setPhase('question');
  }

  // 60-minute total test countdown
  useEffect(() => {
    if (phase !== 'question') return;
    if (testTimeLeft <= 0) { handleTimeExpired(); return; }
    const t = setTimeout(() => setTestTimeLeft(n => n - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, testTimeLeft]);

  function handleTimeExpired() {
    stopRecording();
    const allAnswers = { ...answersRef.current };
    const q = questions[currentIdx];
    if (q) allAnswers[String(q._id)] = { status: transcript ? 'answered' : 'skipped', transcript };
    for (let i = currentIdx + 1; i < questions.length; i++) {
      allAnswers[String(questions[i]._id)] = { status: 'skipped', transcript: '' };
    }
    submitTest(questions, allAnswers);
  }

  // Reset mic + restore saved transcript on question change
  useEffect(() => {
    if (phase !== 'question') return;
    stopRecording();
    const q = questions[currentIdx];
    const saved = q ? answersRef.current[String(q._id)] : null;
    resetVoiceInput(saved?.transcript || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, phase, questions]);

  function advance(status) {
    stopRecording();
    const q = questions[currentIdx];
    const qId = String(q._id);
    const saved = { status, transcript: status === 'answered' ? transcript : '' };
    const newAnswers = { ...answers, [qId]: saved };
    setAnswers(newAnswers);

    if (currentIdx + 1 >= questions.length) {
      submitTest(questions, newAnswers);
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
      submitTest(questions, answers);
    } else {
      setCurrentIdx(i => i + 1);
    }
  }

  async function submitTest(qs, allAnswers) {
    setPhase('evaluating');
    try {
      const payload = {
        courseId,
        answers: qs.map(q => ({
          questionId: q._id,
          userAnswer: allAnswers[String(q._id)]?.transcript || '',
          status: allAnswers[String(q._id)]?.status || 'skipped',
        })),
      };
      const res = await apiServiceHandler('POST', 'aptitude-attempt/submit', payload);
      const result = res?.data || res;
      setEvalResult(result);
      setPhase('results');
    } catch {
      setPhase('results');
    }
  }

  /* ── Checking ──────────────────────────────────────────────── */
  if (phase === 'checking') {
    return (
      <div className={s.page}>
        <div className={s.centerCard}>
          <div className={s.spinner} />
          <p className={s.centerText}>Loading your aptitude test…</p>
        </div>
      </div>
    );
  }

  /* ── Start ─────────────────────────────────────────────────── */
  if (phase === 'start') {
    return (
      <div className={s.page}>
        <div className={s.centerCard}>
          <div className={s.startIcon}>{MicIcon}</div>
          <h1 className={s.startTitle}>Aptitude Test</h1>
          <p className={s.startSub}>
            Before you start <strong>{courseTitle}</strong>, complete this short aptitude
            test. Answer each question by speaking — your response is transcribed to
            text automatically. Your score and level will be shown at the end.
          </p>
          <p className={s.startMeta}>{questions.length} question{questions.length !== 1 ? 's' : ''} · Speech-to-text · English</p>
          <button className={s.primaryBtn} onClick={startTest}>Start Aptitude Test</button>
        </div>
      </div>
    );
  }

  /* ── Evaluating ────────────────────────────────────────────── */
  if (phase === 'evaluating') {
    return (
      <div className={s.page}>
        <div className={s.centerCard}>
          <div className={s.spinner} />
          <h3 className={s.centerTitle}>Evaluating Your Answers…</h3>
          <p className={s.centerText}>AI is reviewing your responses. This may take a moment.</p>
        </div>
      </div>
    );
  }

  /* ── Results ───────────────────────────────────────────────── */
  if (phase === 'results') {
    const score = evalResult?.totalScore ?? 0;
    const level = evalResult?.level || 'beginner';
    const evaluated = evalResult?.answers ?? [];
    const timeTaken = Math.max(0, 3600 - testTimeLeft);
    const timeTakenStr = `${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`;
    const correctCount = evaluated.filter(a => a.status !== 'skipped' && a.maxScore > 0 && (a.aiScore / a.maxScore) * 100 >= 60).length;
    const skippedCount = evaluated.filter(a => a.status === 'skipped').length;
    const wrongCount = Math.max(0, evaluated.length - correctCount - skippedCount);
    const attemptDate = fmtDate(evalResult?.createdAt || new Date());

    return (
      <div className={s.resultsPage}>
        <div className={s.resultWrap}>
          <div className={`${s.resultCard} ${s[`resultCard_${level}`]}`}>
            <div className={s.resultLeft}>
              <span className={`${s.resultLevelIcon} ${s[`level_${level}`]}`}>{LevelIcon(level)}</span>
              <div>
                <h2 className={s.resultTitle}>Aptitude Test Result</h2>
                <p className={s.resultCourse}>{courseTitle}</p>
                <p className={s.attemptDate}>{attemptDate}</p>
              </div>
            </div>

            <div className={s.resultDivider} />

            <div className={s.resultMiddle}>
              <div className={`${s.scoreCircle} ${s[`scoreCircle_${level}`]}`}>
                <span className={s.scoreNum}>{score}</span>
                <span className={s.scoreOutOf}>/ 100</span>
              </div>
              <span className={`${s.levelBadge} ${s[`level_${level}`]}`}>{LEVEL_LABEL[level] || level}</span>
            </div>

            <div className={s.resultDivider} />

            <div className={s.resultRight}>
              <div className={s.statsCol}>
                <div className={s.stat}>
                  <span className={s.statVal}>{correctCount}/{evaluated.length}</span>
                  <span className={s.statLbl}>Correct</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statVal}>{skippedCount}</span>
                  <span className={s.statLbl}>Skipped</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statVal}>{timeTakenStr}</span>
                  <span className={s.statLbl}>Time Taken</span>
                </div>
              </div>
              <p className={s.levelHint}>Up to 60% — Beginner · 60–80% — Intermediate · Above 80% — Expert</p>
            </div>
          </div>

          {evaluated.length > 0 && (
            <div className={s.breakdownSection}>
              <div className={s.breakdownHead}>
                <span className={s.breakdownIcon}>{BreakdownIcon}</span>
                <div>
                  <h3 className={s.breakdownTitle}>Question Breakdown</h3>
                  <p className={s.breakdownSub}>{correctCount} correct · {wrongCount} incorrect · {skippedCount} skipped</p>
                </div>
              </div>
              <div className={s.qGrid}>
                {evaluated.map((a, i) => {
                  const skipped = a.status === 'skipped';
                  const pct = a.maxScore > 0 ? Math.round((a.aiScore / a.maxScore) * 100) : 0;
                  const isWeak = skipped || pct < 60;
                  return (
                    <div key={i} className={`${s.qCard} ${isWeak ? s.qCardWeak : s.qCardOk}`}>
                      <div className={s.qCardHead}>
                        <span className={`${s.qIconCircle} ${isWeak ? s.qIconWeak : s.qIconOk}`}>
                          {isWeak ? XIcon : CheckIcon}
                        </span>
                        <p className={s.qText}>Q{i + 1}. {a.questionText}</p>
                        <span className={`${s.qScorePill} ${isWeak ? s.qScorePillWeak : s.qScorePillOk}`}>
                          {skipped ? 'Skipped' : `${pct}%`}
                        </span>
                      </div>
                      <div className={s.qAnswers}>
                        <div className={s.qAnswerBlock}>
                          <span className={s.qAnswerLabel}>Expected Answer</span>
                          <p className={s.qAnswerText}>{a.originalAnswer || <em>Not available</em>}</p>
                        </div>
                        <div className={s.qAnswerBlock}>
                          <span className={s.qAnswerLabel}>Your Answer</span>
                          {skipped ? (
                            <p className={s.qSkipped}>No answer provided.</p>
                          ) : (
                            <p className={s.qAnswerText}>{a.userAnswer || <em>No speech recorded.</em>}</p>
                          )}
                        </div>
                      </div>
                      {a.aiFeedback && (
                        <p className={s.qFeedback}>{QuoteIcon} {a.aiFeedback}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={s.resultBtns}>
            <button className={s.primaryBtn} onClick={() => router.push(`/learner/courses/${courseId}`)}>
              Continue to Course →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Question ──────────────────────────────────────────────── */
  const q = questions[currentIdx];
  const total = questions.length;
  const qId = String(q._id);
  const savedAns = answers[qId];
  const isAnswered = savedAns?.status === 'answered';
  const hasBack = currentIdx > 0;

  return (
    <div className={s.page}>
      <div className={s.testWrap}>
        {/* Header bar */}
        <div className={s.testHeader}>
          <div className={s.testHeaderLeft}>
            <span className={s.testHeaderTitle}>{courseTitle}</span>
            <span className={s.testHeaderSep}>\</span>
            <span className={s.testHeaderTag}>{MicIcon} Voice Enabled</span>
          </div>
          <div className={s.testHeaderStats}>
            <div className={s.testHeaderStat}>
              <span className={s.testHeaderStatLbl}>Watch</span>
              <span className={s.testHeaderStatIcon}>{EyeIcon}</span>
            </div>
            <div className={s.testHeaderStatDivider} />
            <div className={s.testHeaderStat}>
              <span className={s.testHeaderStatLbl}>Time</span>
              <span className={s.testHeaderStatVal} style={{ color: testTimeLeft <= 300 ? '#dc2626' : undefined }}>
                {fmtSecs(testTimeLeft)}
              </span>
            </div>
            <div className={s.testHeaderStatDivider} />
            <div className={s.testHeaderStat}>
              <span className={s.testHeaderStatLbl}>Q. No</span>
              <span className={s.testHeaderStatVal}>Q{currentIdx + 1}/{total}</span>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className={s.testBody}>
          <p className={s.question}>&ldquo;{q.question}&rdquo;</p>
          <p className={s.scoringTags}>Speech-To-Text · Semantic Scoring · Partial Credit Enabled</p>

          <div className={s.answerBox}>
            <div className={s.transcriptArea}>
              {isAnswered ? (
                <span>{savedAns.transcript || <em>No speech recorded.</em>}</span>
              ) : transcript ? (
                <span>{transcript}</span>
              ) : (
                <span className={s.transcriptPlaceholder}>Your answer will appear here as you speak…</span>
              )}
            </div>

            {isAnswered ? (
              <div className={s.answeredBadge}>{CheckIcon} Answer submitted — read only</div>
            ) : (
              <div className={s.micRow}>
                <button
                  className={`${s.micCircleBtn} ${isRecording ? s.micActive : ''}`}
                  onClick={() => isRecording ? stopRecording() : startRecording()}
                  disabled={isTranscribing}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {MicIcon}
                </button>
                <div className={s.waveform}>
                  {isRecording
                    ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                        <span key={i} className={s.waveBar} style={{ animationDelay: `${i * 80}ms` }} />
                      ))
                    : [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                        <span key={i} className={s.waveBarStatic} />
                      ))
                  }
                </div>
                <span className={s.micPrompt}>
                  {isTranscribing
                    ? 'Transcribing your answer…'
                    : isRecording
                    ? (usesFallback ? 'Recording · Tap Mic To Stop And Transcribe…' : 'Tap Mic To Stop · Speak Clearly In English…')
                    : 'Tap Mic To Start · Speak Your Answer…'}
                </span>
                <span className={s.micTimer}>{fmtSecs(recordTime)}</span>
              </div>
            )}

            {micError && <p className={s.micError}>{micError}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className={s.testFooter}>
          {hasBack && (
            <button className={s.backBtn} onClick={goBack}>← Back</button>
          )}
          {isAnswered ? (
            <button className={s.submitBtn} onClick={goForward}>
              {currentIdx + 1 < total ? 'Next →' : 'Submit Test'}
            </button>
          ) : (
            <>
              <button
                className={s.submitBtn}
                onClick={() => advance('answered')}
                disabled={isRecording || isTranscribing}
              >
                Submit Answer
              </button>
              <button className={s.skipBtn} onClick={() => advance('skipped')}>Skip Question</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
