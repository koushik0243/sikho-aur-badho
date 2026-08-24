'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import ConfirmModal from '../ConfirmModal';
import s from "./CategorySubcategoryList.module.css";

const Icon = {
  search: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  ),
  cat: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function buildTree(items) {
  const map = {};
  items.forEach(item => (map[item._id] = { ...item, children: [] }));
  const roots = [];
  items.forEach(item => {
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(map[item._id]);
    } else {
      roots.push(map[item._id]);
    }
  });
  return roots;
}

function flattenTree(nodes, depth = 0) {
  const result = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

const LIMIT = 50;

export default function CategorySubcategoryList() {
  const router = useRouter();

  const [allItems, setAllItems]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [confirm, setConfirm]     = useState({ show: false, id: null, type: null });
  const [selected, setSelected]   = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const fetchItems = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiServiceHandler('GET', 'course-category/list-all'),
      apiServiceHandler('GET', 'course-subcategory/list'),
    ])
      .then(([catRes, subRes]) => {
        const cats = Array.isArray(catRes?.data) ? catRes.data : (Array.isArray(catRes) ? catRes : []);
        const subs = Array.isArray(subRes?.data) ? subRes.data : (Array.isArray(subRes) ? subRes : []);

        // Build a set of IDs already in course_category to avoid duplicates
        const catIds = new Set(cats.map(c => String(c._id)));

        const normalizedCats = cats.map(c => ({
          _id: String(c._id),
          name: c.title,
          description: c.desc,
          parentId: c.parentId ? String(c.parentId) : null,
          type: c.parentId ? 'sub-category' : 'category',
          status: c.status,
          createdAt: c.createdAt,
          source: 'category',
        }));

        // Legacy sub-categories from course_subcategory (skip any whose categoryId no longer exists)
        const normalizedSubs = subs
          .filter(s => !catIds.has(String(s._id))) // skip if already represented
          .map(s => {
            const pid = s.categoryId?._id ?? s.categoryId ?? null;
            return {
              _id: String(s._id),
              name: s.name,
              description: s.description,
              parentId: pid ? String(pid) : null,
              type: 'sub-category',
              status: s.status,
              createdAt: s.createdAt,
              source: 'subcategory',
            };
          });

        setAllItems([...normalizedCats, ...normalizedSubs]);
      })
      .catch(() => setAllItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const nameById = useMemo(() => {
    const m = {};
    allItems.forEach(item => (m[item._id] = item.name));
    return m;
  }, [allItems]);

  const flatList = useMemo(() => {
    const tree = buildTree(allItems);
    return flattenTree(tree);
  }, [allItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return flatList;
    const q = search.toLowerCase();
    return flatList.filter(item =>
      (item.name ?? '').toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q)
    );
  }, [flatList, search]);

  useEffect(() => { setPage(1); }, [sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }
  function sortArrow(key) {
    if (sortKey !== key) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        if (sortKey === 'createdAt') {
          const av = new Date(a.createdAt).getTime() || 0;
          const bv = new Date(b.createdAt).getTime() || 0;
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        const av = String(a[sortKey] ?? '').toLowerCase();
        const bv = String(b[sortKey] ?? '').toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / LIMIT));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((clampedPage - 1) * LIMIT, clampedPage * LIMIT);

  const from = sorted.length === 0 ? 0 : (clampedPage - 1) * LIMIT + 1;
  const to   = Math.min(clampedPage * LIMIT, sorted.length);

  function handleDelete(id, type, source) { setConfirm({ show: true, id, type, source }); }
  function doDelete() {
    const { id, source } = confirm;
    setConfirm({ show: false, id: null, type: null, source: null });
    const endpoint = source === 'subcategory'
      ? `course-subcategory/delete/${id}`
      : `course-category/delete-tree/${id}`;
    apiServiceHandler('GET', endpoint)
      .then(() => { toast.success('Deleted successfully.'); fetchItems(); })
      .catch(() => toast.error('Delete failed.'));
  }

  const allIds = pageItems.map(item => item._id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.includes(id));
  const toggleAll = () => setSelected(allSelected ? [] : allIds);
  const toggleOne = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  function handleBulkDelete() { if (selected.length > 0) setBulkConfirm(true); }
  function doBulkDelete() {
    setBulkConfirm(false);
    const ids = [...selected];
    setSelected([]);
    const itemMap = new Map(filtered.map(item => [item._id, item]));
    Promise.all(ids.map(id => {
      const item = itemMap.get(id);
      const endpoint = item?.source === 'subcategory'
        ? `course-subcategory/delete/${id}`
        : `course-category/delete-tree/${id}`;
      return apiServiceHandler('GET', endpoint);
    }))
      .then(() => { toast.success(`${ids.length} item${ids.length !== 1 ? 's' : ''} deleted.`); fetchItems(); })
      .catch(() => toast.error('Some deletes failed'));
  }

  return (
    <SuperAdminShell activeSection="category-subcategory">
      <ConfirmModal
        show={confirm.show}
        title="Delete Item"
        message="Are you sure you want to delete this category / sub-category? Deleting a parent will also remove its children."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setConfirm({ show: false, id: null })}
      />
      <ConfirmModal
        show={bulkConfirm}
        title="Delete Selected Items"
        message={`Delete ${selected.length} selected item${selected.length !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        onConfirm={doBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />

      <div className={s.pageHeader} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Category / Sub-Category</h1>
          <p className={s.pageSubtitle}>Manage multi-level categories and sub-categories</p>
        </div>
        <button className={s.btnAdd} onClick={() => router.push('/superadmin/category-subcategory/add')}>
          + Add Category
        </button>
      </div>

      <div className={s.card}>
        <div className={s.searchWrap}>
          {Icon.search}
          <input
            className={s.searchInput}
            type="text"
            placeholder="Search by name or description…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.checkTh}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('name')}>Name{sortArrow('name')}</th>
                <th>Description</th>
                <th>Parent</th>
                <th>Status</th>
                <th style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}} onClick={() => toggleSort('createdAt')}>Created At{sortArrow('createdAt')}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={s.emptyRow}><td colSpan={7}>Loading…</td></tr>
              ) : pageItems.length === 0 ? (
                <tr className={s.emptyRow}><td colSpan={7}>No items found.</td></tr>
              ) : pageItems.map((item) => (
                <tr key={item._id} style={{ cursor: 'pointer' }} onClick={() => toggleOne(item._id)}>
                  <td className={s.checkTd} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggleOne(item._id)} />
                  </td>
                  <td>
                    <div className={s.nameCell} style={{ paddingLeft: item.depth * 20 }}>
                      {item.depth > 0 && <span className={s.treeArrow}>↳</span>}
                      <span className={s.catIcon}>{Icon.cat}</span>
                      <span className={s.catName}>{item.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className={s.descCell}>{item.description ?? '—'}</td>
                  <td>{item.parentId ? (nameById[item.parentId] ?? '—') : '—'}</td>
                  <td>
                    {item.status === 'active'
                      ? <span className={s.badgeActive}>Active</span>
                      : <span className={s.badgeInactive}>{item.status ?? 'Inactive'}</span>
                    }
                  </td>
                  <td>{fmtDate(item.createdAt)}</td>
                  <td>
                    <div className={s.actions} onClick={e => e.stopPropagation()}>
                      <button className={s.btnView} title="View"
                        onClick={() => router.push(
                          item.source === 'subcategory'
                            ? `/superadmin/category-subcategory/${item._id}?type=sub-category`
                            : `/superadmin/category-subcategory/${item._id}`
                        )}>
                        {Icon.eye}
                      </button>
                      <button className={s.btnEdit} title="Edit"
                        onClick={() => router.push(
                          item.source === 'subcategory'
                            ? `/superadmin/category-subcategory/${item._id}/edit?type=sub-category`
                            : `/superadmin/category-subcategory/${item._id}/edit`
                        )}>
                        {Icon.edit}
                      </button>
                      <button className={s.btnDelete} title="Delete"
                        onClick={() => handleDelete(item._id, item.type, item.source)}>
                        {Icon.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.paginationWrap}>
          <div className={s.footerLeft}>
            {selected.length > 0 && (
              <button className={s.btnBulkDelete} onClick={handleBulkDelete}>
                Delete {selected.length} Selected
              </button>
            )}
            <span className={s.paginInfo}>
              {sorted.length === 0 ? 'No results' : `Showing ${from}–${to} of ${sorted.length}`}
            </span>
          </div>
          <div className={s.paginBtns}>
            <button className={s.paginBtn} disabled={clampedPage <= 1} onClick={() => setPage(p => p - 1)}>
              ‹ Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${s.paginBtn} ${clampedPage === i + 1 ? s.paginBtnActive : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button className={s.paginBtn} disabled={clampedPage >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next ›
            </button>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
