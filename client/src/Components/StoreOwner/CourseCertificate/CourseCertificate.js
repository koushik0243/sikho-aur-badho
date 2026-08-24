'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from './CourseCertificate.module.css';

function toArr(res) {
  if (Array.isArray(res))             return res;
  if (Array.isArray(res?.data))       return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  if (Array.isArray(res?.list))       return res.list;
  return [];
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function certNumber(templateId, userId) {
  if (!templateId) return '—';
  const hex = (String(templateId) + String(userId || '')).replace(/[^a-f0-9]/gi, '').toUpperCase();
  return 'CERT-' + hex.slice(0, 4) + '-' + hex.slice(4, 8);
}

// Inject learner data into the template HTML by replacing common placeholder tokens
function buildCertHtml(template, userName, courseName, score, completionDate, chapters, certId) {
  if (!template?.desc) return null;
  let html = template.desc;
  const dateStr = fmtDate(completionDate);
  const scoreStr = score > 0 ? `${score}%` : '—';

  const pairs = [
    [/\{\{\s*learner[_\s]?name\s*\}\}/gi, userName],
    [/\{\{\s*student[_\s]?name\s*\}\}/gi, userName],
    [/\{\{\s*recipient[_\s]?name\s*\}\}/gi, userName],
    [/\{\{\s*full[_\s]?name\s*\}\}/gi, userName],
    [/\{\{\s*name\s*\}\}/gi, userName],
    [/\{\{\s*course[_\s]?name\s*\}\}/gi, courseName],
    [/\{\{\s*course[_\s]?title\s*\}\}/gi, courseName],
    [/\{\{\s*program[_\s]?name\s*\}\}/gi, courseName],
    [/\{\{\s*course\s*\}\}/gi, courseName],
    [/\{\{\s*completion[_\s]?date\s*\}\}/gi, dateStr],
    [/\{\{\s*date\s*\}\}/gi, dateStr],
    [/\{\{\s*score\s*\}\}/gi, scoreStr],
    [/\{\{\s*marks\s*\}\}/gi, scoreStr],
    [/\{\{\s*certificate[_\s]?id\s*\}\}/gi, certId],
    [/\{\{\s*cert[_\s]?id\s*\}\}/gi, certId],
    [/\{\{\s*chapters\s*\}\}/gi, String(chapters)],
    [/\[LEARNER[_ ]NAME\]/gi, userName],
    [/\[STUDENT[_ ]NAME\]/gi, userName],
    [/\[NAME\]/gi, userName],
    [/\[COURSE[_ ]NAME\]/gi, courseName],
    [/\[COURSE[_ ]TITLE\]/gi, courseName],
    [/\[DATE\]/gi, dateStr],
    [/\[SCORE\]/gi, scoreStr],
    [/\[CERT[_ ]ID\]/gi, certId],
    [/\{learner_?name\}/gi, userName],
    [/\{student_?name\}/gi, userName],
    [/\{name\}/gi, userName],
    [/\{course_?name\}/gi, courseName],
    [/\{course\}/gi, courseName],
    [/\{date\}/gi, dateStr],
    [/\{score\}/gi, scoreStr],
    [/\{marks\}/gi, scoreStr],
    [/\{cert_?id\}/gi, certId],
  ];
  pairs.forEach(([pat, val]) => { html = html.replace(pat, val); });
  return html;
}

// Open the certificate HTML in a new window and trigger the print dialog
function printCertHtml(html) {
  const win = window.open('', '_blank');
  if (!win) {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'certificate.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.onafterprint = () => win.close();
  }, 600);
}

const ChevronIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

export default function CourseCertificate() {
  const user = useSelector(selectUser);

  const [learners, setLearners] = useState([]);
  const [orgCourses, setOrgCourses] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);

  const [selectedLearner, setSelectedLearner] = useState('');
  const [courseOptions, setCourseOptions] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');

  const [courseObj, setCourseObj] = useState(null);
  const [template, setTemplate] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [assignedDate, setAssignedDate] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(520);
  const certIframeRef = useRef(null);

  function handleIframeLoad() {
    const win = certIframeRef.current?.contentWindow;
    const doc = win?.document;
    if (!doc) return;
    const height = Math.max(
      doc.documentElement?.scrollHeight || 0,
      doc.body?.scrollHeight || 0,
    );
    if (height > 0) setIframeHeight(height);
  }

  // ── Resolve org, learners, org courses ──────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingBase(true);
      try {
        let orgId = user?.orgId ? String(user.orgId) : null;
        if (!orgId) {
          const uid = user?._id || user?.id;
          if (uid) {
            const r = await apiServiceHandler('GET', `user/admin/edit/${uid}`).catch(() => null);
            const rec = r?.data ?? r;
            orgId = rec?.orgId ? String(rec.orgId) : null;
          }
        }
        if (!orgId || cancelled) return;

        const [learnerRes, ocRes] = await Promise.all([
          apiServiceHandler('GET', `user/admin/list?orgId=${orgId}&user_type=employee&orgRole=employee`).catch(() => null),
          apiServiceHandler('GET', `organization-course/list?orgId=${orgId}`).catch(() => null),
        ]);
        if (cancelled) return;

        setLearners(toArr(learnerRes));

        const drop = toArr(ocRes).map(oc => {
          const c = oc.courseId;
          return c?._id ? { _id: String(c._id), title: c.title || 'Untitled' } : null;
        }).filter(Boolean);
        setOrgCourses(drop);
      } finally {
        if (!cancelled) setLoadingBase(false);
      }
    }
    if (user) load();
    return () => { cancelled = true; };
  }, [user?._id]);

  // ── Courses assigned to the selected learner ────────────────
  useEffect(() => {
    setSelectedCourse('');
    if (!selectedLearner) { setCourseOptions([]); return; }
    let cancelled = false;
    setLoadingCourses(true);
    async function load() {
      try {
        const res = await apiServiceHandler('GET', `course-assignment/list?userId=${selectedLearner}`).catch(() => null);
        if (cancelled) return;
        const assigned = toArr(res);
        let list = assigned.map(a => {
          const c = a.courseId;
          return c?._id ? { _id: String(c._id), title: c.title || 'Untitled' } : null;
        }).filter(Boolean);
        if (list.length === 0) list = orgCourses;
        setCourseOptions(list);
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedLearner]);

  // ── Certificate data for learner + course ───────────────────
  useEffect(() => {
    if (!selectedLearner || !selectedCourse) {
      setCourseObj(null); setTemplate(null); setQuizAttempt(null);
      setAssignedDate(null); setChapters([]);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    setTemplate(null);
    setIframeHeight(520);

    async function load() {
      try {
        const courseRes = await apiServiceHandler('GET', `course/${selectedCourse}`).catch(() => null);
        if (cancelled) return;
        const cData = courseRes?.data ?? courseRes;
        setCourseObj(cData || courseOptions.find(c => c._id === selectedCourse) || null);

        const tmplRef = cData?.certificate_template_id;
        const tmplId  = tmplRef?._id ? String(tmplRef._id)
                      : typeof tmplRef === 'string' && tmplRef.length === 24 ? tmplRef
                      : tmplRef ? String(tmplRef) : null;

        if (tmplId) {
          const tmplRes = await apiServiceHandler('GET', `certificate-template/details/${tmplId}`).catch(() => null);
          if (cancelled) return;
          const tmplData = tmplRes?.data ?? tmplRes;
          setTemplate(tmplData?._id ? tmplData : (tmplRef?._id ? tmplRef : null));
        } else if (tmplRef?._id) {
          setTemplate(tmplRef);
        }

        const [attRes, chRes, assignRes] = await Promise.all([
          apiServiceHandler('GET', `quiz-attempt/course-all?courseId=${selectedCourse}`).catch(() => null),
          apiServiceHandler('GET', `chapter/list?courseId=${selectedCourse}`).catch(() => null),
          apiServiceHandler('GET', `course-assignment/list?userId=${selectedLearner}&courseId=${selectedCourse}`).catch(() => null),
        ]);
        if (cancelled) return;

        const attempts = toArr(attRes).filter(a => String(a.userId?._id || a.userId || '') === selectedLearner);
        setQuizAttempt(attempts[0] || null);
        setChapters(toArr(chRes));

        // The assignment action itself creates a course_assignments doc with no
        // topicId — later per-quiz attempts reuse the same collection with a
        // topicId set, so filter those out to find the true "assigned" record.
        const assignOnly = toArr(assignRes).filter(a => !a.topicId);
        const earliestAssign = assignOnly.reduce((earliest, a) => {
          const t = a.attemptedAt ? new Date(a.attemptedAt).getTime() : null;
          if (t === null) return earliest;
          return earliest === null || t < earliest ? t : earliest;
        }, null);
        setAssignedDate(earliestAssign ? new Date(earliestAssign) : null);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedLearner, selectedCourse]);

  // ── Derived values ───────────────────────────────────────────
  const activeLearner = learners.find(l => String(l._id) === selectedLearner);
  const learnerName = activeLearner
    ? (activeLearner.name || activeLearner.fullName || `${activeLearner.firstName || ''} ${activeLearner.lastName || ''}`.trim() || 'Learner')
    : '';
  const courseName = courseObj?.title
                    || courseOptions.find(c => c._id === selectedCourse)?.title
                    || '—';
  const score          = quizAttempt ? Number(quizAttempt.totalScore || 0) : 0;
  const passed         = quizAttempt ? quizAttempt.passed === true : false;
  const attemptDate    = quizAttempt?.evaluatedAt || quizAttempt?.createdAt || null;
  const completionDate = passed ? attemptDate : null;
  const chapterCount   = chapters.length;
  const hasData      = selectedLearner && selectedCourse && !loadingData;
  const certId       = certNumber(template?._id, selectedLearner);
  const certHtml     = hasData ? buildCertHtml(template, learnerName, courseName, score, completionDate, chapterCount, certId) : null;

  function handleDownload() {
    if (downloading || !certHtml) return;
    setDownloading(true);
    printCertHtml(certHtml);
    setTimeout(() => setDownloading(false), 3000);
  }

  return (
    <div className={s.page}>

      {/* ── Filter bar ── */}
      <div className={s.filterCard}>
        <p className={s.filterMeta}>Certificates</p>
        <h2 className={s.filterTitle}>Course Certificate</h2>
        <div className={s.filterRow}>
          <div className={s.filterGroup}>
            <label className={s.filterLabel}>Learner</label>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                value={selectedLearner}
                onChange={e => setSelectedLearner(e.target.value)}
                disabled={loadingBase}
              >
                <option value="">
                  {loadingBase ? 'Loading learners…' : '— Select a learner —'}
                </option>
                {learners.map(l => {
                  const uid = String(l._id || '');
                  const name = l.name || l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Learner';
                  return <option key={uid} value={uid}>{name}</option>;
                })}
              </select>
              <span className={s.selectArrow}>{ChevronIcon}</span>
            </div>
          </div>

          <div className={s.filterGroup}>
            <label className={s.filterLabel}>Course</label>
            <div className={s.selectWrap}>
              <select
                className={s.select}
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                disabled={!selectedLearner || loadingCourses}
              >
                <option value="">
                  {loadingCourses ? 'Loading courses…' : '— Select a course —'}
                </option>
                {courseOptions.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
              <span className={s.selectArrow}>{ChevronIcon}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prompt state ── */}
      {(!selectedLearner || !selectedCourse) && (
        <div className={s.emptyState}>
          <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
            <rect x="8" y="12" width="48" height="40" rx="5" stroke="#0b7b7b" strokeWidth="2" fill="#f0fafa" />
            <path d="M18 24h28M18 31h20M18 38h14" stroke="#0b7b7b" strokeWidth="2" strokeLinecap="round" />
            <circle cx="48" cy="44" r="10" fill="#0b7b7b" />
            <path d="M44 44l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className={s.emptyTitle}>Select a learner and course to view the certificate</p>
          <span className={s.emptySub}>Choose a learner, then a course from the dropdowns above.</span>
        </div>
      )}

      {/* ── Loading ── */}
      {selectedLearner && selectedCourse && loadingData && (
        <div className={s.loadingWrap}><div className={s.spinner} /></div>
      )}

      {/* ── Certificate layout ── */}
      {hasData && (
        <div className={s.layout}>

          {/* Preview */}
          <div className={s.certPanel}>
            <div className={s.certPanelHeader}>
              <div>
                <h3 className={s.certPanelTitle}>{learnerName}&apos;s Certificate</h3>
                {template ? (
                  <span className={s.templateTag}>
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                      <path fillRule="evenodd" d="M4 1a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V2a1 1 0 00-1-1H4zm1 2h6v1H5V3zm0 3h6v1H5V6zm0 3h4v1H5V9z" clipRule="evenodd" />
                    </svg>
                    {template.title}
                  </span>
                ) : (
                  <span className={s.templateTagDefault}>No template assigned</span>
                )}
              </div>
              <span className={s.certPanelSub}>Preview</span>
            </div>

            {certHtml ? (
              <div className={s.certFrame} style={{ height: iframeHeight }}>
                <iframe
                  ref={certIframeRef}
                  srcDoc={certHtml}
                  className={s.certIframe}
                  style={{ height: iframeHeight }}
                  onLoad={handleIframeLoad}
                  title="Certificate Preview"
                  scrolling="no"
                />
              </div>
            ) : (
              <div className={s.noTemplateWrap}>
                <svg viewBox="0 0 48 48" fill="none" width="40" height="40">
                  <circle cx="24" cy="24" r="20" stroke="#f59e0b" strokeWidth="2" fill="#fffbeb" />
                  <path d="M24 14v12M24 30v4" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <p className={s.noTemplateTitle}>No certificate template assigned</p>
                <p className={s.noTemplateSub}>This course does not have a certificate template configured yet.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className={s.sidebar}>
            <div className={s.card}>
              <h3 className={s.cardTitle}>Download Certificate</h3>
              <p className={s.cardSubtitle}>Print or save as PDF via your browser</p>
              <button
                className={s.downloadBtn}
                onClick={handleDownload}
                disabled={downloading || !certHtml}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                {downloading ? 'Opening print dialog…' : 'Download PDF'}
              </button>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Certificate Details</h3>
              {[
                { label: 'Certificate ID', value: certId },
                { label: 'Template',       value: template?.title || '—' },
                { label: 'Course',         value: courseName },
                { label: 'Learner',        value: learnerName },
                { label: 'Chapters',        value: chapterCount > 0 ? chapterCount : '—' },
                { label: 'Assigned Date',   value: fmtDate(assignedDate) },
                { label: 'Completion Date', value: fmtDate(completionDate) },
                { label: 'Score',           value: score > 0 ? `${score}%` : '—' },
              ].map(r => (
                <div key={r.label} className={s.summaryRow}>
                  <span className={s.summaryLabel}>{r.label}</span>
                  <span className={s.summaryVal}>{r.value}</span>
                </div>
              ))}
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Status</span>
                <span className={passed ? s.badgePassed : s.badgeInProgress}>
                  {quizAttempt ? (passed ? 'Passed' : 'Not Passed') : 'Not Attempted'}
                </span>
              </div>
            </div>

            <div className={`${s.achieveCard} ${
              !passed ? s.achieveNotPassed :
              (template?.slug || '').includes('modern')  ? s.achieveModern  :
              (template?.slug || '').includes('purple') || (template?.slug || '').includes('royal') ? s.achievePurple :
              (template?.slug || '').includes('elegant') || (template?.slug || '').includes('gold') ? s.achieveElegant : ''
            }`}>
              {passed ? (
                <svg viewBox="0 0 64 64" fill="none" width="44" height="44">
                  <path d="M32 40c-8.84 0-16-7.16-16-16V10h32v14c0 8.84-7.16 16-16 16z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                  <path d="M16 14H10a4 4 0 000 8c1.5 3 4 5 6 5M48 14h6a4 4 0 010 8c-1.5 3-4 5-6 5" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
                  <rect x="24" y="40" width="16" height="5" rx="2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" />
                  <rect x="20" y="45" width="24" height="4" rx="2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 64 64" fill="none" width="44" height="44">
                  <circle cx="32" cy="32" r="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
                  <path d="M32 21v11l8 6" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <h3 className={s.achieveTitle}>{passed ? 'Great Achievement!' : 'Not Completed Yet'}</h3>
              <p className={s.achieveText}>
                {passed
                  ? <><strong>{learnerName}</strong> has successfully completed this course.</>
                  : quizAttempt
                    ? <>{learnerName} attempted the quiz but hasn&apos;t passed this course yet.</>
                    : <>{learnerName} hasn&apos;t attempted the course quiz yet.</>}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
