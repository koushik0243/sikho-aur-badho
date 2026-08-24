'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./Invoices.module.css";

const LIMIT = 10;

const Icon = {
  invoices: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
  paid:     <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  pending:  <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>,
  failed:   <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
};

const PAYMENT_STATUS_CFG = {
  paid:     { label: 'Paid',     cls: 'badgePaid' },
  pending:  { label: 'Pending',  cls: 'badgePending' },
  failed:   { label: 'Failed',   cls: 'badgeFailed' },
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

export default function InvoicesPage() {
  const user   = useSelector(selectUser);
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState({ total: 0, paid: 0, pending: 0, failed: 0 });
  const [page, setPage]         = useState(1);

  const loadInvoices = useCallback(async () => {
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
      if (!effectiveOrgId) { setInvoices([]); setLoading(false); return; }

      const res = await apiServiceHandler('GET', `invoice/list?org_id=${effectiveOrgId}`);
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.payment_date || b.createdAt) - new Date(a.payment_date || a.createdAt));
      setInvoices(list);
      setStats({
        total:   list.length,
        paid:    list.filter(i => i.payment_status === 'paid').length,
        pending: list.filter(i => i.payment_status === 'pending').length,
        failed:  list.filter(i => i.payment_status === 'failed' || i.payment_status === 'refunded').length,
      });
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / LIMIT));
  const from       = invoices.length === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to         = Math.min(page * LIMIT, invoices.length);
  const paged      = invoices.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <>
      {/* ── Stats row ── */}
      <div className={s.statsRow}>
        <div className={`${s.statCard} ${s.statCardTeal}`}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.invoices}</div>
              <div className={s.statLabel}>Total Invoices</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.total}</div>
            <div className={`${s.statDelta} ${s.statDeltaUp}`}>All time</div>
          </div>
          <StatRing value={loading ? 0 : stats.total} pct={Math.min(stats.total, 100)} light />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.paid}</div>
              <div className={s.statLabel}>Paid</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.paid}</div>
            <div className={`${s.statDelta} ${s.statDeltaUp}`}>Settled</div>
          </div>
          <StatRing value={loading ? 0 : stats.paid}
            pct={stats.total ? Math.round(stats.paid / stats.total * 100) : 0} />
        </div>

        <div className={s.statCard}>
          <div className={s.statBody}>
            <div className={s.statHeader}>
              <div className={s.statIcon}>{Icon.pending}</div>
              <div className={s.statLabel}>Pending</div>
            </div>
            <div className={s.statValue}>{loading ? '—' : stats.pending}</div>
            <div className={s.statDelta}>Awaiting payment</div>
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
            <div className={s.statDelta}>Failed / Refunded</div>
          </div>
          <StatRing value={loading ? 0 : stats.failed}
            pct={stats.total ? Math.round(stats.failed / stats.total * 100) : 0} />
        </div>
      </div>

      {/* ── Table card ── */}
      <div className={s.tableCard}>
        <div className={s.cardHead}><div className={s.tableCardTitle}>All Invoices</div></div>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>#</th>
              <th className={s.th}>Invoice No</th>
              <th className={s.th}>Date</th>
              <th className={s.th}>Sub Total</th>
              <th className={s.th}>Discount</th>
              <th className={s.th}>Tax</th>
              <th className={s.th}>Total</th>
              <th className={s.th}>Method</th>
              <th className={s.th}>Status</th>
              <th className={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={s.tr}>
                  <td className={s.td} colSpan={10}><div className={s.skeletonRow} /></td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={10} className={s.tdEmpty}>No invoices found.</td></tr>
            ) : paged.map((inv, i) => {
              const psKey = (inv.payment_status || 'pending').toLowerCase();
              const sc = PAYMENT_STATUS_CFG[psKey] ?? { label: inv.payment_status || '—', cls: 'badgePending' };
              return (
                <tr key={inv._id ?? i} className={s.tr}>
                  <td className={s.td}>{(page - 1) * LIMIT + i + 1}</td>
                  <td className={s.td}><span className={s.invoiceNo}>{inv.invoice_no || '—'}</span></td>
                  <td className={s.td}>{fmtDate(inv.payment_date || inv.createdAt)}</td>
                  <td className={s.td}>{fmtAmount(inv.sub_total)}</td>
                  <td className={s.td}>{fmtAmount(inv.discount)}</td>
                  <td className={s.td}>{fmtAmount(inv.tax)}</td>
                  <td className={s.td}><strong>{fmtAmount(inv.total_amount)}</strong></td>
                  <td className={s.td} style={{ textTransform: 'capitalize' }}>{inv.payment_method || '—'}</td>
                  <td className={s.td}>
                    <span className={`${s.badge} ${s[sc.cls]}`}>{sc.label}</span>
                  </td>
                  <td className={s.td}>
                    <button className={s.btnView} onClick={() => router.push(`/storeowner/invoices/${inv._id}`)}>VIEW</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={s.pagination}>
          <div className={s.footerLeft}>
            <span>Showing {from}–{to} of {invoices.length}</span>
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
