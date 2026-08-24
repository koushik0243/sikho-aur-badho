'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import ConfirmModal from '../ConfirmModal';
import s from "./OrdersList.module.css";

const SearchIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
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

function fmtAmount(val) {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LIMIT = 50;

export default function OrdersList() {
  const router = useRouter();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirm, setConfirm]       = useState({ show: false, id: null });
  const [selected, setSelected]     = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [sortKey, setSortKey]       = useState('');
  const [sortDir, setSortDir]       = useState('asc');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    apiServiceHandler('GET', `order/list-pagination?${params}`)
      .then(res => {
        setOrders(Array.isArray(res?.data) ? res.data : []);
        setTotal(res?.total ?? 0);
        setTotalPages(res?.totalPages ?? 1);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }
  function sortArrow(key) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const filtered = orders.filter(o => {
    const matchesSearch = !search ||
      (o.organizer_id?.org_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.credit_id?.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.payment_gateway || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let av, bv;
        if (sortKey === 'org_name') { av = (a.organizer_id?.org_name ?? '').toLowerCase(); bv = (b.organizer_id?.org_name ?? '').toLowerCase(); }
        else if (sortKey === 'credit_title') { av = (a.credit_id?.title ?? '').toLowerCase(); bv = (b.credit_id?.title ?? '').toLowerCase(); }
        else if (sortKey === 'credit_amount') { return sortDir === 'asc' ? (Number(a.credit_amount)||0) - (Number(b.credit_amount)||0) : (Number(b.credit_amount)||0) - (Number(a.credit_amount)||0); }
        else if (sortKey === 'purchase_date') { return sortDir === 'asc' ? (new Date(a.purchase_date).getTime()||0) - (new Date(b.purchase_date).getTime()||0) : (new Date(b.purchase_date).getTime()||0) - (new Date(a.purchase_date).getTime()||0); }
        else { av = String(a[sortKey]||'').toLowerCase(); bv = String(b[sortKey]||'').toLowerCase(); }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;

  function doDelete() {
    const { id } = confirm;
    setConfirm({ show: false, id: null });
    apiServiceHandler('GET', `order/delete/${id}`)
      .then(() => { toast.success('Order deleted.'); fetchOrders(); })
      .catch(() => toast.error('Delete failed.'));
  }

  const allIds = sorted.map(o => o._id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleOne = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  function doBulkDelete() {
    setBulkConfirm(false);
    const ids = [...selected];
    setSelected([]);
    Promise.all(ids.map(id => apiServiceHandler('GET', `order/delete/${id}`)))
      .then(() => { toast.success(`${ids.length} order${ids.length !== 1 ? 's' : ''} deleted.`); fetchOrders(); })
      .catch(() => toast.error('Some deletes failed.'));
  }

  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const to   = Math.min(page * LIMIT, total);

  return (
    <SuperAdminShell activeSection="orders">
      <ConfirmModal
        show={confirm.show}
        title="Delete Order"
        message="Are you sure you want to delete this order?"
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirm({ show: false, id: null })}
      />
      <ConfirmModal
        show={bulkConfirm}
        title="Delete Selected Orders"
        message={`Delete ${selected.length} selected order${selected.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />

      <div className={s.pageHeader} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Orders</h1>
          <p className={s.pageSubtitle}>Credit purchase orders</p>
        </div>
        <button className={s.btnAdd} onClick={() => router.push('/superadmin/payments/orders/add')}>
          + Add Order
        </button>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <SearchIcon />
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search organization, credit, gateway…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className={s.statusSelect}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="canceled">Canceled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.checkTh}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>#</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('org_name')}>Organization{sortArrow('org_name')}</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('credit_title')}>Credit Package{sortArrow('credit_title')}</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('credit_amount')}>Amount{sortArrow('credit_amount')}</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('purchase_date')}>Purchase Date{sortArrow('purchase_date')}</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('payment_gateway')}>Gateway{sortArrow('payment_gateway')}</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={s.emptyRow}><td colSpan={9}>Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr className={s.emptyRow}><td colSpan={9}>No orders found.</td></tr>
              ) : sorted.map((o, idx) => (
                <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => toggleOne(o._id)}>
                  <td className={s.checkTd} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(o._id)} onChange={() => toggleOne(o._id)} />
                  </td>
                  <td className={s.colMuted}>{(page - 1) * LIMIT + idx + 1}</td>
                  <td>{o.organizer_id?.org_name || '—'}</td>
                  <td>{o.credit_id?.title || '—'}</td>
                  <td className={s.colAmount}>{fmtAmount(o.credit_amount)}</td>
                  <td className={s.colMuted}>{fmtDate(o.purchase_date)}</td>
                  <td><span className={s.colGateway}>{o.payment_gateway || '—'}</span></td>
                  <td>
                    {o.status === 'success'  && <span className={s.badgeSuccess}>Success</span>}
                    {o.status === 'pending'  && <span className={s.badgePending}>Pending</span>}
                    {o.status === 'failed'   && <span className={s.badgeFailed}>Failed</span>}
                    {o.status === 'canceled' && <span className={s.badgeCanceled}>Canceled</span>}
                    {o.status === 'refunded' && <span className={s.badgeRefunded}>Refunded</span>}
                    {!['success','pending','failed','canceled','refunded'].includes(o.status) && (
                      <span className={s.badgePending} style={{ textTransform: 'capitalize' }}>{o.status || 'Pending'}</span>
                    )}
                  </td>
                  <td>
                    <div className={s.actions} onClick={e => e.stopPropagation()}>
                      <button className={s.btnView} title="View" onClick={() => router.push(`/superadmin/payments/orders/view/${o._id}`)}>
                        <EyeIcon />
                      </button>
                      <button className={s.btnDelete} title="Delete" onClick={() => setConfirm({ show: true, id: o._id })}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.pagination}>
          <div className={s.footerLeft}>
            {selected.length > 0 && (
              <button className={s.btnBulkDelete} onClick={() => setBulkConfirm(true)}>
                Delete {selected.length} Selected
              </button>
            )}
            <span>Showing {from}–{to} of {total}</span>
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
    </SuperAdminShell>
  );
}
