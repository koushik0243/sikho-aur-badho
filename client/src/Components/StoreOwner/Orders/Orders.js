'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./Orders.module.css";

const LIMIT = 10;

const Icon = {
  orders:   <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zm12 16a1 1 0 100-2 1 1 0 000 2zM7 17a1 1 0 100-2 1 1 0 000 2z" /></svg>,
  success:  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  pending:  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>,
  failed:   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
};

const STATUS_CFG = {
  success:  { label: 'Success',  cls: 'badgeSuccess' },
  pending:  { label: 'Pending',  cls: 'badgePending' },
  failed:   { label: 'Failed',   cls: 'badgeFailed' },
  canceled: { label: 'Canceled', cls: 'badgeCanceled' },
  refunded: { label: 'Refunded', cls: 'badgeRefunded' },
};

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

function fmtAmount(val) {
  const n = val != null ? parseFloat(val) : null;
  return n != null && !isNaN(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
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

export default function OrdersPage() {
  const user   = useSelector(selectUser);
  const router = useRouter();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ total: 0, success: 0, pending: 0, failed: 0 });
  const [page, setPage]       = useState(1);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      let effectiveOrgId = user?.orgId ? String(user.orgId) : null;
      if (!effectiveOrgId) {
        const uid = user?._id || getTokenUserId();
        if (uid) {
          const r = await apiServiceHandler('GET', `user/admin/edit/${uid}`);
          const rec = r?.data ?? r;
          if (rec?.orgId) effectiveOrgId = String(rec.orgId);
        }
      }
      if (!effectiveOrgId) { setOrders([]); setLoading(false); return; }

      const res = await apiServiceHandler('GET', `order/list?organizer_id=${effectiveOrgId}`);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.purchase_date || b.createdAt) - new Date(a.purchase_date || a.createdAt));
      setOrders(list);
      setStats({
        total:   list.length,
        success: list.filter(o => o.status === 'success').length,
        pending: list.filter(o => o.status === 'pending').length,
        failed:  list.filter(o => o.status === 'failed' || o.status === 'canceled').length,
      });
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const totalPages = Math.max(1, Math.ceil(orders.length / LIMIT));
  const from       = orders.length === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to         = Math.min(page * LIMIT, orders.length);
  const paged      = orders.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <>
      {/* ── Stats row ── */}
      <div className={s.statsRow}>
        <div className={`${s.statCard} ${s.statCardTeal}`}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.orders}</div>
              <div className={s.statLabel}>Total Orders</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.total}</div>
            <div className={`${s.statDelta} ${s.statDeltaUp}`}>All time</div>
          </div>
          <StatRing value={loading ? 0 : stats.total} pct={Math.min(stats.total, 100)} light />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.success}</div>
              <div className={s.statLabel}>Successful</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.success}</div>
            <div className={`${s.statDelta} ${s.statDeltaUp}`}>Completed</div>
          </div>
          <StatRing value={loading ? 0 : stats.success}
            pct={stats.total ? Math.round(stats.success / stats.total * 100) : 0} />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.pending}</div>
              <div className={s.statLabel}>Pending</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.pending}</div>
            <div className={s.statDelta}>Awaiting</div>
          </div>
          <StatRing value={loading ? 0 : stats.pending}
            pct={stats.total ? Math.round(stats.pending / stats.total * 100) : 0} />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.failed}</div>
              <div className={s.statLabel}>Failed</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.failed}</div>
            <div className={s.statDelta}>Failed / Canceled</div>
          </div>
          <StatRing value={loading ? 0 : stats.failed}
            pct={stats.total ? Math.round(stats.failed / stats.total * 100) : 0} />
        </div>
      </div>

      {/* ── Table card ── */}
      <div className={s.tableCard}>
        <div className={s.cardHead}><div className={s.tableCardTitle}>All Orders</div></div>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>#</th>
              <th className={s.th}>Date</th>
              <th className={s.th}>Plan</th>
              <th className={s.th}>Credits</th>
              <th className={s.th}>Amount</th>
              <th className={s.th}>Gateway</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={s.tr}>
                  <td className={s.td} colSpan={8}><div className={s.skeletonRow} /></td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className={s.tdEmpty}>No orders found.</td></tr>
            ) : paged.map((o, i) => {
              const statusKey = (o.status || 'pending').toLowerCase();
              const sc = STATUS_CFG[statusKey] ?? { label: o.status || '—', cls: 'badgePending' };
              const credit = o.credit_id ?? {};
              const creditRange = credit.limit_from != null && credit.limit_to != null
                ? `${credit.limit_from}–${credit.limit_to}`
                : credit.limit_to != null ? String(credit.limit_to)
                : credit.limit_from != null ? `${credit.limit_from}+` : '—';
              return (
                <tr key={o._id ?? i} className={s.tr}>
                  <td className={s.td}>{(page - 1) * LIMIT + i + 1}</td>
                  <td className={s.td}>{fmtDate(o.purchase_date || o.createdAt)}</td>
                  <td className={s.td}>{credit.title || '—'}</td>
                  <td className={s.td}>{creditRange}</td>
                  <td className={s.td}>{fmtAmount(o.credit_amount)}</td>
                  <td className={s.td} style={{ textTransform: 'capitalize' }}>{o.payment_gateway || '—'}</td>
                  <td className={s.td}>
                    <span className={`${s.badge} ${s[sc.cls]}`}>{sc.label}</span>
                  </td>
                  <td className={s.td}>
                    <button className={s.btnView} onClick={() => router.push(`/storeowner/orders/${o._id}`)}>VIEW</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={s.pagination}>
          <div className={s.footerLeft}>
            <span>Showing {from}–{to} of {orders.length}</span>
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
    </>
  );
}
