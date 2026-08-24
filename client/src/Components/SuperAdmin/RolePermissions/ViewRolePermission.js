'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import vp from "./ViewRolePermission.module.css";

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

export default function ViewRolePermission() {
  const router = useRouter();
  const { id } = useParams();
  const [record, setRecord]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiServiceHandler('GET', `role-permission/edit/${id}`)
      .then(res => setRecord(res?.data ?? res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SuperAdminShell activeSection="assign-role"><p className={vp.loadingText}>Loading…</p></SuperAdminShell>;
  if (!record?._id) return <SuperAdminShell activeSection="assign-role"><p className={vp.loadingText}>Assignment not found.</p></SuperAdminShell>;

  const roleName   = record.role_id?.display_name || record.role_id?.name || record.role_id || '—';
  const permName   = record.permission_id?.name || record.permission_id || '—';
  const permDisplay = record.permission_id?.display_name || permName;
  const isActive   = record.status === 'active';

  return (
    <SuperAdminShell activeSection="assign-role">
      <nav className={vp.breadcrumb}>
        <button className={vp.breadcrumbLink} onClick={() => router.push('/superadmin/role-permissions')}>Role Permissions</button>
        <span className={vp.breadcrumbSep}>›</span>
        <span className={vp.breadcrumbCurr}>{roleName} · {permDisplay}</span>
      </nav>

      <div className={vp.detailCard}>
        <div className={vp.detailHead}>
          <div className={vp.detailHeadLeft}>
            <div className={vp.detailAvatarGray}>{roleName.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className={vp.detailTitle}>{roleName}</h1>
              <div className={vp.detailBadges}>
                <span className={vp.badgeNeutral}>{permDisplay}</span>
                <span className={isActive ? vp.badgeActive : vp.badgeInactive}>
                  {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button className={vp.btnEdit} onClick={() => router.push(`/superadmin/role-permissions/${id}/edit`)}>
            <EditIcon /> Edit
          </button>
        </div>

        <div className={vp.detailBody}>
          <div className={vp.detailRows}>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Role</span>
              <span className={vp.detailValue}>{roleName}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Permission</span>
              <span className={vp.detailValue}>{permDisplay}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Permission Key</span>
              <span className={vp.detailValueMono}>{permName}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Created</span>
              <span className={vp.detailValue}>{fmtDate(record.createdAt)}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Updated</span>
              <span className={vp.detailValue}>{fmtDate(record.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
