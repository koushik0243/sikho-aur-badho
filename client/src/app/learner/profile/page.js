'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { selectUser, selectAuthReady } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import { API_URL } from '../../../lib/constant';
import s from "./Profile.module.css";

// Parse/format a plain `YYYY-MM-DD` string as a LOCAL date (not UTC) — avoids the
// classic off-by-one-day bug `new Date('YYYY-MM-DD')` / `date.toISOString()` causes
// near midnight in timezones behind UTC.
function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// UI toggle key -> server field name (server/users/user.model.js "Notification Preferences")
const NOTIF_FIELD_MAP = {
  email:    'email_welcome_noti',
  live:     'live_session_noti',
  lang:     'language_change_noti',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Gauge ring ────────────────────────────────────────────────────────────────
function Gauge({ pct = 0, size = 52, stroke = 5, color = '#0b7b7b' }) {
  const r  = (size - stroke) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e8edf0" strokeWidth={stroke}/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }}/>
      <text x={cx} y={cx + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a2b2b">{pct}%</text>
    </svg>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label }) {
  return (
    <button className={`${s.toggle} ${on ? s.toggleOn : ''}`} onClick={() => onChange(!on)} aria-label={label}>
      <span className={s.toggleThumb}/>
      <span className={s.toggleLabel}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}

// ── Course status badge ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    complete:    { label: 'Complete',    cls: s.statusComplete },
    completed:   { label: 'Complete',    cls: s.statusComplete },
    passed:      { label: 'Complete',    cls: s.statusComplete },
    ongoing:     { label: 'Ongoing',     cls: s.statusOngoing },
    'in progress': { label: 'In progress', cls: s.statusInProgress },
    inprogress:  { label: 'In progress', cls: s.statusInProgress },
  };
  const norm = (status || '').toLowerCase().replace(/\s+/g, '');
  const entry = map[norm] || map[(status || '').toLowerCase()] || { label: status || 'In progress', cls: s.statusInProgress };
  return <span className={`${s.statusBadge} ${entry.cls}`}>{entry.label}</span>;
}

// ── Initials avatar ───────────────────────────────────────────────────────────
function CourseAvatar({ title, color }) {
  const initials = (title || 'C').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#0b7b7b', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
  const bg = color || colors[Math.abs([...initials].reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length];
  return <div className={s.courseAvatar} style={{ background: bg }}>{initials}</div>;
}

// ── Badges ────────────────────────────────────────────────────────────────────
const BADGES = [
  { id: 'firstpass', label: 'First Pass', sub: 'Quiz 100% first try' },
  { id: 'streak',    label: 'On A Streak', sub: '7 days active' },
  { id: 'certified', label: 'Certified',   sub: '1 Course done' },
];
function BadgeIcon({ id }) {
  if (id === 'firstpass') return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="#0b7b7b" strokeWidth="3" fill="#e8f5f5"/>
      <path d="M16 24l6 6 10-10" stroke="#0b7b7b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (id === 'streak') return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="#0b7b7b" strokeWidth="3" fill="#e8f5f5"/>
      <path d="M24 14c-2 4-6 6-6 11a6 6 0 0012 0c0-3-2-5-3-7-1 2-1 4-1 4s-3-2-2-8z" fill="#0b7b7b" opacity="0.7"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="#0b7b7b" strokeWidth="3" fill="#e8f5f5"/>
      <path d="M18 20v-4a2 2 0 012-2h8a2 2 0 012 2v4M14 20h20v12a2 2 0 01-2 2H16a2 2 0 01-2-2V20z" stroke="#0b7b7b" strokeWidth="2"/>
    </svg>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  edit:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>,
  trend:   <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>,
  book:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4 7.962 7.962 0 009 5.189V4.804z"/></svg>,
  quiz:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
  cert:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>,
  mail:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>,
  bell:    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z"/></svg>,
  globe:   <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/></svg>,
};

export default function ProfilePage() {
  const user      = useSelector(selectUser);
  const authReady = useSelector(selectAuthReady);
  const userId    = user ? String(user._id || user.id || '') : '';

  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [notifSettings, setNotifSettings] = useState({
    email: true, live: false, lang: true,
  });

  // Authoritative personal-details fields (name/dob/zipcode/address1/etc.) loaded fresh
  // from the server — the Redux-cached `user` object only ever holds what the login
  // response returns (_id, name, email, user_type, orgId, orgRole, status), so anything
  // else must come from here, not from `user`.
  const [profile, setProfile] = useState(null);
  const [editOpen,   setEditOpen]   = useState(false);
  const [editForm,   setEditForm]   = useState({ name: '', dob: '', zipcode: '', address1: '' });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { if (authReady) setLoading(false); return; }
    setLoading(true);
    try {
      const res  = await apiServiceHandler('GET', `course-assignment/list?userId=${userId}`).catch(() => null);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAssignments(list);
    } finally {
      setLoading(false);
    }
  }, [userId, authReady]);

  useEffect(() => { load(); }, [load]);

  // Load the learner's full profile record (personal details + notification prefs) —
  // falls back to the useState defaults above until this resolves.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    apiServiceHandler('GET', `user/admin/edit/${userId}`)
      .then(res => {
        if (cancelled) return;
        const data = res?.data ?? res;
        if (!data) return;
        setProfile(data);
        setNotifSettings({
          email: !!data.email_welcome_noti,
          live:  !!data.live_session_noti,
          lang:  !!data.language_change_noti,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  async function handleNotifToggle(key, value) {
    const previous = notifSettings[key];
    setNotifSettings(prev => ({ ...prev, [key]: value })); // optimistic
    try {
      await apiServiceHandler('PUT', `user/admin/update/${userId}`, { [NOTIF_FIELD_MAP[key]]: value });
      toast.success('Preference updated.');
    } catch (err) {
      setNotifSettings(prev => ({ ...prev, [key]: previous })); // revert on failure
      toast.error(err?.message || 'Could not update preference. Please try again.');
    }
  }

  function openEditModal() {
    setEditForm({
      name:     profile?.name || '',
      dob:      profile?.dob ? String(profile.dob).slice(0, 10) : '',
      zipcode:  profile?.zipcode  || '',
      address1: profile?.address1 || '',
    });
    setEditOpen(true);
  }

  async function handleSavePersonalDetails(e) {
    e.preventDefault();
    if (!userId || editSaving) return;
    const payload = {
      name:     editForm.name.trim(),
      dob:      editForm.dob || null,
      zipcode:  editForm.zipcode.trim(),
      address1: editForm.address1.trim(),
    };
    setEditSaving(true);
    try {
      await apiServiceHandler('PUT', `user/admin/update/${userId}`, payload);
      setProfile(prev => ({ ...(prev || {}), ...payload }));
      setEditOpen(false);
      toast.success('Personal details updated.');
    } catch (err) {
      toast.error(err?.message || 'Could not update personal details. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

  const completedCount = assignments.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s === 'completed' || s === 'passed' || s === 'complete' || Number(a.score) >= 70;
  }).length;

  const totalCourses  = assignments.length;
  const overallPct    = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
  const avgScore      = assignments.length > 0
    ? Math.round(assignments.reduce((acc, a) => acc + Number(a.score || 0), 0) / assignments.length)
    : 0;

  // `profile` (server/users/user.model.js field names) is the authoritative source once
  // loaded; `user` (Redux, login-response shape) only ever has _id/name/email/user_type/
  // orgId/orgRole/status, so it's just the pre-load fallback for the two fields it has.
  const userName    = profile?.name    || user?.name  || user?.email || 'Learner';
  const userEmail   = profile?.email   || user?.email || '—';
  const userMobile  = profile?.phone      || '—';
  const userDept    = profile?.department || '—';
  const userEmpId   = profile?.emp_id     || '—';
  const userZip     = profile?.zipcode    || '—';
  const userAddress = profile?.address1   || '—';
  const joinDate    = profile?.createdAt  || user?.createdAt || null;
  const birthDate   = profile?.dob        || null;
  const imgSrc      = profile?.profileImage ? `${API_URL}${profile.profileImage}` : null;

  return (
    <div className={s.page}>
      {/* ── Top: avatar + stats ── */}
      <div className={s.topSection}>
        {/* Avatar column */}
        <div className={s.avatarCol}>
          <div className={s.avatarWrap}>
            {imgSrc
              ? <img src={imgSrc} alt={userName} className={s.avatarImg}/>
              : <div className={s.avatarPlaceholder}>{userName.slice(0,2).toUpperCase()}</div>
            }
            <button className={s.editAvatarBtn} title="Edit photo">{Icon.edit}</button>
          </div>
          <h2 className={s.profileName}>{userName}</h2>
          <p className={s.profileCourse}>
            {assignments[0]?.courseId?.title || assignments[0]?.courseTitle || 'Active Learner'}
          </p>
          <div className={s.profileTags}>
            <span className={s.tagGreen}>Notifications On</span>
            <span className={s.tagTeal}>Active Learner</span>
          </div>
          <p className={s.joinDate}>
            Joined {joinDate ? new Date(joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>

        {/* Stats grid */}
        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <div className={s.statHeader}>
              <span className={s.statIcon}>{Icon.trend}</span>
              <span className={s.statLbl}>Overall Progress</span>
            </div>
            <div className={s.statBody}>
              <div className={s.statBig}>{overallPct}%</div>
              <div className={s.statGauge}><Gauge pct={overallPct}/></div>
            </div>
            <p className={s.statSub}>{completedCount} of {totalCourses} Courses</p>
          </div>
          <div className={s.statCard}>
            <div className={s.statHeader}>
              <span className={s.statIcon}>{Icon.book}</span>
              <span className={s.statLbl}>Chapters Done</span>
            </div>
            <div className={s.statBody}>
              <div className={s.statBig}>—</div>
              <div className={s.statGauge}><Gauge pct={0} color="#6366f1"/></div>
            </div>
            <p className={s.statSub}>Of Total</p>
          </div>
          <div className={s.statCard}>
            <div className={s.statHeader}>
              <span className={s.statIcon}>{Icon.quiz}</span>
              <span className={s.statLbl}>Quiz Avg</span>
            </div>
            <div className={s.statBody}>
              <div className={s.statBig}>{avgScore > 0 ? `${avgScore}%` : '—'}</div>
              <div className={s.statGauge}><Gauge pct={avgScore} color="#f59e0b"/></div>
            </div>
            <p className={s.statSub}>Last 7 Quizzes</p>
          </div>
          <div className={s.statCard}>
            <div className={s.statHeader}>
              <span className={s.statIcon}>{Icon.cert}</span>
              <span className={s.statLbl}>Certificates</span>
            </div>
            <div className={s.statBody}>
              <div className={s.statBig}>{completedCount || '—'}</div>
              <div className={s.statGauge}><Gauge pct={completedCount > 0 ? 100 : 0} color="#10b981"/></div>
            </div>
            <p className={s.statSub}>In Progress</p>
          </div>
        </div>
      </div>

      {/* ── Bottom: details + courses + badges ── */}
      <div className={s.bottomSection}>
        {/* Left column */}
        <div className={s.leftCol}>
          {/* Personal details */}
          <div className={s.card}>
            <div className={s.cardHeadRow}>
              <h3 className={s.cardTitle}>Personal Details</h3>
              <button className={s.editBtn} onClick={openEditModal} title="Edit personal details">{Icon.edit}</button>
            </div>
            <div className={s.detailsGrid}>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Full Name</span>
                <span className={s.detailVal}>{userName}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Birth Date</span>
                <span className={s.detailVal}>{fmtDate(birthDate)}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Email</span>
                <span className={s.detailVal}>{userEmail}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Mobile Number</span>
                <span className={s.detailVal}>{userMobile}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Zip code</span>
                <span className={s.detailVal}>{userZip}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Address</span>
                <span className={s.detailVal}>{userAddress}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Department</span>
                <span className={s.detailVal}>{userDept}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Employee ID</span>
                <span className={s.detailVal}>{userEmpId}</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Member Status</span>
                <span className={s.detailVal}>Active</span>
              </div>
              <div className={s.detailItem}>
                <span className={s.detailLabel}>Register Date</span>
                <span className={s.detailVal}>{fmtDate(joinDate)}</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Notifications &amp; Language</h3>
            <div className={s.notifList}>
              {[
                { key: 'email',    icon: Icon.mail,     label: 'Email Notifications',    sub: 'Course updates, certificates' },
                { key: 'live',     icon: Icon.bell,     label: 'Live Session Reminders', sub: '30 min before Zoom sessions' },
                { key: 'lang',     icon: Icon.globe,    label: 'Language Change',        sub: 'Quiz & Interface Language' },
              ].map(item => (
                <div key={item.key} className={s.notifRow}>
                  <span className={s.notifIcon}>{item.icon}</span>
                  <div className={s.notifInfo}>
                    <span className={s.notifLabel}>{item.label}</span>
                    <span className={s.notifSub}>{item.sub}</span>
                  </div>
                  <Toggle
                    on={notifSettings[item.key]}
                    onChange={val => handleNotifToggle(item.key, val)}
                    label={item.label}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className={s.rightCol}>
          {/* My Courses */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>My Courses</h3>
            {loading ? (
              <div className={s.coursesSkeleton}>
                {[1,2,3].map(i => <div key={i} className={s.skelRow}/>)}
              </div>
            ) : assignments.length === 0 ? (
              <p className={s.emptyText}>No courses assigned yet.</p>
            ) : (
              <div className={s.coursesList}>
                {assignments.slice(0, 6).map((a, i) => {
                  const title    = a.courseId?.title || a.courseTitle || `Course ${i + 1}`;
                  const chapters = a.courseId?.totalChapters || 0;
                  const norm     = (a.status || '').toLowerCase();
                  const status   = norm === 'passed' || norm === 'completed' ? 'complete'
                                 : i === 0 ? 'ongoing' : 'in progress';
                  return (
                    <div key={i} className={s.courseRow}>
                      <CourseAvatar title={title}/>
                      <div className={s.courseInfo}>
                        <span className={s.courseName}>{title}</span>
                        <span className={s.courseMeta}>{chapters > 0 ? `${chapters} Chapters` : ''}</span>
                      </div>
                      <StatusBadge status={status}/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className={s.card}>
            <h3 className={s.cardTitle}>Badges Earned</h3>
            <div className={s.badgesGrid}>
              {BADGES.map(b => (
                <div key={b.id} className={s.badge}>
                  <BadgeIcon id={b.id}/>
                  <span className={s.badgeLabel}>{b.label}</span>
                  <span className={s.badgeSub}>{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className={s.modalOverlay} onClick={() => !editSaving && setEditOpen(false)}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={s.modalTitle}>Edit Personal Details</h3>
            <form onSubmit={handleSavePersonalDetails}>
              <div className={s.modalColumns}>
                {/* Left column: Full Name, Zip Code, Birth Date stacked */}
                <div className={s.modalLeftCol}>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Full Name</label>
                    <input
                      className={s.formInput}
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Zip Code</label>
                    <input
                      className={s.formInput}
                      type="text"
                      value={editForm.zipcode}
                      onChange={e => setEditForm(f => ({ ...f, zipcode: e.target.value }))}
                    />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Birth Date</label>
                    <DatePicker
                      selected={parseLocalDate(editForm.dob)}
                      onChange={date => setEditForm(f => ({ ...f, dob: date ? formatLocalDate(date) : '' }))}
                      dateFormat="dd-MM-yyyy"
                      placeholderText="dd-mm-yyyy"
                      className={s.formInput}
                      wrapperClassName={s.datePickerWrapper}
                      maxDate={new Date()}
                      showMonthDropdown
                      showYearDropdown
                      scrollableYearDropdown
                      yearDropdownItemNumber={80}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Right column: Address textarea stretched to match the left column's
                    height, with the action buttons pinned to its bottom — level with
                    Birth Date's row on the left. */}
                <div className={s.modalRightCol}>
                  <div className={s.formGroupGrow}>
                    <label className={s.formLabel}>Address</label>
                    <textarea
                      className={s.formTextarea}
                      value={editForm.address1}
                      onChange={e => setEditForm(f => ({ ...f, address1: e.target.value }))}
                    />
                  </div>
                  <div className={s.modalActions}>
                    <button type="button" className={s.modalBtnCancel} onClick={() => setEditOpen(false)} disabled={editSaving}>
                      Cancel
                    </button>
                    <button type="submit" className={s.modalBtnSave} disabled={editSaving}>
                      {editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
