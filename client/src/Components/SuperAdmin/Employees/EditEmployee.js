'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import s from "./EditEmployee.module.css";

const BackArrow = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

export default function EditEmployee() {
  const router = useRouter();
  const { id } = useParams();

  const [form, setForm]         = useState({ name: '', email: '', password: '', confirmPassword: '', status: 'active' });
  const [loading, setLoading]   = useState(true);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pwReadOnly, setPwReadOnly] = useState(true);
  const [confirmPwReadOnly, setConfirmPwReadOnly] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiServiceHandler('GET', `user/admin/edit/${id}`)
      .then(res => {
        const u = res?.data ?? res;
        if (!u) return;
        setForm({
          name:            u.name ?? '',
          email:           u.email ?? '',
          password:        '',
          confirmPassword: '',
          status:          u.status ?? 'active',
        });
      })
      .catch(() => toast.error('Failed to load user.'))
      .finally(() => setLoading(false));
  }, [id]);

  function setField(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.password) {
      if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
      if (!form.confirmPassword) e.confirmPassword = 'Please confirm the new password.';
      else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        name:   form.name.trim(),
        email:  form.email.trim(),
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      await apiServiceHandler('PUT', `user/admin/update/${id}`, payload);
      toast.success('User updated successfully.');
      router.push('/superadmin/employees');
    } catch {
      toast.error('Failed to update user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SuperAdminShell activeSection="employees">
      <button className={s.backBtn} onClick={() => router.push('/superadmin/employees')}>
        <BackArrow /> Back to Users
      </button>

      <h1 className={s.pageTitle}>Edit User</h1>
      <p className={s.pageSubtitle}>Update employee account details</p>

      <div className={s.formCard}>
        {loading ? (
          <p style={{ fontSize: 13, color: '#6b7280' }}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className={s.formGrid}>

              <div className={s.formGroup}>
                <label>Name <span className={s.required}>*</span></label>
                <input
                  className={s.input}
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  autoComplete="off"
                />
                {errors.name && <p className={s.errorMsg}>{errors.name}</p>}
              </div>

              <div className={s.formGroup}>
                <label>Email <span className={s.required}>*</span></label>
                <input
                  className={s.input}
                  type="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  autoComplete="off"
                />
                {errors.email && <p className={s.errorMsg}>{errors.email}</p>}
              </div>

              <div className={s.formGroup}>
                <label>New Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <input
                  className={s.input}
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete="new-password"
                  readOnly={pwReadOnly}
                  onFocus={() => setPwReadOnly(false)}
                />
                {errors.password && <p className={s.errorMsg}>{errors.password}</p>}
              </div>

              <div className={s.formGroup}>
                <label>Confirm Password</label>
                <input
                  className={s.input}
                  type="password"
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={e => setField('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                  readOnly={confirmPwReadOnly}
                  onFocus={() => setConfirmPwReadOnly(false)}
                />
                {errors.confirmPassword && <p className={s.errorMsg}>{errors.confirmPassword}</p>}
              </div>

              <div className={s.formGroup}>
                <label>Status</label>
                <select
                  className={s.select}
                  value={form.status}
                  onChange={e => setField('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

            </div>

            <div className={s.formActions}>
              <button type="submit" className={s.btnSave} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className={s.btnCancel} onClick={() => router.push('/superadmin/employees')}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </SuperAdminShell>
  );
}
