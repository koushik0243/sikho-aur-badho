'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./UserManagement.module.css";

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

// ── Icons (content-area only) ─────────────────────────────────────
const Icon = {
  learners: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" /></svg>,
  active: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  inactive: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
  deactivated: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>,
  search: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>,
  eye: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
  edit: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>,
};

// Real account-status badge — pulled directly from the users table's `status`
// field (active/inactive/suspended/deleted), not a derived metric.
const STATUS_BADGE_CLASS = {
  active:      s.statusActiveReal,
  inactive:    s.statusInactiveReal,
  suspended:   s.statusSuspendedReal,
  deactivated: s.statusSuspendedReal,
  deleted:     s.statusDeletedReal,
};

const LIMIT = 10;

function computeStats(list) {
  const total = list.length;
  const active = list.filter(u => u.status === 'active' || !u.status).length;
  const inactive = list.filter(u => u.status === 'inactive').length;
  const deactivated = list.filter(u => u.status === 'deactivated' || u.status === 'suspended').length;
  return { total, active, inactive, deactivated };
}

function StatRing({ value, pct, light }) {
  const R = 24, sw = 5;
  const size = (R + sw) * 2 + 4;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * R;
  const arc = (Math.max(0, Math.min(pct ?? 0, 100)) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
           style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none"
                stroke={light ? 'rgba(255,255,255,0.28)' : '#d4eeee'} strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={R} fill="none"
                stroke={light ? '#fff' : '#0b7b7b'} strokeWidth={sw}
                strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        color: light ? '#fff' : '#1a2b2b',
      }}>{value}</div>
    </div>
  );
}

export default function UserManagementPage() {
  const user = useSelector(selectUser);
  const router = useRouter();

  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, deactivated: 0 });
  const [courseMap, setCourseMap] = useState({}); // { userId: ['Course A', 'Course B'] }
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusModalLearner, setStatusModalLearner] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState('active');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  function getTokenUserId() {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload._id || null;
    } catch { return null; }
  }

  const loadLearners = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Resolve orgId — from Redux, or fetch user record from DB
      let effectiveOrgId = user?.orgId ? String(user.orgId) : null;
      if (!effectiveOrgId) {
        const effectiveUserId = user?._id || getTokenUserId();
        if (effectiveUserId) {
          const userRes = await apiServiceHandler('GET', `user/admin/edit/${effectiveUserId}`);
          const userRecord = userRes?.data ?? userRes;
          if (userRecord?.orgId) effectiveOrgId = String(userRecord.orgId);
        }
      }

      if (!effectiveOrgId) { setLearners([]); setLoading(false); return; }

      // 2. Fetch employees of this org
      const params = new URLSearchParams({ orgId: effectiveOrgId, user_type: 'employee', orgRole: 'employee' });
      const res = await apiServiceHandler('GET', `user/admin/list?${params.toString()}`);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];

      setLearners(list);
      setStats(computeStats(list));

      // Fetch all course assignments for this org in one call
      if (list.length > 0) {
        apiServiceHandler('GET', `course-assignment/list?organizationId=${effectiveOrgId}`)
          .then(caRes => {
            const assignments = Array.isArray(caRes?.data) ? caRes.data : [];
            const map = {};
            assignments.forEach(a => {
              const uid = a.userId?._id ? String(a.userId._id) : String(a.userId);
              const title = a.courseId?.title || null;
              if (!title) return;
              if (!map[uid]) map[uid] = [];
              if (!map[uid].includes(title)) map[uid].push(title);
            });
            setCourseMap(map);
          })
          .catch(() => {});
      }
    } catch {
      setLearners([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  useEffect(() => { loadLearners(); }, [loadLearners]);

  function formatLastActive(dateStr) {
    if (!dateStr) return 'Today';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff}d ago`;
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function openStatusModal(learner) {
    setStatusModalLearner(learner);
    setStatusModalValue((learner.status || 'active').toLowerCase());
  }

  function closeStatusModal() {
    if (savingStatus) return;
    setStatusModalLearner(null);
  }

  async function handleSaveStatus() {
    if (!statusModalLearner) return;
    setSavingStatus(true);
    try {
      await apiServiceHandler('PUT', `user/admin/update/${statusModalLearner._id}`, { status: statusModalValue });
      setLearners(prev => {
        const next = prev.map(u => u._id === statusModalLearner._id ? { ...u, status: statusModalValue } : u);
        setStats(computeStats(next));
        return next;
      });
      toast.success('Status updated.');
      setStatusModalLearner(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to update status. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  }

  const filteredLearners = debouncedSearch
    ? learners.filter(u => {
        const needle = debouncedSearch.toLowerCase();
        return (u.name || '').toLowerCase().includes(needle)
          || (u.email || '').toLowerCase().includes(needle)
          || (u.whatsapp_no || '').toLowerCase().includes(needle);
      })
    : learners;

  const totalPages    = Math.max(1, Math.ceil(filteredLearners.length / LIMIT));
  const from          = filteredLearners.length === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to            = Math.min(page * LIMIT, filteredLearners.length);
  const pagedLearners = filteredLearners.slice((page - 1) * LIMIT, page * LIMIT);
  const displayStats  = stats;

  // Real, per-org growth/share figures — replaces the old hardcoded card captions
  // ("↑ 7 This Month", "↑ 1 New", etc.) with numbers derived from this store's own
  // learner list (already scoped to orgId in loadLearners above).
  const now = new Date();
  const newThisMonth = learners.filter(u => {
    if (!u.createdAt) return false;
    const d = new Date(u.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const pctOfTotal = (n) => displayStats.total ? Math.round((n / displayStats.total) * 100) : 0;
  const activePct      = pctOfTotal(displayStats.active);
  const inactivePct    = pctOfTotal(displayStats.inactive);
  const deactivatedPct = pctOfTotal(displayStats.deactivated);

  return (
    <>
      {/* ── Stats row ── */}
      <div className={s.statsRow}>

        <div className={`${s.statCard} ${s.statCardTeal}`}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.learners}</div>
              <div className={s.statLabel}>Total Learners</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : displayStats.total}</div>
            <div className={`${s.statDelta} ${newThisMonth > 0 ? s.statDeltaUp : ''}`}>
              {loading ? '' : newThisMonth > 0 ? `↑ ${newThisMonth} This Month` : 'No new learners this month'}
            </div>
          </div>
          <StatRing value={loading ? 0 : displayStats.total} pct={Math.min(displayStats.total, 100)} light />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.active}</div>
              <div className={s.statLabel}>Active</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : displayStats.active}</div>
            <div className={`${s.statDelta} ${s.statDeltaUp}`}>{loading ? '' : `${activePct}% of Total`}</div>
          </div>
          <StatRing value={loading ? 0 : displayStats.active}
            pct={displayStats.total ? Math.round(displayStats.active / displayStats.total * 100) : 0} />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.inactive}</div>
              <div className={s.statLabel}>Inactive</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : displayStats.inactive}</div>
            <div className={s.statDelta}>{loading ? '' : `${inactivePct}% of Total`}</div>
          </div>
          <StatRing value={loading ? 0 : displayStats.inactive}
            pct={displayStats.total ? Math.round(displayStats.inactive / displayStats.total * 100) : 0} />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.deactivated}</div>
              <div className={s.statLabel}>Deactivated</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : displayStats.deactivated}</div>
            <div className={s.statDelta}>{loading ? '' : `${deactivatedPct}% of Total`}</div>
          </div>
          <StatRing value={loading ? 0 : displayStats.deactivated}
            pct={displayStats.total ? Math.round(displayStats.deactivated / displayStats.total * 100) : 0} />
        </div>

      </div>

      {/* ── Table card ── */}
      <div className={s.tableCard}>
        <div className={s.cardHead}>
          <div className={s.tableCardTitle}>All Learners</div>
          <div className={s.searchWrap}>
            {Icon.search}
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search by name, email or WhatsApp no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Name</th>
              <th className={s.th}>Email</th>
              <th className={s.th}>WhatsApp No</th>
              <th className={s.th}>Assigned Courses</th>
              <th className={s.th}>Last Active</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className={s.tr}>
                  <td className={s.td} colSpan={7}>
                    <div className={s.skeletonRow} />
                  </td>
                </tr>
              ))
            ) : filteredLearners.length === 0 ? (
              <tr className={s.tr}>
                <td className={s.td} colSpan={7} style={{ textAlign: 'center', padding: '16px 0' }}>No learners found.</td>
              </tr>
            ) : pagedLearners.map(learner => {
              const realStatus = (learner.status || 'active').toLowerCase();
              return (
                <tr key={learner._id} className={s.tr}>
                  <td className={s.td}>
                    <div className={s.nameCell}>
                      <div className={s.avatar}>{getInitials(learner.name)}</div>
                      <span className={s.learnerName}>{learner.name || learner.email}</span>
                    </div>
                  </td>
                  <td className={s.td}><span className={s.emailText}>{learner.email}</span></td>
                  <td className={s.td}><span className={s.emailText}>{learner.whatsapp_no || '—'}</span></td>
                  <td className={s.td}><span className={s.courseCount}>{courseMap[String(learner._id)]?.length ?? '—'}</span></td>
                  <td className={s.td}><span className={s.lastActive}>{formatLastActive(learner.lastActive || learner.last_active)}</span></td>
                  <td className={s.td}>
                    <button
                      type="button"
                      className={`${s.statusBadgeReal} ${s.statusBadgeLink} ${STATUS_BADGE_CLASS[realStatus] || s.statusActiveReal}`}
                      onClick={e => { e.stopPropagation(); openStatusModal(learner); }}
                      title="Click to update status"
                    >
                      {realStatus}
                    </button>
                  </td>
                  <td className={s.td}>
                    <div className={s.actionsCell} onClick={e => e.stopPropagation()}>
                      <button className={s.btnView} title="View" onClick={() => router.push(`/storeowner/users/${learner._id}`)}>
                        {Icon.eye}
                      </button>
                      <button className={s.btnEdit} title="Edit" onClick={() => router.push(`/storeowner/users/${learner._id}/edit`)}>
                        {Icon.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={s.pagination}>
          <div className={s.footerLeft}>
            <span>Showing {from}–{to} of {learners.length}</span>
          </div>
          <div className={s.paginationBtns}>
            <button className={s.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`${s.pageBtn} ${p === page ? s.pageBtnActive : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>

      </div>

      {/* ── Update status modal ── */}
      {statusModalLearner && (
        <div className={s.modalOverlay} onClick={closeStatusModal}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle}>Update Status</div>
            <div className={s.modalSubtitle}>Learner: {statusModalLearner.name || statusModalLearner.email}</div>

            <label className={s.modalLabel}>Account Status</label>
            <select
              className={s.modalSelect}
              value={statusModalValue}
              onChange={e => setStatusModalValue(e.target.value)}
              disabled={savingStatus}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className={s.modalActions}>
              <button className={s.modalBtnCancel} onClick={closeStatusModal} disabled={savingStatus}>
                Cancel
              </button>
              <button className={s.modalBtnSave} onClick={handleSaveStatus} disabled={savingStatus}>
                {savingStatus ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
