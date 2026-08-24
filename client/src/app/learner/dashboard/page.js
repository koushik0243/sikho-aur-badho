'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser, selectAuthReady } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import { API_URL } from '../../../lib/constant';
import s from "./Dashboard.module.css";

function Gauge({ pct = 0, size = 56, stroke = 5, color = '#0b7b7b', textColor }) {
  const r    = (size - stroke) / 2;
  const cx   = size / 2;
  const dash = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke}/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * dash} ${dash - (pct / 100) * dash}`}
        transform={`rotate(-90 ${cx} ${cx})`}/>
      <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="800" fill={textColor || color}>
        {pct}
      </text>
    </svg>
  );
}

const Icon = {
  trend:   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>,
  clock:   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>,
  check:   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
  score:   <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>,
  video:   <svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>,
  book:    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4 7.962 7.962 0 009 5.189V4.804z"/></svg>,
  cert:    <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>,
  chevron: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>,
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(d) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} mins ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hr${h > 1 ? 's' : ''} ago` : `${Math.floor(h / 24)}d ago`;
}

export default function LearnerDashboardPage() {
  const user      = useSelector(selectUser);
  const authReady = useSelector(selectAuthReady);
  const router    = useRouter();

  const [courses,    setCourses]    = useState([]);
  const [sessions,   setSessions]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState({ progress: 0, hours: 0, pass: 0, score: 0, quizTotal: 0 });
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    const userId = user?._id ? String(user._id) : '';
    const orgId  = (() => {
      const raw = user?.orgId;
      if (!raw) return null;
      if (typeof raw === 'object' && raw._id) return String(raw._id);
      return String(raw);
    })();

    if (!userId) {
      if (authReady) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [caRes, courseRes, ocRes, sessRes, actRes] = await Promise.all([
        apiServiceHandler('GET', `course-assignment/list?userId=${userId}`).catch(() => null),
        apiServiceHandler('GET', 'course/list').catch(() => null),
        orgId ? apiServiceHandler('GET', `organization-course/list?orgId=${orgId}`).catch(() => null) : Promise.resolve(null),
        apiServiceHandler('GET', 'live-session/list').catch(() => null),
        apiServiceHandler('GET', `activity-log/list?userId=${userId}`).catch(() => null),
      ]);

      const toArr = res => {
        if (Array.isArray(res))                  return res;
        if (Array.isArray(res?.data))            return res.data;
        if (Array.isArray(res?.data?.courses))   return res.data.courses;
        if (Array.isArray(res?.data?.data))      return res.data.data;
        if (Array.isArray(res?.data?.list))      return res.data.list;
        if (Array.isArray(res?.courses))         return res.courses;
        if (Array.isArray(res?.list))            return res.list;
        if (Array.isArray(res?.result))          return res.result;
        return [];
      };

      const userAssignments = toArr(caRes);
      const allCourses      = toArr(courseRes);
      const orgCourseList   = toArr(ocRes);
      const liveSessions    = toArr(sessRes);
      const activityList    = toArr(actRes);

      // Build courseMap — org-course entries carry course_image so overlay last
      const courseMap = {};
      for (const c of allCourses) {
        const key = String(c._id || c.id || '');
        if (key) courseMap[key] = c;
      }
      for (const oc of orgCourseList) {
        const rawId = oc.courseId?._id
          ? String(oc.courseId._id)
          : typeof oc.courseId === 'string' ? oc.courseId : null;
        if (rawId && oc.courseId && typeof oc.courseId === 'object') {
          courseMap[rawId] = { ...courseMap[rawId], ...oc.courseId };
        }
      }

      // Deduplicate user assignments by courseId — keep latest per course
      const seen = new Map();
      for (const a of userAssignments) {
        const rawCid = a.courseId?._id || a.courseId?.id
          || (typeof a.courseId === 'string' ? a.courseId : null);
        const cid = rawCid ? String(rawCid) : null;
        if (!cid) continue;
        const existing = seen.get(cid);
        if (!existing || new Date(a.attemptedAt) > new Date(existing.attemptedAt)) {
          seen.set(cid, a);
        }
      }

      // Build assignments array with enriched course data
      let assignments = Array.from(seen.entries()).map(([cid, a]) => {
        const course = courseMap[cid]
          || (typeof a.courseId === 'object' ? a.courseId : {});
        return { _id: a._id, cid, courseId: course, courseName: course?.title, score: a.score, progress: a.progress, status: a.status };
      }).filter(a => a.courseId && (a.courseId._id || a.courseId.title));

      // Per-course fallback for any still missing course_image
      const needImage = assignments.filter(a => !a.courseId?.course_image);
      if (needImage.length > 0) {
        const fetched = await Promise.all(
          needImage.map(a => apiServiceHandler('GET', `course/${a.cid}`).catch(() => null))
        );
        fetched.forEach((res, i) => {
          if (!res) return;
          const full = res?.data ?? res;
          if (full?.course_image || full?.title) {
            const cid = needImage[i].cid;
            courseMap[cid] = { ...courseMap[cid], ...full };
          }
        });
        assignments = assignments.map(a => ({
          ...a,
          courseId: courseMap[a.cid] || a.courseId,
        }));
      }

      setCourses(assignments);
      setSessions(liveSessions.slice(0, 3));
      setActivities(activityList.slice(0, 5));

      if (assignments.length > 0) {
        const total    = assignments.length;
        const progs    = assignments.map(a => Number(a.progress || a.completionPercent || 0));
        const avgProg  = Math.round(progs.reduce((acc, v) => acc + v, 0) / total);
        const passed   = assignments.filter(a => {
          const s = (a.status || '').toLowerCase();
          return s === 'completed' || s === 'passed' || a.isPassed;
        }).length;
        const scores   = assignments.map(a => Number(a.score || a.quizScore || 0)).filter(v => v > 0);
        const avgScore = scores.length ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length) : 0;
        const hrs      = assignments.reduce((acc, a) => acc + Number(a.totalHours || a.hoursSpent || 0), 0);
        setStats({ progress: avgProg, hours: Math.round(hrs * 10) / 10, pass: Math.round((passed / total) * 100), score: avgScore, quizTotal: total });
      }
    } finally {
      setLoading(false);
    }
  }, [user, authReady]);

  useEffect(() => { load(); }, [load]);

  const STATS = [
    { key: 'progress', label: 'Progress',  caption: 'Course Completion', icon: Icon.trend,  value: `${stats.progress}%`, pct: stats.progress, accent: true  },
    { key: 'time',     label: 'Time',       caption: 'Hours Learned',     icon: Icon.clock,  value: `${stats.hours} Hrs`, pct: Math.min(100, stats.hours * 5) },
    { key: 'pass',     label: 'Pass',       caption: 'Quiz Attempts',     icon: Icon.check,  value: `${stats.pass}%`, sub: `/${stats.quizTotal}`, pct: stats.pass },
    { key: 'score',    label: 'Score',      caption: 'Overall Score',     icon: Icon.score,  value: `${stats.score}%`, pct: stats.score },
  ];

  return (
    <div className={s.page}>
      {/* ── Section title ── */}
      <h2 className={s.sectionHeading}>Overview</h2>

      {/* ── Stats ── */}
      <div className={s.statsRow}>
        {STATS.map(st => (
          <div key={st.key} className={`${s.statCard} ${st.accent ? s.statCardAccent : ''}`}>
            <div className={s.statTop}>
              <div className={`${s.statIconWrap} ${st.accent ? s.statIconAccent : ''}`}>
                {st.icon}
              </div>
              <span className={s.statLabel}>{st.label}</span>
            </div>
            <div className={s.statBottom}>
              <div>
                <div className={s.statValue}>
                  {loading ? '—' : st.value}
                  {!loading && st.sub && <span className={s.statSub}>{st.sub}</span>}
                </div>
                <div className={s.statCaption}>{st.caption}</div>
              </div>
              <Gauge
                pct={loading ? 0 : st.pct}
                color={st.accent ? 'rgba(255,255,255,0.9)' : '#0b7b7b'}
                textColor={st.accent ? '#fff' : '#0b7b7b'}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Mid row: My Courses + Sessions ── */}
      <div className={s.midRow}>
        {/* My Courses */}
        <div className={s.coursesPanel}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>My Courses</h2>
            <button className={s.viewAllBtn} onClick={() => router.push('/learner/courses')}>
              View all <span className={s.chevIcon}>{Icon.chevron}</span>
            </button>
          </div>

          {loading ? (
            <div className={s.courseGrid}>{[0,1].map(i => <div key={i} className={s.skelCard}/>)}</div>
          ) : courses.length === 0 ? (
            <div className={s.empty}><span>{Icon.book}</span><p>No courses enrolled yet.</p></div>
          ) : (
            <div className={s.courseGrid}>
              {courses.slice(0, 2).map((ca, i) => {
                const c     = ca.courseId || ca.course || {};
                const title = c.title || ca.courseName || 'Untitled Course';
                const desc  = c.desc || c.description || '';
                const cat   = c.catId?.title || c.category || '';
                const img   = c.course_image ? `${API_URL}${c.course_image}` : null;
                const pct   = Number(ca.progress || ca.completionPercent || 0);
                const cId   = c._id ? String(c._id) : null;
                return (
                  <div key={ca._id || i} className={s.courseCard}>
                    <div className={s.courseThumb}>
                      {img
                        ? <img src={img} alt={title} className={s.courseImg}/>
                        : <div className={s.courseImgPlaceholder}>{Icon.book}</div>
                      }
                      <div className={s.progressTrack}>
                        <div className={s.progressFill} style={{ width: `${pct}%` }}/>
                        <span className={s.progressLabel}>{pct}%</span>
                      </div>
                    </div>
                    <div className={s.courseBody}>
                      <div className={s.courseTopRow}>
                        {cat && <p className={s.courseCategory}>{cat}</p>}
                        <button className={s.courseMenuBtn} aria-label="More options">⋯</button>
                      </div>
                      <h3 className={s.courseTitle}>{title}</h3>
                      {desc && <p className={s.courseDesc}>{desc}</p>}
                      <div className={s.courseBtns}>
                        <button className={s.btnExplore} onClick={() => cId && router.push(`/learner/courses/${cId}`)}>Explore</button>
                        <button className={s.btnResume}  onClick={() => cId && router.push(`/learner/courses/${cId}`)}>Resume</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Sessions */}
        <div className={s.sessionsPanel}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Upcoming Live Sessions</h2>
            <button className={s.viewAllBtn}>View all <span className={s.chevIcon}>{Icon.chevron}</span></button>
          </div>

          {loading ? (
            <div className={s.sessionList}>{[0,1,2].map(i => <div key={i} className={s.skelSession}/>)}</div>
          ) : sessions.length === 0 ? (
            <div className={s.empty}><span>{Icon.video}</span><p>No upcoming sessions.</p></div>
          ) : (
            <div className={s.sessionList}>
              {sessions.map((sess, i) => {
                const img = (sess.thumbnail || sess.image) ? `${API_URL}${sess.thumbnail || sess.image}` : null;
                return (
                  <div key={sess._id || i} className={`${s.sessionItem} ${i === 1 ? s.sessionItemActive : ''}`}>
                    <div className={s.sessionThumb}>
                      {img
                        ? <img src={img} alt={sess.title} className={s.sessionThumbImg}/>
                        : <div className={s.sessionThumbPlaceholder}>{Icon.video}</div>
                      }
                    </div>
                    <div className={s.sessionBody}>
                      <p className={s.sessionTitle}>{sess.title || 'Live Session'}</p>
                      <p className={s.sessionInstructor}>Session with {sess.instructor || sess.instructorName || 'Instructor Name'}</p>
                      <p className={s.sessionTime}>{fmtDate(sess.scheduledAt || sess.date)} &nbsp;{fmtTime(sess.scheduledAt || sess.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className={s.activitySection}>
        <div className={s.panelHead}>
          <h2 className={s.panelTitle}>Recent Activity Log</h2>
          <button className={s.viewAllBtn}>View all <span className={s.chevIcon}>{Icon.chevron}</span></button>
        </div>

        {loading ? (
          <div className={s.activityList}>{[0,1,2].map(i => <div key={i} className={s.skelActivity}/>)}</div>
        ) : activities.length === 0 ? (
          <div className={s.empty}><span>{Icon.cert}</span><p>No recent activity.</p></div>
        ) : (
          <div className={s.activityList}>
            {activities.map((act, i) => (
              <div key={act._id || i} className={s.activityItem}>
                <span className={s.activityNum}>{i + 1}</span>
                <div className={s.activityBody}>
                  <p className={s.activityTitle}>{act.title || act.action || 'Activity'}</p>
                  {act.description && <p className={s.activityDesc}>{act.description}</p>}
                </div>
                <div className={s.activityMeta}>
                  {act.badge && <span className={s.activityBadge}>{act.badge}</span>}
                  <span className={s.activityTime}>{timeAgo(act.createdAt || act.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
