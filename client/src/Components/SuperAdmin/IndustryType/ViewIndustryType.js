'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import vp from "./ViewIndustryType.module.css";

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

export default function ViewIndustryType() {
  const router = useRouter();
  const { id } = useParams();
  const [item, setItem]           = useState(null);
  const [parentName, setParentName] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiServiceHandler('GET', `industry-type/edit/${id}`),
      apiServiceHandler('GET', 'industry-type/list-all'),
    ])
      .then(([editRes, listRes]) => {
        const row  = editRes?.data ?? editRes;
        const list = Array.isArray(listRes?.data) ? listRes.data : (Array.isArray(listRes) ? listRes : []);
        setItem(row);
        if (row?.parentId) {
          const parent = list.find(it => String(it._id) === String(row.parentId));
          setParentName(parent?.name ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SuperAdminShell activeSection="industry-type"><p className={vp.loadingText}>Loading…</p></SuperAdminShell>;
  if (!item?._id) return <SuperAdminShell activeSection="industry-type"><p className={vp.loadingText}>Industry type not found.</p></SuperAdminShell>;

  const isActive = item.status === 'active';

  return (
    <SuperAdminShell activeSection="industry-type">
      <nav className={vp.breadcrumb}>
        <button className={vp.breadcrumbLink} onClick={() => router.push('/superadmin/industry-type')}>Industry Types</button>
        <span className={vp.breadcrumbSep}>›</span>
        <span className={vp.breadcrumbCurr}>{item.name}</span>
      </nav>

      <div className={vp.detailCard}>
        <div className={vp.detailHead}>
          <div className={vp.detailHeadLeft}>
            <div className={vp.detailAvatar}>{(item.name || 'I').charAt(0).toUpperCase()}</div>
            <div>
              <h1 className={vp.detailTitle}>{item.name}</h1>
              <div className={vp.detailBadges}>
                {parentName && <span className={vp.badgeNeutral}>{parentName}</span>}
                <span className={isActive ? vp.badgeActive : vp.badgeInactive}>
                  {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button className={vp.btnEdit} onClick={() => router.push(`/superadmin/industry-type/${id}/edit`)}>
            <EditIcon /> Edit
          </button>
        </div>

        <div className={vp.detailBody}>
          <div className={vp.detailRows}>
            {parentName && (
              <div className={vp.detailRow}>
                <span className={vp.detailLabel}>Parent Type</span>
                <span className={vp.detailValue}>{parentName}</span>
              </div>
            )}
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Created</span>
              <span className={vp.detailValue}>{fmtDate(item.createdAt)}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Updated</span>
              <span className={vp.detailValue}>{fmtDate(item.updatedAt)}</span>
            </div>
            {item.description && (
              <div className={vp.detailRow}>
                <span className={vp.detailLabel}>Description</span>
                <span className={vp.detailValueDesc}>{item.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
