'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import SuperAdminShell from '../SuperAdminShell';
import LearnerFields, {
  EMPTY_LEARNER, learnerPayload, validateLearner, findDuplicateLearnerFields,
} from './LearnerFields';
import s from "./AddEmployee.module.css";

const BackArrow = () => (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

export default function AddEmployee() {
  const router = useRouter();
  const [form, setForm]         = useState(EMPTY_LEARNER);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pwReadOnly, setPwReadOnly] = useState(true);

  function setField(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const errs = validateLearner(form, { passwordRequired: true });
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const dupErrors = await findDuplicateLearnerFields(form);
      if (Object.keys(dupErrors).length) { setErrors(dupErrors); return; }

      // Not in any organization yet — assigned later via Assign User.
      await apiServiceHandler('POST', 'user/admin/create', {
        ...learnerPayload(form),
        user_type: 'employee',
        orgId:     null,
        orgRole:   'employee',
      });
      toast.success('User created successfully.');
      router.push('/superadmin/employees');
    } catch (err) {
      toast.error(err?.message || 'Failed to create user. Please try again.');
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
          <LearnerFields form={form} setField={setField} errors={errors} s={s}
            pwReadOnly={pwReadOnly} onPasswordFocus={() => setPwReadOnly(false)} />

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
