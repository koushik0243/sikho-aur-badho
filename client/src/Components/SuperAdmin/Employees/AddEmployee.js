'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import s from "./AddEmployee.module.css";

const BackArrow = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const EMPTY = { name: '', email: '', password: '', confirmPassword: '', status: 'active' };

export default function AddEmployee() {
  const router = useRouter();
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pwReadOnly, setPwReadOnly] = useState(true);
  const [confirmPwReadOnly, setConfirmPwReadOnly] = useState(true);

  function setField(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await apiServiceHandler('POST', 'user/admin/create', {
        name:      form.name.trim(),
        email:     form.email.trim(),
        password:  form.password,
        status:    form.status,
        user_type: 'employee',
        orgId:     null,
        orgRole:   'employee',
      });
      toast.success('User created successfully.');
      router.push('/superadmin/employees');
    } catch {
      toast.error('Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SuperAdminShell activeSection="employees">
      <button className={s.backBtn} onClick={() => router.push('/superadmin/employees')}>
        <BackArrow /> Back to Users
      </button>

      <h1 className={s.pageTitle}>Add User</h1>
      <p className={s.pageSubtitle}>Create a new employee account</p>

      <div className={s.formCard}>
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
              <label>Password <span className={s.required}>*</span></label>
              <input
                className={s.input}
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                autoComplete="new-password"
                readOnly={pwReadOnly}
                onFocus={() => setPwReadOnly(false)}
              />
              {errors.password && <p className={s.errorMsg}>{errors.password}</p>}
            </div>

            <div className={s.formGroup}>
              <label>Confirm Password <span className={s.required}>*</span></label>
              <input
                className={s.input}
                type="password"
                placeholder="Re-enter password"
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
              {submitting ? 'Creating…' : 'Create User'}
            </button>
            <button type="button" className={s.btnCancel} onClick={() => router.push('/superadmin/employees')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </SuperAdminShell>
  );
}
