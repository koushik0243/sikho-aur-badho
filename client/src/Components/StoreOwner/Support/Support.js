'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser } from '../../../redux/slices/authSlice';
import s from "./Support.module.css";
import apiServiceHandler from '../../../service/apiService';

// ── Helpers ──────────────────────────────────────────────────────
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


// ── Icons ─────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const ChevronDown = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

// ── Constants ─────────────────────────────────────────────────────
const ISSUE_TYPES = ['Technical Issue', 'Billing', 'Course Access', 'Zoom Integration', 'Other'];
const PRIORITIES  = ['Low', 'Normal', 'High', 'Urgent'];
const EMPTY_FORM  = { issueType: '', subject: '', description: '', priority: 'Normal' };
const PER_PAGE    = 50;

const STATUS_CFG = {
  open:         { label: 'Open',         cls: 'statusOpen',        progress: 12 },
  in_progress:  { label: 'In Progress',  cls: 'statusInProgress',  progress: 48 },
  resolved:     { label: 'Resolved',     cls: 'statusResolved',    progress: 100 },
  close:        { label: 'Closed',       cls: 'statusClosed',      progress: 100 },
  not_possible: { label: 'Not Possible', cls: 'statusNotPossible', progress: 60 },
  deleted:      { label: 'Deleted',      cls: 'statusDeleted',     progress: 0 },
};

// ── Toast ────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${s.toast} ${toast.type === 'error' ? s.toastError : s.toastSuccess}`}>
      <span className={s.toastIcon}>{toast.type === 'error' ? '✕' : '✓'}</span>
      {toast.msg}
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────
function DeleteModal({ count, onCancel, onConfirm, deleting }) {
  return (
    <div className={s.modalOverlay}>
      <div className={s.modalBox}>
        <h3 className={s.modalTitle}>Confirm Delete</h3>
        <p className={s.modalText}>
          Are you sure you want to delete {count === 1 ? 'this ticket' : `${count} tickets`}?
          This action cannot be undone.
        </p>
        <div className={s.modalActions}>
          <button className={s.btnCancelModal} onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className={s.btnConfirmDelete} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : `Delete${count > 1 ? ` (${count})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function SupportPage() {
  const user = useSelector(selectUser);
  const router = useRouter();

  const [view, setView]             = useState('list');
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [orgId, setOrgId]           = useState(null);

  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [checked, setChecked]           = useState(new Set());
  const [page, setPage]                 = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');

  const [toast, setToast]             = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let oid = user?.orgId ? String(user.orgId) : null;
      if (!oid) {
        const uid = user?._id || getTokenUserId();
        if (uid) {
          const r = await apiServiceHandler('GET', `user/admin/edit/${uid}`);
          const rec = r?.data ?? r;
          if (rec?.orgId) oid = String(rec.orgId);
        }
      }
      if (oid) setOrgId(oid);
      const res = await apiServiceHandler('GET', oid ? `support-ticket/list?orgId=${oid}` : 'support-ticket/list').catch(() => null);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setTickets(data);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  function setField(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiServiceHandler('POST', 'support-ticket/create', {
        orgId,
        issue_type: form.issueType,
        subject:    form.subject,
        desc:       form.description,
        priority:   form.priority,
      });
      showToast('success', 'Ticket raised successfully!');
      setForm(EMPTY_FORM);
      setView('list');
      loadData();
    } catch (err) {
      showToast('error', err?.message || 'Failed to raise ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      for (const id of deleteModal) {
        await apiServiceHandler('GET', `support-ticket/delete/${id}`);
      }
      showToast('success', `${deleteModal.length} ticket${deleteModal.length > 1 ? 's' : ''} deleted.`);
      setChecked(new Set());
      setDeleteModal(null);
      setPage(1);
      await loadData();
    } catch (err) {
      showToast('error', err?.message || 'Failed to delete ticket(s).');
    } finally {
      setDeleting(false);
    }
  }

  const filteredTickets = tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.replace(/^#/, '').toLowerCase();
      const matchId      = (t.ticket_id   || '').toLowerCase().includes(q);
      const matchSubject = (t.subject     || '').toLowerCase().includes(q);
      const matchType    = (t.issue_type  || '').toLowerCase().includes(q);
      if (!matchId && !matchSubject && !matchType) return false;
    }
    return true;
  });

  useEffect(() => { setPage(1); }, [statusFilter, searchQuery]);

  const totalPages     = Math.max(1, Math.ceil(filteredTickets.length / PER_PAGE));
  const pagedTickets   = filteredTickets.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageIds        = pagedTickets.map(t => t._id);
  const allPageChecked = pageIds.length > 0 && pageIds.every(id => checked.has(id));

  function toggleCheck(id) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(prev => {
      const next = new Set(prev);
      const allOn = pageIds.every(id => next.has(id));
      allOn ? pageIds.forEach(id => next.delete(id)) : pageIds.forEach(id => next.add(id));
      return next;
    });
  }

  // ════════════════════════════════════════════════════════════════
  // ADD VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === 'add') {
    return (
      <>
        <Toast toast={toast} />
        <nav className={s.breadcrumb}>
          <div className={s.breadcrumbLeft}>
            <button className={s.breadcrumbLink} onClick={() => setView('list')}>Support Tickets</button>
            <span className={s.breadcrumbSep}>›</span>
            <span className={s.breadcrumbCurr}>Raise a Ticket</span>
          </div>
        </nav>

        <div className={s.card}>
          <div className={s.formCardHead}>
            <h2 className={s.formCardTitle}>Ticket Information</h2>
          </div>
          <div className={s.formCardBody}>
            <form onSubmit={handleSubmit}>
              <div className={s.formGrid}>
                <div className={s.fieldGroup}>
                  <label className={s.label}>Issue Type</label>
                  <div className={s.selectWrap}>
                    <select className={s.select} value={form.issueType} onChange={setField('issueType')} required>
                      <option value="" disabled>Select Issue Type…</option>
                      {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className={s.chevron}><ChevronDown /></span>
                  </div>
                </div>
                <div className={s.fieldGroup}>
                  <label className={s.label}>Priority</label>
                  <div className={s.selectWrap}>
                    <select className={s.select} value={form.priority} onChange={setField('priority')}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <span className={s.chevron}><ChevronDown /></span>
                  </div>
                </div>
              </div>

              <div className={s.fieldGroup}>
                <label className={s.label}>Subject</label>
                <input
                  className={s.input}
                  placeholder="Brief description of the issue…"
                  value={form.subject}
                  onChange={setField('subject')}
                  required
                />
              </div>

              <div className={s.fieldGroup}>
                <label className={s.label}>Description</label>
                <textarea
                  className={s.textarea}
                  placeholder="Describe your issue in detail…"
                  value={form.description}
                  onChange={setField('description')}
                  rows={5}
                  required
                />
              </div>

              <div className={s.formFooter}>
                <button type="button" className={s.btnCancel} onClick={() => setView('list')}>Cancel</button>
                <button type="submit" className={s.btnSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Raise a Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      <Toast toast={toast} />

      {/* ── Page header ── */}
      <div className={s.pageHeader} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Support Tickets</h1>
          <p className={s.pageSubtitle}>Manage your support requests</p>
        </div>
        <button className={s.btnAdd} onClick={() => setView('add')}>+ New Ticket</button>
      </div>

      {/* ── Table card ── */}
      <div className={s.tableCard}>

        {/* Toolbar */}
        <div className={s.toolbar}>
          <div className={s.searchWrap}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              className={s.searchInput}
              type="text"
              placeholder="Search by subject, type or ticket ID…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className={s.statusSelect}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CFG).filter(([k]) => k !== 'deleted').map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>
                  <input type="checkbox" className={s.checkInput} checked={allPageChecked} onChange={toggleAll} />
                </th>
                <th className={s.th}>#</th>
                <th className={s.th}>Ticket ID</th>
                <th className={s.th}>Subject</th>
                <th className={s.th}>Type</th>
                <th className={s.th}>Priority</th>
                <th className={s.th}>Status</th>
                <th className={s.th}>Raised On</th>
                <th className={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={9}><div className={s.skeletonRow} /></td></tr>
                ))
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className={s.tdEmpty}>
                    {tickets.length === 0 ? (
                      <>No tickets yet.{' '}
                        <button className={s.emptyLink} onClick={() => setView('add')}>Raise your first ticket →</button>
                      </>
                    ) : 'No tickets match your filters.'}
                  </td>
                </tr>
              ) : pagedTickets.map((ticket, idx) => {
                const sc     = STATUS_CFG[ticket.status] ?? STATUS_CFG.open;
                const isChkd = checked.has(ticket._id);
                return (
                  <tr
                    key={ticket._id}
                    className={`${s.tr} ${isChkd ? s.trChecked : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/storeowner/support/${ticket._id}`)}
                  >
                    <td className={s.td} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className={s.checkInput} checked={isChkd} onChange={() => toggleCheck(ticket._id)} />
                    </td>
                    <td className={s.td}>{(page - 1) * PER_PAGE + idx + 1}</td>
                    <td className={s.td}><span className={s.ticketIdBadge}>#{ticket.ticket_id}</span></td>
                    <td className={s.tdSubject}>{ticket.subject}</td>
                    <td className={s.td}>{ticket.issue_type || '—'}</td>
                    <td className={s.td}>{ticket.priority || '—'}</td>
                    <td className={s.td}>
                      <span className={`${s.statusBadge} ${s[sc.cls]}`}>{sc.label}</span>
                    </td>
                    <td className={s.td}>{formatDate(ticket.createdAt)}</td>
                    <td className={s.td} onClick={e => e.stopPropagation()}>
                      <div className={s.actions}>
                        <button className={s.btnRowView} title="View"
                          onClick={() => router.push(`/storeowner/support/${ticket._id}`)}>
                          <EyeIcon />
                        </button>
                        <button className={s.btnRowDelete} title="Delete"
                          onClick={() => setDeleteModal([ticket._id])}>
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={s.pagination}>
          <div className={s.footerLeft}>
            {checked.size > 0 && (
              <button className={s.btnBulkDelete} onClick={() => setDeleteModal([...checked])}>
                Delete Selected ({checked.size})
              </button>
            )}
            <span>
              Showing {filteredTickets.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredTickets.length)} of {filteredTickets.length}
            </span>
          </div>
          <div className={s.paginationBtns}>
            <button className={s.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`${s.pageBtn} ${n === page ? s.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className={s.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>

      </div>

      {deleteModal && (
        <DeleteModal count={deleteModal.length} onCancel={() => setDeleteModal(null)} onConfirm={confirmDelete} deleting={deleting} />
      )}
    </>
  );
}
