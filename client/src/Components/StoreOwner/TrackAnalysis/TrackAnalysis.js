'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./TrackAnalysis.module.css";

const AVATAR_COLORS = ['#d4897a','#e5a97b','#c8956a','#b8856a','#5a9b8a','#7b9fd4','#9b8ad4','#d4a87a'];

function toArr(res) {
  if (Array.isArray(res))             return res;
  if (Array.isArray(res?.data))       return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  if (Array.isArray(res?.list))       return res.list;
  return [];
}

function Ring({ pct }) {
  const r = 28, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  const stroke = pct > 60 ? '#e05252' : pct > 35 ? '#d97706' : '#0b7b7b';
  return (
    <svg className={s.ring} viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="#e8edf0" strokeWidth="5" />
      <circle cx="35" cy="35" r={r} fill="none"
        stroke={stroke} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 35 35)" />
      <text x="35" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a2b2b">{pct}%</text>
    </svg>
  );
}

function InitialAvatar({ name, idx }) {
  const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = name
    ? name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <svg className={s.avatar} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="20" fill={color} />
      <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{initials}</text>
    </svg>
  );
}

const ChevronIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default function TrackAnalysisPage() {
  const user   = useSelector(selectUser);
  const router = useRouter();

  const [loading,         setLoading]         = useState(true);
  const [coursesForDrop,  setCoursesForDrop]  = useState([]);
  const [learners,        setLearners]        = useState([]);
  const [assignments,     setAssignments]     = useState([]);
  const [failureChapters, setFailureChapters] = useState([]);
  const [selectedCourse,  setSelectedCourse]  = useState(null);
  const [quizTopics,      setQuizTopics]      = useState([]);
  const [courseAttempts,  setCourseAttempts]  = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let orgId = user?.orgId ? String(user.orgId) : null;
        if (!orgId) {
          const uid = user?._id || user?.id;
          if (uid) {
            const r   = await apiServiceHandler('GET', `user/admin/edit/${uid}`).catch(() => null);
            const rec = r?.data ?? r;
            orgId     = rec?.orgId ? String(rec.orgId) : null;
          }
        }
        if (!orgId) return;

        const [ocRes, learnerRes, assignRes] = await Promise.all([
          apiServiceHandler('GET', `organization-course/list?orgId=${orgId}`).catch(() => null),
          apiServiceHandler('GET', `user/admin/list?orgId=${orgId}&user_type=employee&orgRole=employee`).catch(() => null),
          apiServiceHandler('GET', `course-assignment/list?organizationId=${orgId}`).catch(() => null),
        ]);

        const ocList     = toArr(ocRes);
        const learnerList = toArr(learnerRes);
        const assignList  = toArr(assignRes);

        setLearners(learnerList);
        setAssignments(assignList);

        const courseIds = ocList.map(oc => {
          const c = oc.courseId;
          return c?._id ? String(c._id) : String(c);
        }).filter(Boolean);

        const drop = ocList.map(oc => {
          const c = oc.courseId;
          return c?._id ? { _id: String(c._id), title: c.title || 'Untitled' } : null;
        }).filter(Boolean);
        setCoursesForDrop(drop);

        if (courseIds.length > 0) {
          const attResults = await Promise.all(
            courseIds.map(cid =>
              apiServiceHandler('GET', `quiz-attempt/course-all?courseId=${cid}`).catch(() => null)
            )
          );
          const allAttempts = attResults.flatMap(r => toArr(r));

          const topicStats = {};
          for (const att of allAttempts) {
            const tid   = String(att.topicId?._id || att.topicId || '');
            const tName = att.topicId?.title || '';
            const cName = att.topicId?.chapterId?.title || att.chapterId?.title || '';
            if (!tid) continue;
            if (!topicStats[tid]) topicStats[tid] = { total: 0, failed: 0, label: cName ? `${cName} · ${tName}` : tName || 'Quiz' };
            topicStats[tid].total++;
            if (!att.passed) topicStats[tid].failed++;
          }

          const chapters = Object.values(topicStats)
            .filter(d => d.total > 0)
            .map(d => ({ label: d.label, pct: Math.round((d.failed / d.total) * 100), total: d.total }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 5);

          setFailureChapters(chapters);
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user?._id]);

  // Load quiz topics + attempts for selected course
  useEffect(() => {
    if (!selectedCourse) { setQuizTopics([]); setCourseAttempts([]); return; }
    async function loadCourse() {
      const [topicRes, attRes] = await Promise.all([
        apiServiceHandler('GET', `topic/list?courseId=${selectedCourse._id}`).catch(() => null),
        apiServiceHandler('GET', `quiz-attempt/course-all?courseId=${selectedCourse._id}`).catch(() => null),
      ]);
      setQuizTopics(toArr(topicRes).filter(t => (t.video_type || t.type) === 'quiz'));
      setCourseAttempts(toArr(attRes));
    }
    loadCourse();
  }, [selectedCourse?._id]);

  // Per-topic attempt stats for selected course
  const topicStatMap = {};
  for (const att of courseAttempts) {
    const tid = String(att.topicId?._id || att.topicId || '');
    if (!tid) continue;
    if (!topicStatMap[tid]) topicStatMap[tid] = { total: 0, passed: 0 };
    topicStatMap[tid].total++;
    if (att.passed) topicStatMap[tid].passed++;
  }

  // Per-learner assignment count and latest course
  const learnerAssignCount  = {};
  const learnerLatestCourse = {};
  for (const a of assignments) {
    const uid   = String(a.userId?._id || a.userId || '');
    const title = a.courseId?.title || '';
    if (!uid) continue;
    learnerAssignCount[uid] = (learnerAssignCount[uid] || 0) + 1;
    if (title) learnerLatestCourse[uid] = title;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div className={s.spinner} />
      </div>
    );
  }

  return (
    <>
      {/* ── Chapter-wise failure analysis ── */}
      <div className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Chapter-wise Failure Analysis</h2>
          <span className={s.cardMeta}>
            {failureChapters.length > 0
              ? `Top ${failureChapters.length} by fail rate`
              : 'No quiz attempt data yet'}
          </span>
        </div>
        <div className={s.cardBody}>
          {failureChapters.length > 0 ? (
            <div className={s.ringRow}>
              {failureChapters.map(ch => (
                <div key={ch.label} className={s.ringItem}>
                  <div className={s.ringLabel}>{ch.label}</div>
                  <Ring pct={ch.pct} />
                  <div className={s.ringMeta}>{ch.total} attempt{ch.total !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className={s.emptyNote} style={{ textAlign: 'center', padding: '16px 0' }}>No quiz attempts recorded yet for your courses.</p>
          )}
        </div>
      </div>

      {/* ── Bottom two-column grid ── */}
      <div className={s.bottomGrid}>

        {/* Left: Learner progress detail */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <h3 className={s.cardTitle}>Learner Progress Detail</h3>
            <span className={s.cardMeta}>{learners.length} learner{learners.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={s.learnerList}>
            {learners.length === 0 && (
              <p className={s.emptyNote} style={{ textAlign: 'center', padding: '16px 0' }}>No learners enrolled yet.</p>
            )}
            {learners.slice(0, 8).map((l, i) => {
              const uid     = String(l._id || '');
              const name    = l.name || l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Learner';
              const courses = learnerAssignCount[uid] || 0;
              const latest  = learnerLatestCourse[uid] || '—';
              return (
                <div key={uid || i} className={s.learnerRow}>
                  <InitialAvatar name={name} idx={i} />
                  <div className={s.learnerInfo}>
                    <div className={s.learnerName}>{name}</div>
                    <div className={s.learnerSub}>{latest}</div>
                  </div>
                  <div className={s.learnerStats}>
                    <div className={s.statLabel}>COURSES</div>
                    <div className={s.statVal}>{courses}</div>
                  </div>
                  <div className={s.learnerStats}>
                    <div className={s.statLabel}>STATUS</div>
                    <div className={s.statVal} style={{ textTransform: 'capitalize' }}>{l.status || 'Active'}</div>
                  </div>
                  <button className={s.btnView} onClick={() => router.push(`/storeowner/track-analysis/${uid}`)}>
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quiz completion tracking */}
        <div className={`${s.card} ${s.videoCard}`}>
          <div className={s.cardHead}>
            <h3 className={s.cardTitle}>Quiz Completion Tracking</h3>
          </div>
          <div className={s.cardBody}>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                style={{ color: selectedCourse ? '#1a2b2b' : undefined }}
                value={selectedCourse?._id || ''}
                onChange={e => {
                  const found = coursesForDrop.find(c => c._id === e.target.value);
                  setSelectedCourse(found || null);
                }}
              >
                <option value="" disabled>Select Course</option>
                {coursesForDrop.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <span className={s.chevron}>{ChevronIcon}</span>
            </div>

            {!selectedCourse && (
              <p className={s.emptyNote}>Select a course to view quiz stats.</p>
            )}
            {selectedCourse && quizTopics.length === 0 && (
              <p className={s.emptyNote}>No quiz topics in this course.</p>
            )}

            {quizTopics.length > 0 && (
              <div className={s.videoList}>
                {quizTopics.map(tp => {
                  const tid   = String(tp._id);
                  const stats = topicStatMap[tid] || { total: 0, passed: 0 };
                  const pct   = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                  return (
                    <div key={tid} className={s.videoItem}>
                      <div className={s.videoTitle}>{tp.title}</div>
                      <div className={s.videoSub}>Quiz · {stats.total} attempt{stats.total !== 1 ? 's' : ''}</div>
                      <div className={s.videoProgressRow}>
                        <div className={s.videoTrack}>
                          <div className={s.videoFill} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={s.videoScore}>{stats.passed}/{stats.total}</span>
                      </div>
                      <div className={s.videoMeta}>Pass rate: {pct}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
