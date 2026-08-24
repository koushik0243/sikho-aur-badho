'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { selectUser } from '../../../redux/slices/authSlice';
import s from "./Subscription.module.css";
import apiServiceHandler from '../../../service/apiService';

function CheckCircle({ dark }) {
  return (
    <svg className={`${s.checkIcon} ${dark ? s.checkIconDark : ''}`} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill={dark ? 'rgba(255,255,255,0.2)' : '#e6f4f0'} stroke="none" />
      <path d="M6 10l3 3 5-5" stroke={dark ? '#fff' : '#0b7b7b'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getTokenUserId() {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload._id || null;
  } catch { return null; }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function fmtPrice(raw) {
  const p = raw?.$numberDecimal ?? raw;
  const n = p != null ? parseFloat(p) : null;
  return n != null && !isNaN(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
}

const PAGE_SIZE = 10;

export default function SubscriptionPage() {
  const user = useSelector(selectUser);

  const [assignments, setAssignments]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [credits, setCredits]                 = useState([]);
  const [selectedCreditId, setSelectedCreditId] = useState('');
  const [purchasing, setPurchasing]           = useState(false);
  const [purchaseOrgId, setPurchaseOrgId]     = useState(null);
  const [assignPage, setAssignPage]           = useState(1);

  const loadData = useCallback(async () => {
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

      setPurchaseOrgId(effectiveOrgId);

      const [caRes, creditRes] = await Promise.all([
        effectiveOrgId
          ? apiServiceHandler('GET', `organization-credit-assignment/list?orgId=${effectiveOrgId}`).catch(() => null)
          : Promise.resolve(null),
        apiServiceHandler('GET', 'credit/list?status=active').catch(() => null),
      ]);

      const ca = Array.isArray(caRes?.data) ? caRes.data : (Array.isArray(caRes) ? caRes : []);
      const cr = Array.isArray(creditRes?.data) ? creditRes.data : (Array.isArray(creditRes) ? creditRes : []);

      setAssignments(ca);
      setCredits(cr);
    } catch {
      setAssignments([]);
      setCredits([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  // Purchase -> the credit assignment is created directly server-side (see
  // server/organization_credit_assignment/organization_credit_assignment.service.js).
  async function handlePurchase() {
    if (!selectedCreditId) return;
    if (!purchaseOrgId) { toast.error('Organisation not found.'); return; }
    setPurchasing(true);
    try {
      await apiServiceHandler('POST', 'organization-credit-assignment/create', {
        orgId:    purchaseOrgId,
        creditId: selectedCreditId,
      });
      toast.success('Credit purchased successfully.');
      setSelectedCreditId('');
      loadData();
    } catch (err) {
      toast.error(err?.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  useEffect(() => { loadData(); }, [loadData]);

  const activePlan = assignments.find(a => (a.status || '').toLowerCase() === 'active') ?? assignments[0] ?? null;
  const credit     = activePlan?.creditId ?? null;
  const planTitle  = credit?.title ?? '—';
  const planPrice  = fmtPrice(credit?.price);
  const limitFrom  = credit?.limit_from;
  const limitTo    = credit?.limit_to;
  const features   = (credit?.desc ?? '')
    .split(/\n|<br\s*\/?>/)
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <>
      {/* Main two-column grid */}
      <div className={s.mainGrid}>

        {/* ── Left column ── */}
        <div className={s.leftCol}>

          {/* Current plan card */}
          <div className={s.card}>
            <div className={s.cardHead}>
              <h3 className={s.cardTitle}>Current Plan</h3>
            </div>
            <div className={s.cardBody}>
            {loading ? (
              <div className={s.loadingMsg}>Loading plan…</div>
            ) : !activePlan ? (
              <div className={s.noplan}>No credit plan assigned to this organisation yet.</div>
            ) : (
              <>
                <div className={s.planTop}>
                  <div className={s.planAvatar}>
                    <svg viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="24" r="24" fill="#e0e8e8" />
                      <circle cx="24" cy="19" r="7" fill="#b0c4c4" />
                      <ellipse cx="24" cy="38" rx="12" ry="7" fill="#b0c4c4" />
                    </svg>
                  </div>
                  <div>
                    <div className={s.planLabel}>Your Plan</div>
                    <div className={s.planName}>{planTitle}</div>
                    <div className={s.planPrice}>{planPrice}</div>
                  </div>
                </div>

                {(limitFrom != null || limitTo != null) && (
                  <div className={s.creditRange}>
                    <span className={s.creditRangeLabel}>Credits</span>
                    <span className={s.creditRangeValue}>
                      {limitFrom != null && limitTo != null
                        ? `${limitFrom} – ${limitTo}`
                        : limitTo != null ? `Up to ${limitTo}` : `From ${limitFrom}`}
                    </span>
                  </div>
                )}

                {features.length > 0 && (
                  <div className={s.featureGrid}>
                    {features.map((f, i) => (
                      <div key={i} className={s.featureItem}>
                        <CheckCircle />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={s.planBottom}>
                  <div className={s.planChips}>
                    <span className={s.renewalChip}>Assigned {formatDate(activePlan.createdAt)}</span>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Credit Assignment History */}
          <div className={s.card}>
            <div className={s.cardHead}><h3 className={s.cardTitle}>Assignment History</h3></div>
            <div className={s.cardBody}>
            {loading ? (
              <div className={s.loadingMsg}>Loading history…</div>
            ) : assignments.length === 0 ? (
              <div className={s.noplan}>No credit assignments found.</div>
            ) : (() => {
              const sorted = [...assignments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
              const paged = sorted.slice((assignPage - 1) * PAGE_SIZE, assignPage * PAGE_SIZE);
              return (
                <>
                  <div className={s.tableScrollWrap}>
                    <table className={s.billingTable}>
                      <thead>
                        <tr>
                          <th>Sl.</th>
                          <th>Date</th>
                          <th>Plan</th>
                          <th>Credits</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.map((a, i) => {
                          const globalIdx = (assignPage - 1) * PAGE_SIZE + i;
                          const c = a.creditId ?? {};
                          return (
                            <tr key={a._id ?? i}>
                              <td>{globalIdx + 1}</td>
                              <td>{formatDate(a.createdAt)}</td>
                              <td>{c.title ?? '—'}</td>
                              <td>{c.limit_to != null ? c.limit_to : '—'}</td>
                              <td>{fmtPrice(c.price)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className={s.pagination}>
                    <span className={s.paginationInfo}>
                      Showing {sorted.length === 0 ? 0 : (assignPage - 1) * PAGE_SIZE + 1}–{Math.min(assignPage * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </span>
                    <div className={s.paginationBtns}>
                      <button className={s.pageBtn} onClick={() => setAssignPage(p => Math.max(1, p - 1))} disabled={assignPage <= 1}>‹</button>
                      {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`${s.pageBtn} ${p === assignPage ? s.pageBtnActive : ''}`} onClick={() => setAssignPage(p)}>{p}</button>
                      ))}
                      <button className={s.pageBtn} onClick={() => setAssignPage(p => Math.min(totalPages, p + 1))} disabled={assignPage >= totalPages}>›</button>
                    </div>
                  </div>
                </>
              );
            })()}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className={s.rightCol}>

          {/* Purchase Credit */}
          <div className={s.card}>
            <div className={s.cardHead}><h3 className={s.cardTitle}>Purchase Credit</h3></div>
            <div className={s.cardBody}>
            <div className={s.purchaseGrid}>
              <div className={s.purchaseGroup}>
                <label className={s.purchaseLabel} htmlFor="creditSelect">Select Credit</label>
                <select
                  id="creditSelect"
                  className={s.purchaseSelect}
                  value={selectedCreditId}
                  onChange={e => setSelectedCreditId(e.target.value)}
                  disabled={purchasing}
                >
                  <option value="">Select a credit option</option>
                  {credits.map(c => {
                    const range = c.limit_from != null && c.limit_to != null
                      ? `${c.limit_from} -${c.limit_to} credits`
                      : c.limit_to != null
                        ? `${c.limit_to} credits`
                        : c.limit_from != null
                          ? `${c.limit_from}+ credits`
                          : null;
                    const price = c.price != null ? fmtPrice(c.price) : null;
                    const label = `${c.title ?? ''}${range ? `(${range})` : ''}${price ? ` - ${price}` : ''}`;
                    return (
                      <option key={c._id} value={c._id}>{label}</option>
                    );
                  })}
                </select>
              </div>
              <div className={s.purchaseGroupBtn}>
                <button
                  className={s.btnPurchase}
                  onClick={handlePurchase}
                  disabled={!selectedCreditId || purchasing}
                >
                  {purchasing ? 'Processing…' : 'Purchase'}
                </button>
              </div>
            </div>
            </div>
          </div>

        </div>
      </div>

    </>
  );
}
