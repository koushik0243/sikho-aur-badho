'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import s from "./ViewCategorySubcategory.module.css";

const EditIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ViewCategorySubcategory() {
  const router       = useRouter();
  const { id }       = useParams();
  const searchParams = useSearchParams();
  const isSub        = searchParams.get('type') === 'sub-category';

  const [item, setItem]             = useState(null);
  const [parentName, setParentName] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!id) return;
    const editPromise = isSub
      ? apiServiceHandler('GET', `course-subcategory/edit/${id}`)
      : apiServiceHandler('GET', `course-category/edit/${id}`);

    Promise.all([editPromise, apiServiceHandler('GET', 'course-category/list-all')])
      .then(([editRes, catRes]) => {
        const row  = editRes?.data ?? editRes;
        const cats = Array.isArray(catRes?.data) ? catRes.data : (Array.isArray(catRes) ? catRes : []);
        setItem(row);
        const parentId = isSub
          ? (row?.categoryId?._id ?? row?.categoryId ?? null)
          : (row?.parentId ?? null);
        if (parentId) {
          const parent = cats.find(c => String(c._id) === String(parentId));
          setParentName(parent?.title ?? parent?.name ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isSub]);

  if (loading) return (
    <SuperAdminShell activeSection="category-subcategory">
      <p className={s.loadingText}>Loading…</p>
    </SuperAdminShell>
  );
  if (!item?._id) return (
    <SuperAdminShell activeSection="category-subcategory">
      <p className={s.loadingText}>Item not found.</p>
    </SuperAdminShell>
  );

  const displayName = isSub ? (item.name ?? '') : (item.title ?? item.name ?? '');
  const description = isSub ? (item.description ?? '') : (item.desc ?? item.description ?? '');
  const typeLabel   = isSub ? 'Sub-Category' : 'Category';
  const editUrl     = isSub
    ? `/superadmin/category-subcategory/${id}/edit?type=sub-category`
    : `/superadmin/category-subcategory/${id}/edit`;
  const isActive    = item.status === 'active';

  return (
    <SuperAdminShell activeSection="category-subcategory">
      {/* Breadcrumb */}
      <nav className={s.breadcrumb}>
        <button className={s.breadcrumbLink} onClick={() => router.push('/superadmin/category-subcategory')}>
          Categories
        </button>
        <span className={s.breadcrumbSep}>›</span>
        <span className={s.breadcrumbCurr}>{displayName}</span>
      </nav>

      {/* Detail card */}
      <div className={s.detailCard}>

        {/* Card header */}
        <div className={s.detailHead}>
          <div className={s.detailHeadLeft}>
            <div className={s.detailAvatar}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className={s.detailTitle}>{displayName}</h1>
              <div className={s.detailBadges}>
                <span className={isSub ? s.badgeSubCat : s.badgeCategory}>{typeLabel}</span>
                <span className={isActive ? s.badgeActive : s.badgeInactive}>
                  {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button className={s.btnEditView} onClick={() => router.push(editUrl)}>
            <EditIcon /> Edit
          </button>
        </div>

        {/* Body */}
        <div className={s.detailBody}>
          <div className={s.detailRows}>
            {parentName && (
              <div className={s.detailRow}>
                <span className={s.detailLabel}>Parent</span>
                <span className={s.detailValue}>{parentName}</span>
              </div>
            )}
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Created</span>
              <span className={s.detailValue}>{fmtDate(item.createdAt)}</span>
            </div>
            <div className={s.detailRow}>
              <span className={s.detailLabel}>Updated</span>
              <span className={s.detailValue}>{fmtDate(item.updatedAt)}</span>
            </div>
            {description && (
              <div className={s.detailRow}>
                <span className={s.detailLabel}>Description</span>
                <span className={`${s.detailValue} ${s.detailValueDesc}`}>{description}</span>
              </div>
            )}
            {item.cat_subcat_image && (
              <div className={s.detailRow}>
                <span className={s.detailLabel}>Image</span>
                <img
                  src={item.cat_subcat_image}
                  alt={displayName}
                  className={s.detailImg}
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </SuperAdminShell>
  );
}
