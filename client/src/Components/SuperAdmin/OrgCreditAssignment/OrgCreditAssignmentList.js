'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import ConfirmModal from '../ConfirmModal';
import s from "./OrgCreditAssignmentList.module.css";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function fmtPrice(val) {
  if (val === null || val === undefined) return '—';
  const num = parseFloat(val?.$numberDecimal ?? val);
  if (isNaN(num)) return '—';
  return `₹${num.toFixed(2)}`;
}

function groupByOrg(records) {
  const map = new Map();
  for (const rec of records) {
    const orgKey = String(rec.orgId?._id ?? 'unknown');
    if (!map.has(orgKey)) {
      map.set(orgKey, {
        orgId:    rec.orgId?._id,
        orgName:  rec.orgId?.org_name  || '—',
        orgPhone: rec.orgId?.org_phone || null,
        orgEmail: rec.orgId?.org_email || null,
        credits: [],
      });
    }
    const c = rec.creditId;
    map.get(orgKey).credits.push({
      recordId:   rec._id,
      title:      c?.title      || '—',
      limit_from: c?.limit_from ?? '—',
      limit_to:   c?.limit_to   ?? '—',
      price:      fmtPrice(c?.price),
      status:     rec.status,
      createdAt:  rec.createdAt,
    });
  }
  return [...map.values()];
}

const LIMIT = 50;

export default function OrgCreditAssignmentList() {
  const router = useRouter();
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hoveredOrg, setHoveredOrg] = useState(null);
  const [confirm, setConfirm]     = useState({ show: false, id: null, label: '' });
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    apiServiceHandler('GET', `organization-credit-assignment/list-pagination?${params}`)
      .then(res => {
        setRecords(Array.isArray(res?.data) ? res.data : []);
        setTotal(res?.total ?? 0);
        setTotalPages(res?.totalPages ?? 1);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const grouped = groupByOrg(records);

  const filtered = search.trim()
    ? grouped.filter(g => {
        const term = search.toLowerCase();
        return g.orgName.toLowerCase().includes(term) ||
          (g.orgPhone || '').toLowerCase().includes(term) ||
          (g.orgEmail || '').toLowerCase().includes(term) ||
          g.credits.some(c => c.title.toLowerCase().includes(term));
      })
    : grouped;

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }
  function sortArrow(key) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const sorted = sortKey === 'orgName'
    ? [...filtered].sort((a, b) => {
        const av = (a.orgName ?? '').toLowerCase();
        const bv = (b.orgName ?? '').toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : sortKey === 'assignedOn'
      ? [...filtered].sort((a, b) => {
          const av = new Date(a.credits[0]?.createdAt).getTime() || 0;
          const bv = new Date(b.credits[0]?.createdAt).getTime() || 0;
          return sortDir === 'asc' ? av - bv : bv - av;
        })
      : filtered;

  function doDelete() {
    const { id } = confirm;
    setConfirm({ show: false, id: null, label: '' });
    apiServiceHandler('GET', `organization-credit-assignment/delete/${id}`)
      .then(() => { toast.success('Assignment deleted.'); fetchRecords(); })
      .catch(() => toast.error('Delete failed.'));
  }

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  return (
    <SuperAdminShell activeSection="assign-credit">
      <ConfirmModal
        show={confirm.show}
        title="Delete Assignment"
        message={`Delete the assignment "${confirm.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirm({ show: false, id: null, label: '' })}
      />

      <div className={s.pageHeader} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Credit Assignments</h1>
          <p className={s.pageSubtitle}>Manage credit plan assignments to organizations</p>
        </div>
        <button className={s.btnAdd} onClick={() => router.push('/superadmin/organization-credit-assignment/add')}>
          + Add Assignment
        </button>
      </div>

      <div className={s.card}>
        <div className={s.searchWrap}>
          <SearchIcon />
          <input
            className={s.searchInput}
            type="text"
            placeholder="Search by organization or credit plan…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('orgName')}>Organization{sortArrow('orgName')}</th>
                <th>Assigned Credits</th>
                <th>Status</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('assignedOn')}>Assigned On{sortArrow('assignedOn')}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={s.emptyRow}><td colSpan={6}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr className={s.emptyRow}><td colSpan={6}>No credit assignments found.</td></tr>
              ) : (
                sorted.flatMap((g, idx) => {
                  const rows   = g.credits.length > 0 ? g.credits : [null];
                  const orgKey = g.orgId ?? idx;
                  const stripe  = idx % 2 !== 0 ? s.stripeAlt : '';
                  const hovered = hoveredOrg === String(orgKey) ? s.orgHover : '';
                  const globalIdx = (page - 1) * LIMIT + idx + 1;
                  return rows.map((credit, ci) => (
                    <tr
                      key={`${orgKey}-${ci}`}
                      className={[stripe, hovered, ci > 0 ? s.subRow : ''].filter(Boolean).join(' ') || undefined}
                      onMouseEnter={() => setHoveredOrg(String(orgKey))}
                      onMouseLeave={() => setHoveredOrg(null)}
                    >
                      {ci === 0 && (
                        <>
                          <td rowSpan={rows.length}>{globalIdx}</td>
                          <td rowSpan={rows.length}>
                            <div className={s.cellMain}>{g.orgName}</div>
                            {g.orgPhone && <div className={s.cellSub}>{g.orgPhone}</div>}
                            {g.orgEmail && <div className={s.cellSub}>{g.orgEmail}</div>}
                          </td>
                        </>
                      )}
                      <td>
                        {credit ? (
                          <div className={s.cellMain}>
                            {credit.title} <span className={s.cellSub}>({credit.limit_from}-{credit.limit_to}) {credit.price}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {credit
                          ? credit.status === 'active'
                            ? <span className={s.badgeActive}>Active</span>
                            : <span className={s.badgeInactive}>Inactive</span>
                          : '—'}
                      </td>
                      <td>{credit ? fmtDate(credit.createdAt) : '—'}</td>
                      <td>
                        <div className={s.actions} onClick={e => e.stopPropagation()}>
                          <button
                            className={s.btnView}
                            title="View"
                            onClick={() => router.push(`/superadmin/organization-credit-assignment/view/${g.orgId}`)}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            className={s.btnEdit}
                            title="Edit"
                            onClick={() => router.push(`/superadmin/organization-credit-assignment/${g.orgId}`)}
                          >
                            <EditIcon />
                          </button>
                          {credit && (
                            <button
                              className={s.btnDelete}
                              title="Delete"
                              onClick={() => setConfirm({ show: true, id: credit.recordId, label: `${g.orgName} — ${credit.title}` })}
                            >
                              <TrashIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={s.pagination}>
          <span>Showing {from}–{to} of {total}</span>
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
    </SuperAdminShell>
  );
}
