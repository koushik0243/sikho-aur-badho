'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import apiServiceHandler from '../../../service/apiService';
import s from "./Reports.module.css";

function toArr(res) {
  if (Array.isArray(res))             return res;
  if (Array.isArray(res?.data))       return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  if (Array.isArray(res?.list))       return res.list;
  return [];
}

function downloadCsv(filename, rows) {
  const csv  = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// colDefs: [{ key, label, width }]  — width in px (×0.75 → pt internally in jsPDF)
async function downloadPdf(filename, title, colDefs, dataRows) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 123, 123);
  doc.text(title, 40, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 56);
  doc.setTextColor(0, 0, 0);

  if (dataRows.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text('No data available.', 40, 80);
  } else {
    const headers  = colDefs.map(c => ({ name: c.key, prompt: c.label, width: c.width, align: 'left' }));
    const tableData = dataRows.map(row => {
      const obj = {};
      colDefs.forEach((c, i) => { obj[c.key] = String(row[i] ?? '') || ' '; });
      return obj;
    });
    doc.table(40, 68, tableData, headers, { fontSize: 9 });
  }

  doc.save(filename);
}

function learnerName(u) {
  if (!u) return '';
  return u.name || u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || String(u._id || u);
}

export default function ReportsPage() {
  const user = useSelector(selectUser);

  const [loading,      setLoading]      = useState(true);
  const [courses,      setCourses]      = useState([]);
  const [learners,     setLearners]     = useState([]);
  const [assignments,  setAssignments]  = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [exporting,    setExporting]    = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let orgId = user?.orgId ? String(user.orgId) : null;
        if (!orgId) {
          const uid = user?._id || user?.id;
          if (uid) {
            const r   = await apiServiceHandler('GET', `user/admin/edit/${uid}`).catch(() => null);
            const rec = r?.data ?? r;
            orgId     = rec?.orgId ? String(rec.orgId) : null;
          }
        }
        if (!orgId) return;

        const [ocRes, learnerRes, assignRes] = await Promise.all([
          apiServiceHandler('GET', `organization-course/list?orgId=${orgId}`).catch(() => null),
          apiServiceHandler('GET', `user/admin/list?orgId=${orgId}&user_type=employee&orgRole=employee`).catch(() => null),
          apiServiceHandler('GET', `course-assignment/list?organizationId=${orgId}`).catch(() => null),
        ]);

        const ocList      = toArr(ocRes);
        const learnerList = toArr(learnerRes);
        const assignList  = toArr(assignRes);

        setCourses(ocList);
        setLearners(learnerList);
        setAssignments(assignList);

        const courseIds = ocList.map(oc => {
          const c = oc.courseId;
          return c?._id ? String(c._id) : String(c);
        }).filter(Boolean);

        if (courseIds.length > 0) {
          const results = await Promise.all(
            courseIds.map(cid =>
              apiServiceHandler('GET', `quiz-attempt/course-all?courseId=${cid}`).catch(() => null)
            )
          );
          setQuizAttempts(results.flatMap(r => toArr(r)));
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user?._id]);

  function buildCompletionMap() {
    const map = {};
    for (const att of quizAttempts) {
      const uid = String(att.userId?._id || att.userId || '');
      const cid = String(att.courseId || '');
      if (!uid || !cid) continue;
      const k = `${uid}_${cid}`;
      const d = att.createdAt ? new Date(att.createdAt) : null;
      if (d && (!map[k] || d > map[k])) map[k] = d;
    }
    return map;
  }

  function completionRows() {
    const completionMap = buildCompletionMap();
    const enrollments = assignments.filter(a => !a.topicId);
    return enrollments.map(a => {
      const uid = String(a.userId?._id || '');
      const cid = String(a.courseId?._id || a.courseId || '');
      const latestAttempt = completionMap[`${uid}_${cid}`];
      return [
        learnerName(a.userId),
        a.userId?.email || '',
        a.courseId?.title || String(cid),
        a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-IN') : '',
        latestAttempt ? latestAttempt.toLocaleDateString('en-IN') : '',
      ];
    });
  }

  async function handleCsv(key) {
    setExporting(key);
    try {
      switch (key) {
        case 'completion': {
          const rows = [['Learner Name', 'Email', 'Course', 'Assigned Date', 'Completion Date'], ...completionRows()];
          downloadCsv('course_completion.csv', rows);
          break;
        }
        case 'performers': {
          const rows = [['Learner Name', 'Email', 'Course', 'Quiz Topic', 'Score', 'Passed', 'Date']];
          const sorted = [...quizAttempts].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
          for (const att of sorted) {
            rows.push([
              learnerName(att.userId),
              att.userId?.email || '',
              att.courseId?.title || String(att.courseId?._id || att.courseId || ''),
              att.topicId?.title  || String(att.topicId?._id  || att.topicId  || ''),
              att.totalScore ?? '',
              att.passed ? 'Yes' : 'No',
              att.createdAt ? new Date(att.createdAt).toLocaleDateString('en-IN') : '',
            ]);
          }
          downloadCsv('performers.csv', rows);
          break;
        }
        case 'failure': {
          const topicStats = {};
          for (const att of quizAttempts) {
            const tid   = String(att.topicId?._id || att.topicId || '');
            const tName = att.topicId?.title || tid;
            const cName = att.topicId?.chapterId?.title || att.chapterId?.title || '';
            const crs   = att.courseId?.title || '';
            if (!tid) continue;
            if (!topicStats[tid]) topicStats[tid] = { topic: tName, chapter: cName, course: crs, total: 0, failed: 0 };
            topicStats[tid].total++;
            if (!att.passed) topicStats[tid].failed++;
          }
          const rows = [['Course', 'Chapter', 'Quiz Topic', 'Total Attempts', 'Failed', 'Failure Rate %']];
          for (const d of Object.values(topicStats)) {
            const rate = d.total > 0 ? Math.round((d.failed / d.total) * 100) : 0;
            rows.push([d.course, d.chapter, d.topic, d.total, d.failed, `${rate}%`]);
          }
          downloadCsv('chapter_failure.csv', rows);
          break;
        }
        case 'zoom': {
          const rows = [['Learner Name', 'Email', 'Courses Assigned']];
          for (const l of learners) {
            const uid   = String(l._id || '');
            const count = assignments.filter(a => String(a.userId?._id || a.userId) === uid).length;
            rows.push([learnerName(l), l.email || '', count]);
          }
          downloadCsv('zoom_attendance.csv', rows);
          break;
        }
        case 'certificates': {
          const completionMap = buildCompletionMap();
          const rows = [['Learner Name', 'Email', 'Course', 'Assigned Date', 'Completion Date']];
          const enrollments = assignments.filter(a => !a.topicId);
          for (const a of enrollments) {
            const uid = String(a.userId?._id || '');
            const cid = String(a.courseId?._id || a.courseId || '');
            const latestAttempt = completionMap[`${uid}_${cid}`];
            rows.push([
              learnerName(a.userId),
              a.userId?.email || '',
              a.courseId?.title || '',
              a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-IN') : '',
              latestAttempt ? latestAttempt.toLocaleDateString('en-IN') : '',
            ]);
          }
          downloadCsv('certificate_log.csv', rows);
          break;
        }
      }
    } finally {
      setExporting(null);
    }
  }

  async function handlePdf(key) {
    setExporting(`${key}_pdf`);
    try {
      switch (key) {
        case 'completion': {
          const colDefs = [
            { key: 'n',  label: 'Learner Name',    width: 180 },
            { key: 'e',  label: 'Email',           width: 225 },
            { key: 'c',  label: 'Course',          width: 280 },
            { key: 'ad', label: 'Assigned Date',   width: 160 },
            { key: 'cd', label: 'Completion Date', width: 170 },
          ];
          await downloadPdf('course_completion.pdf', 'Course Completion Report', colDefs, completionRows());
          break;
        }
        case 'performers': {
          const colDefs = [
            { key: 'n',  label: 'Learner Name', width: 145 },
            { key: 'e',  label: 'Email',        width: 190 },
            { key: 'c',  label: 'Course',       width: 190 },
            { key: 'qt', label: 'Quiz Topic',   width: 190 },
            { key: 's',  label: 'Score',        width: 85  },
            { key: 'p',  label: 'Passed',       width: 85  },
            { key: 'd',  label: 'Date',         width: 130 },
          ];
          const sorted = [...quizAttempts].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
          const rows = sorted.map(att => [
            learnerName(att.userId),
            att.userId?.email || '',
            att.courseId?.title || String(att.courseId?._id || att.courseId || ''),
            att.topicId?.title  || String(att.topicId?._id  || att.topicId  || ''),
            att.totalScore ?? '',
            att.passed ? 'Yes' : 'No',
            att.createdAt ? new Date(att.createdAt).toLocaleDateString('en-IN') : '',
          ]);
          await downloadPdf('performers.pdf', 'Top / Bottom Performers', colDefs, rows);
          break;
        }
        case 'failure': {
          const colDefs = [
            { key: 'crs',   label: 'Course',         width: 210 },
            { key: 'ch',    label: 'Chapter',        width: 210 },
            { key: 'qt',    label: 'Quiz Topic',     width: 210 },
            { key: 'total', label: 'Total Attempts', width: 135 },
            { key: 'fail',  label: 'Failed',         width: 115 },
            { key: 'rate',  label: 'Failure Rate %', width: 135 },
          ];
          const topicStats = {};
          for (const att of quizAttempts) {
            const tid   = String(att.topicId?._id || att.topicId || '');
            const tName = att.topicId?.title || tid;
            const cName = att.topicId?.chapterId?.title || att.chapterId?.title || '';
            const crs   = att.courseId?.title || '';
            if (!tid) continue;
            if (!topicStats[tid]) topicStats[tid] = { topic: tName, chapter: cName, course: crs, total: 0, failed: 0 };
            topicStats[tid].total++;
            if (!att.passed) topicStats[tid].failed++;
          }
          const rows = Object.values(topicStats).map(d => {
            const rate = d.total > 0 ? Math.round((d.failed / d.total) * 100) : 0;
            return [d.course, d.chapter, d.topic, d.total, d.failed, `${rate}%`];
          });
          await downloadPdf('chapter_failure.pdf', 'Chapter Failure Analysis', colDefs, rows);
          break;
        }
        case 'zoom': {
          const colDefs = [
            { key: 'n', label: 'Learner Name',     width: 320 },
            { key: 'e', label: 'Email',            width: 475 },
            { key: 'x', label: 'Courses Assigned', width: 220 },
          ];
          const rows = learners.map(l => {
            const uid   = String(l._id || '');
            const count = assignments.filter(a => String(a.userId?._id || a.userId) === uid).length;
            return [learnerName(l), l.email || '', count];
          });
          await downloadPdf('zoom_attendance.pdf', 'Zoom Attendance Log', colDefs, rows);
          break;
        }
        case 'certificates': {
          const colDefs = [
            { key: 'n',  label: 'Learner Name',    width: 180 },
            { key: 'e',  label: 'Email',           width: 235 },
            { key: 'c',  label: 'Course',          width: 280 },
            { key: 'ad', label: 'Assigned Date',   width: 155 },
            { key: 'cd', label: 'Completion Date', width: 165 },
          ];
          const completionMap = buildCompletionMap();
          const enrollments = assignments.filter(a => !a.topicId);
          const rows = enrollments.map(a => {
            const uid = String(a.userId?._id || '');
            const cid = String(a.courseId?._id || a.courseId || '');
            const latestAttempt = completionMap[`${uid}_${cid}`];
            return [
              learnerName(a.userId),
              a.userId?.email || '',
              a.courseId?.title || '',
              a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-IN') : '',
              latestAttempt ? latestAttempt.toLocaleDateString('en-IN') : '',
            ];
          });
          await downloadPdf('certificate_log.pdf', 'Certificate Issuance Log', colDefs, rows);
          break;
        }
      }
    } finally {
      setExporting(null);
    }
  }

  const courseCount  = courses.length;
  const learnerCount = learners.length;
  const attemptCount = quizAttempts.length;
  const assignCount  = assignments.length;

  const REPORTS = [
    {
      key: 'completion', num: '01',
      title: 'Course Completion Report',
      sub: loading ? 'Loading…' : `${courseCount} course${courseCount !== 1 ? 's' : ''} · ${learnerCount} learner${learnerCount !== 1 ? 's' : ''}`,
    },
    {
      key: 'performers', num: '02',
      title: 'Top / Bottom Performers',
      sub: loading ? 'Loading…' : `${attemptCount} quiz attempt${attemptCount !== 1 ? 's' : ''} · Ranked by score`,
    },
    {
      key: 'failure', num: '03',
      title: 'Chapter Failure Analysis',
      sub: loading ? 'Loading…' : `Retry rates · ${attemptCount} total attempt${attemptCount !== 1 ? 's' : ''}`,
    },
    {
      key: 'zoom', num: '04',
      title: 'Zoom Attendance Log',
      sub: loading ? 'Loading…' : `${learnerCount} learner${learnerCount !== 1 ? 's' : ''} · Session-wise records`,
    },
    {
      key: 'certificates', num: '05',
      title: 'Certificate Issuance Log',
      sub: loading ? 'Loading…' : `${assignCount} assignment${assignCount !== 1 ? 's' : ''} · Who earned what · When`,
    },
  ];

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>Export Reports</h2>
        {loading && <span className={s.loadingNote}>Loading data…</span>}
      </div>

      <div className={s.reportList}>
        {REPORTS.map(r => (
          <div key={r.key} className={s.reportRow}>
            <div className={s.reportLeft}>
              <span className={s.reportNum}>{r.num}</span>
              <div>
                <div className={s.reportTitle}>{r.title}</div>
                <div className={s.reportSub}>{r.sub}</div>
              </div>
            </div>
            <div className={s.reportActions}>
              <button
                suppressHydrationWarning
                className={s.btnCsv}
                disabled={loading || exporting === r.key || exporting === `${r.key}_pdf`}
                onClick={() => handleCsv(r.key)}
              >
                {exporting === r.key ? '…' : 'CSV'}
              </button>
              <button
                suppressHydrationWarning
                className={s.btnPdf}
                disabled={loading || exporting === r.key || exporting === `${r.key}_pdf`}
                onClick={() => handlePdf(r.key)}
              >
                {exporting === `${r.key}_pdf` ? '…' : 'PDF'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
