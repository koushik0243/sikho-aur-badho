'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import vp from "./ViewRole.module.css";

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

export default function ViewRole() {
  const router = useRouter();
  const { id } = useParams();
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiServiceHandler('GET', `role/edit/${id}`)
      .then(res => setRole(res?.data ?? res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SuperAdminShell activeSection="roles"><p className={vp.loadingText}>Loading…</p></SuperAdminShell>;
  if (!role?._id) return <SuperAdminShell activeSection="roles"><p className={vp.loadingText}>Role not found.</p></SuperAdminShell>;

  const displayName = role.display_name || role.name || '—';
  const isActive    = role.status === 'active';

  return (
    <SuperAdminShell activeSection="roles">
      <nav className={vp.breadcrumb}>
        <button className={vp.breadcrumbLink} onClick={() => router.push('/superadmin/roles')}>Roles</button>
        <span className={vp.breadcrumbSep}>›</span>
        <span className={vp.breadcrumbCurr}>{displayName}</span>
      </nav>

      <div className={vp.detailCard}>
        <div className={vp.detailHead}>
          <div className={vp.detailHeadLeft}>
            <div className={vp.detailAvatar}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <h1 className={vp.detailTitle}>{displayName}</h1>
              <div className={vp.detailBadges}>
                <span className={isActive ? vp.badgeActive : vp.badgeInactive}>
                  {role.status ? role.status.charAt(0).toUpperCase() + role.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button className={vp.btnEdit} onClick={() => router.push(`/superadmin/roles/${id}/edit`)}>
            <EditIcon /> Edit
          </button>
        </div>

        <div className={vp.detailBody}>
          <div className={vp.detailRows}>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Key</span>
              <span className={vp.detailValueMono}>{role.name || '—'}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Display Name</span>
              <span className={vp.detailValue}>{role.display_name || '—'}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Created</span>
              <span className={vp.detailValue}>{fmtDate(role.createdAt)}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Updated</span>
              <span className={vp.detailValue}>{fmtDate(role.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
