'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import vp from "./ViewOrgUserAssignment.module.css";

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

export default function ViewOrgUserAssignment() {
  const router = useRouter();
  const { id } = useParams();
  const [user, setUser]       = useState(null);
  const [orgName, setOrgName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiServiceHandler('GET', `user/admin/edit/${id}`)
      .then(async res => {
        const u = res?.data ?? res;
        setUser(u);
        if (!u?.orgId) return;
        if (typeof u.orgId === 'object') {
          setOrgName(u.orgId.org_name || u.orgId.name || null);
        } else {
          try {
            const orgRes = await apiServiceHandler('GET', `organization/edit/${u.orgId}`);
            const org = orgRes?.data ?? orgRes;
            setOrgName(org?.org_name || org?.name || null);
          } catch {
            setOrgName(null);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <SuperAdminShell activeSection="assign-user"><p className={vp.loadingText}>Loading…</p></SuperAdminShell>;
  if (!user?._id) return <SuperAdminShell activeSection="assign-user"><p className={vp.loadingText}>Assignment not found.</p></SuperAdminShell>;
  const displayName = user.name || user.email || '—';
  const isActive    = user.status === 'active';

  return (
    <SuperAdminShell activeSection="assign-user">
      <nav className={vp.breadcrumb}>
        <button className={vp.breadcrumbLink} onClick={() => router.push('/superadmin/organization-user-assignment')}>User Assignments</button>
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
                {orgName && <span className={vp.badgeNeutral}>{orgName}</span>}
                <span className={isActive ? vp.badgeActive : vp.badgeInactive}>
                  {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <button className={vp.btnEdit} onClick={() => router.push(`/superadmin/organization-user-assignment/edit/${id}`)}>
            <EditIcon /> Edit
          </button>
        </div>

        <div className={vp.detailBody}>
          <div className={vp.detailRows}>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Email</span>
              <span className={vp.detailValue}>{user.email || '—'}</span>
            </div>
            {orgName && (
              <div className={vp.detailRow}>
                <span className={vp.detailLabel}>Organization</span>
                <span className={vp.detailValue}>{orgName}</span>
              </div>
            )}
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Role</span>
              <span className={vp.detailValue}>{user.orgRole || '—'}</span>
            </div>
            <div className={vp.detailRow}>
              <span className={vp.detailLabel}>Assigned On</span>
              <span className={vp.detailValue}>{fmtDate(user.updatedAt || user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
