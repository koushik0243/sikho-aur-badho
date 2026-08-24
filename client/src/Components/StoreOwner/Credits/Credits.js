'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./Credits.module.css";

function getTokenUserId() {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload._id || null;
  } catch { return null; }
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function CreditBar({ value, max, showBubble, bubbleLabel }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={s.barRow}>
      <div className={s.barLabel} />
      <div className={s.barTrack}>
        <div className={s.barFill} style={{ width: `${pct}%` }}>
          {showBubble && (
            <div className={s.barBubble}>{bubbleLabel ?? value}</div>
          )}
        </div>
      </div>
      <div className={s.barValue}>{value}</div>
    </div>
  );
}

export default function CreditsPage() {
  const user = useSelector(selectUser);

  const [loading, setLoading]           = useState(true);
  const [lastCredit, setLastCredit]     = useState(null);
  const [allCredits, setAllCredits]     = useState([]);
  const [activeUsers, setActiveUsers]   = useState(0);
  const [assignedCount, setAssigned]    = useState(0);
  const [history, setHistory]           = useState([]);
  const [histPage, setHistPage]         = useState(1);

  const PAGE_SIZE = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let orgId = user?.orgId ? String(user.orgId) : null;
      if (!orgId) {
        const uid = user?._id || getTokenUserId();
        if (uid) {
          const r = await apiServiceHandler('GET', `user/admin/edit/${uid}`);
          const rec = r?.data ?? r;
          if (rec?.orgId) orgId = String(rec.orgId);
        }
      }
      if (!orgId) return;

      const [creditRes, usersRes, histRes] = await Promise.all([
        apiServiceHandler('GET', `organization-credit-assignment/list?orgId=${orgId}`),
        apiServiceHandler('GET', `user/admin/list?orgId=${orgId}&user_type=employee&orgRole=employee`),
        apiServiceHandler('GET', `credit-used/list?orgId=${orgId}`),
      ]);

      // All credit purchases — sort newest first; keep last for the label
      const credits = Array.isArray(creditRes?.data) ? creditRes.data : [];
      if (credits.length > 0) {
        credits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllCredits(credits);
        setLastCredit(credits[0]);
      }

      // Active users count
      const userList = Array.isArray(usersRes?.data) ? usersRes.data : [];
      setActiveUsers(userList.filter(u => u.status === 'active' || !u.status).length);

      // Credit usage history from credit-used table — also the source of truth for
      // "credits used": AssignCourses.js and AddLearner.js each log one active
      // credit-used record per course assignment, so every assignment (not just a
      // learner's first) counts here.
      const hist = Array.isArray(histRes?.data) ? histRes.data
        : Array.isArray(histRes) ? histRes : [];
      hist.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setHistory(hist);
      setAssigned(hist.filter(h => (h.status || 'active') === 'active').length);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived values
  const creditInfo  = lastCredit?.creditId ?? {};
  const limitFrom   = creditInfo.limit_from ?? 0;
  const limitTo     = creditInfo.limit_to ?? 0;
  const creditLabel = creditInfo.title
    ? `${creditInfo.title} — (${limitFrom}–${limitTo}) credits`
    : '—';

  // Total credits = sum of every credit pack purchased by the org to date
  const totalCredits = allCredits.reduce(
    (sum, c) => sum + (c.creditId?.limit_to ?? 0),
    0
  );
  const creditsRemaining = totalCredits - assignedCount;

  const SNAPSHOT = [
    { label: 'Credits',           value: loading ? '…' : creditLabel,                          bold: true },
    { label: 'Total learners',    value: loading ? '…' : String(activeUsers) },
    { label: 'Credits remaining', value: loading ? '…' : String(creditsRemaining),              large: true },
    { label: 'Credit cost',       value: '1 Per Course Assigned',                              bold: true },
    { label: 'Credits used',      value: loading ? '…' : `${assignedCount} / ${totalCredits}` },
  ];

  return (
    <>
      {/* ── Two-column top section ── */}
      <div className={s.topGrid}>

        {/* Left: Credit Usage bars */}
        <div className={s.card}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Credit Usage</h2>
            <div className={s.bubbleBadge}>{loading ? '…' : creditsRemaining}</div>
          </div>
          <div className={s.cardBody}>
          <div className={s.barsGroup}>
            <div className={s.barsGroupLabel}>Issued This Cycle</div>
            <CreditBar value={totalCredits} max={totalCredits || 1} />
          </div>

          <div className={s.barsGroup}>
            <div className={s.barsGroupLabel}>Consumed</div>
            <CreditBar value={assignedCount} max={totalCredits || 1} />
          </div>

          <div className={s.barsDivider} />

          <div className={s.barsGroup}>
            <div className={s.barsGroupLabel}>Remaining</div>
            <CreditBar
              value={creditsRemaining > 0 ? creditsRemaining : 0}
              max={totalCredits || 1}
              showBubble
              bubbleLabel={String(creditsRemaining > 0 ? creditsRemaining : 0)}
            />
          </div>
          </div>
        </div>

        {/* Right: Store Snapshot */}
        <div className={s.card}>
          <div className={s.cardHead}><h2 className={s.cardTitle}>Store Snapshot</h2></div>
          <div className={s.cardBody}>
          <div className={s.snapshotList}>
            {SNAPSHOT.map((row) => (
              <div key={row.label} className={s.snapshotRow}>
                <span className={s.snapshotLabel}>{row.label}</span>
                <span className={s.snapshotDots} />
                <span className={`${s.snapshotValue} ${row.large ? s.snapshotValueLarge : ''} ${row.bold ? s.snapshotValueBold : ''}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* ── Credit Usage History ── */}
      {(() => {
        const totalPages   = Math.ceil(history.length / PAGE_SIZE);
        const pagedHistory = history.slice((histPage - 1) * PAGE_SIZE, histPage * PAGE_SIZE);
        return (
          <div className={s.card}>
            <div className={s.cardHead}><h2 className={s.cardTitle}>Credit Usage History</h2></div>
            <div className={s.cardBody}>
            <table className={s.historyTable}>
              <thead>
                <tr>
                  <th className={s.thNum}>Sl.</th>
                  <th className={s.thLearner}>Learner</th>
                  <th className={s.thCourse}>Course</th>
                  <th className={s.thStatus}>Status</th>
                  <th className={s.thHistDate}>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className={s.historyRow}>
                      <td colSpan={5}><div className={s.skeletonRow} /></td>
                    </tr>
                  ))
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={s.tdEmpty}>
                      No credit usage history yet.
                      <div className={s.tdEmptyDivider} />
                    </td>
                  </tr>
                ) : pagedHistory.map((row, i) => {
                  const isActive = (row.status || 'active') === 'active';
                  return (
                    <tr key={row._id ?? i} className={s.historyRow}>
                      <td className={s.tdNum}>{(histPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className={s.tdAction}>
                        {row.learnerId?.name || row.learnerId?.email || '—'}
                      </td>
                      <td className={s.tdBalance}>
                        {row.courseId?.title || '—'}
                      </td>
                      <td className={s.tdDate}>
                        <span className={`${s.statusBadge} ${isActive ? s.statusBadgeActive : s.statusBadgeInactive}`}>
                          {row.status || 'active'}
                        </span>
                      </td>
                      <td className={s.tdCredits}>{fmtDate(row.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && (
              <div className={s.pagination}>
                <span className={s.paginationInfo}>
                  Showing {history.length === 0 ? 0 : (histPage - 1) * PAGE_SIZE + 1}–{Math.min(histPage * PAGE_SIZE, history.length)} of {history.length}
                </span>
                <div className={s.paginationBtns}>
                  <button className={s.pageBtn} onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage <= 1}>‹</button>
                  {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`${s.pageBtn} ${p === histPage ? s.pageBtnActive : ''}`}
                      onClick={() => setHistPage(p)}
                    >{p}</button>
                  ))}
                  <button className={s.pageBtn} onClick={() => setHistPage(p => Math.min(totalPages, p + 1))} disabled={histPage >= totalPages}>›</button>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
