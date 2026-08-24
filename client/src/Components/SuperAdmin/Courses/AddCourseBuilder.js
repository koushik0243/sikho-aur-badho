'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiServiceHandler from '../../../service/apiService';
import { API_URL } from '../../../lib/constant';
import SuperAdminShell from '../SuperAdminShell';
import ConfirmModal from '../ConfirmModal';
import s from "./AddCourseBuilder.module.css";

/* ── Constants ─────────────────────────────────────────────────── */
const CHAPTER_COLORS = ['#3b82f6', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0b7b7b', '#db2777', '#6d28d9'];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const TOPIC_TYPES = [
  { value: 'document',  label: 'Document'  },
  { value: 'quiz',      label: 'Quiz'      },
  { value: 'file',      label: 'File'      },
  { value: 'zoom_link', label: 'Zoom Link' },
];
const DIFF_LABEL = { beginner: 'Basic', intermediate: 'Intermediate', advanced: 'Advance' };
const MAX_LESSON_VIDEO_MB    = 24;
const MAX_LESSON_VIDEO_BYTES = MAX_LESSON_VIDEO_MB * 1024 * 1024;

// Shared by the lesson-video file input (add & edit) — rejects anything over the cap
// before it's ever attached to the form, so an oversized file never reaches the upload
// request in the first place.
function pickLessonVideoFile(file) {
  if (!file) return null;
  if (file.size > MAX_LESSON_VIDEO_BYTES) {
    toast.error(`Video file is too large. Maximum allowed size is ${MAX_LESSON_VIDEO_MB} MB.`);
    return null;
  }
  return file;
}

/* ── Icons ─────────────────────────────────────────────────────── */
const TrashIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const ChevronUpIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const MenuIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

const ImageIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

const VideoIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
  </svg>
);

const SearchIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

/* ── Helpers ───────────────────────────────────────────────────── */
function newTopic(order) {
  return { title: '', order, type: 'document', zoom_link_url: '', status: 'active', isOpen: true };
}

function newChapter(order) {
  return { _id: Date.now() + Math.floor(Math.random() * 1e6), title: '', order, desc: '', status: 'active', topics: [], lessons: [], quizzes: [], zoomLinks: [], assignments: [], saved: false, collapsed: false, serverId: null };
}

function buildTree(nodes) {
  const map = {};
  nodes.forEach(n => { map[n._id] = { ...n, children: [] }; });
  const roots = [];
  nodes.forEach(n => {
    if (n.parentId && map[n.parentId]) {
      map[n.parentId].children.push(map[n._id]);
    } else {
      roots.push(map[n._id]);
    }
  });
  return roots;
}

function flattenTree(nodes, depth = 0) {
  const out = [];
  nodes.forEach(n => {
    out.push({ ...n, depth });
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1));
  });
  return out;
}

/* ── Main component ────────────────────────────────────────────── */
export default function AddCourseBuilder({ editId } = {}) {
  const router = useRouter();

  /* ── Step state ──────────────────────────────────────────── */
  const [step, setStep] = useState(1);

  /* ── Side-panel option tabs (Step 1) ─────────────────────── */
  const [optionTab, setOptionTab] = useState('general');

  /* ── Categories & Tags ───────────────────────────────────── */
  const [allCategories, setAllCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [catSearch, setCatSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  /* ── Add-new inline states ───────────────────────────────── */
  const [newTagInput, setNewTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [showCatPopup, setShowCatPopup] = useState(false);
  const [collapsedCatIds, setCollapsedCatIds] = useState(new Set());

  /* ── Form data ───────────────────────────────────────────── */
  const [form, setForm] = useState({
    title: '',
    desc: '',
    status: 'draft',
    duration_hr: '0',
    duration_min: '00',
    selectedCatIds: [],
    selectedTagIds: [],
    // general options
    difficultyLevel: 'beginner',
    enableReview: true,
    qnaEnabled: false,
    contentDrip: false,
    // aptitude test
    aptitudeEnabled: false,
    aptitudeContext: '',
    aptitudeSelectedQuestionIds: [],
    // additional
    maxStudents: '',
    // step 3 overview
    what_will_learn: '',
    target_audience: '',
    materials_included: '',
    requirements: '',
  });

  const [chapters, setChapters] = useState([]);
  const [errors, setErrors] = useState({});

  function getChapterFlatItems(ch) {
    const lessons = (ch.lessons || []).map((item, _typeIdx) => ({ ...item, _type: 'lesson', _typeIdx }));
    const quizzes = (ch.quizzes || []).map((item, _typeIdx) => ({ ...item, _type: 'quiz', _typeIdx }));
    const zooms   = (ch.zoomLinks || []).map((item, _typeIdx) => ({ ...item, _type: 'zoom', _typeIdx }));
    const assigns = (ch.assignments || []).map((item, _typeIdx) => ({ ...item, _type: 'assignment', _typeIdx }));
    return [...lessons, ...quizzes, ...zooms, ...assigns]
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }

  async function reorderChapterItem(chIdx, fromFlatIdx, toFlatIdx) {
    if (fromFlatIdx === toFlatIdx) return;
    const ch = chapters[chIdx];
    const newFlat = [...getChapterFlatItems(ch)];
    const [moved] = newFlat.splice(fromFlatIdx, 1);
    newFlat.splice(toFlatIdx, 0, moved);

    const withOrder = newFlat.map((item, i) => ({ ...item, order: i + 1 }));
    const strip = ({ _type, _typeIdx, ...rest }) => rest;
    const newLessons     = withOrder.filter(i => i._type === 'lesson').map(strip);
    const newQuizzes     = withOrder.filter(i => i._type === 'quiz').map(strip);
    const newZoomLinks   = withOrder.filter(i => i._type === 'zoom').map(strip);
    const newAssignments = withOrder.filter(i => i._type === 'assignment').map(strip);

    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], lessons: newLessons, quizzes: newQuizzes, zoomLinks: newZoomLinks, assignments: newAssignments };
      return c;
    });

    await Promise.allSettled(
      withOrder.map(item => {
        if (!item.serverId) return Promise.resolve();
        return apiServiceHandler('PUT', `topic/update/${item.serverId}`, { order: item.order });
      })
    );
    toast.success('Item order saved.');
  }

  async function reorderChapters(fromIdx, toIdx) {
    if (fromIdx == null || fromIdx === toIdx) return;

    const newOrder = [...chapters];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    setChapters(newOrder);

    // Persist new section order immediately
    if (!courseId) return;
    await Promise.allSettled(
      newOrder.map((ch, idx) => {
        if (!ch.serverId) return Promise.resolve();
        return apiServiceHandler('PUT', `chapter/update/${ch.serverId}`, {
          courseId,
          title: ch.title.trim(),
          desc: ch.desc?.trim() || '',
          order: idx + 1,
          status: ch.status || 'active',
          isPublished: true,
          totalTopics: (ch.lessons?.length || 0) + (ch.quizzes?.length || 0) +
                       (ch.zoomLinks?.length || 0) + (ch.assignments?.length || 0),
        });
      })
    );
    toast.success('Section order saved.');
  }
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [existingCourseImage, setExistingCourseImage] = useState(null);
  const [existingIntroVideo, setExistingIntroVideo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [courseId, setCourseId] = useState(editId || null);
  const [savingStep1, setSavingStep1] = useState(false);
  const [savingChapterIdx, setSavingChapterIdx] = useState(null);
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [introVideoFile, setIntroVideoFile] = useState(null);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [chapterToDelete, setChapterToDelete] = useState(null); // chIdx
  const [lessonToDelete, setLessonToDelete] = useState(null);   // { chIdx, lIdx }
  const [quizToDelete, setQuizToDelete] = useState(null);       // { chIdx, qIdx }
  const [zoomToDelete, setZoomToDelete] = useState(null);       // { chIdx, zIdx }
  const [assignToDelete, setAssignToDelete] = useState(null);   // { chIdx, aIdx }
  const [dragChIdx, setDragChIdx] = useState(null);
  const [dragOverChIdx, setDragOverChIdx] = useState(null);
  const [dragItemInfo, setDragItemInfo] = useState(null);
  const [dragOverItemInfo, setDragOverItemInfo] = useState(null);

  /* ── Quiz modal ──────────────────────────────────────────── */
  const DIFF_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };
  const sortByDifficulty = (arr) =>
    [...arr].sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 0) - (DIFF_ORDER[b.difficulty] ?? 0));

  const [quizModal, setQuizModal] = useState(null);
  const [quizTab, setQuizTab] = useState('details');
  const [quizForm, setQuizForm] = useState({ title: '', summary: '' });
  const [quizQAPool, setQuizQAPool] = useState([]);
  const [quizQASelected, setQuizQASelected] = useState([]);
  const [quizQAGenerating, setQuizQAGenerating] = useState(false);
  const [quizQAHasGenerated, setQuizQAHasGenerated] = useState(false);
  const [quizQALoading, setQuizQALoading] = useState(false);
  const [expandedQIds, setExpandedQIds] = useState(new Set());
  const [quizSettings, setQuizSettings] = useState({
    timeLimit: '0', timeUnit: 'Minutes', hideQuizTime: false,
    feedbackMode: 'retry',
    attemptsAllowed: '10', passingGrade: '80', maxQuestions: '10',
    basicOpen: true,
    quizAutoStart: false, questionLayout: 'single', questionOrder: 'random',
    hideQuestionNumber: false, charLimitShort: '200', charLimitEssay: '500',
    advancedOpen: true,
  });

  function openQuizModal(chIdx) {
    setQuizForm({ title: '', summary: '' });
    setQuizTab('details');
    setQuizSettings({
      timeLimit: '0', timeUnit: 'Minutes', hideQuizTime: false,
      feedbackMode: 'retry',
      attemptsAllowed: '10', passingGrade: '80', maxQuestions: '10',
      basicOpen: true,
      quizAutoStart: false, questionLayout: 'single', questionOrder: 'random',
      hideQuestionNumber: false, charLimitShort: '200', charLimitEssay: '500',
      advancedOpen: true,
    });
    setQuizQAPool([]);
    setQuizQASelected([]);
    setQuizQAHasGenerated(false);
    setExpandedQIds(new Set());
    setQuizModal({ chIdx, topicName: chapters[chIdx]?.title || 'demo' });
  }
  function closeQuizModal() { setQuizModal(null); }
  function setQuizField(key, val) { setQuizForm(prev => ({ ...prev, [key]: val })); }
  function setQS(key, val) { setQuizSettings(prev => ({ ...prev, [key]: val })); }

  async function loadQuizQA(quizServerId, selectedIds) {
    if (!quizServerId) return;
    setQuizQALoading(true);
    try {
      const res = await apiServiceHandler('GET', `quiz-questions/list?quizId=${quizServerId}`);
      const all = Array.isArray(res?.data) ? res.data : [];
      const selSet = new Set((selectedIds || []).map(String));
      setQuizQASelected(sortByDifficulty(all.filter(q => selSet.has(String(q._id)))));
      setQuizQAPool(sortByDifficulty(all.filter(q => !selSet.has(String(q._id)))));
      if (all.length > 0) setQuizQAHasGenerated(true);
    } catch {
      // fail silently — empty state shown in UI
    } finally {
      setQuizQALoading(false);
    }
  }

  async function generateQuizQA() {
    const chIdx = quizModal.chIdx;
    const chServerId = chapters[chIdx]?.serverId;
    if (!chServerId) { toast.error('Please save the chapter first.'); return; }

    setQuizQAGenerating(true);
    try {
      let quizServerId = quizModal.editIdx != null
        ? chapters[chIdx].quizzes?.[quizModal.editIdx]?.serverId
        : null;

      const autoTitle = quizForm.title.trim() || `${chapters[chIdx]?.title || 'Chapter'} Quiz`;

      if (!quizServerId) {
        const order = (chapters[chIdx].quizzes?.length || 0) + 1;
        const saveRes = await apiServiceHandler('POST', 'topic/create', {
          courseId, chapterId: chServerId,
          title: autoTitle,
          desc: quizForm.summary || '',
          video_type: 'quiz',
          quizSettings: { ...quizSettings },
          order, isPreview: false, status: 'active',
        });
        quizServerId = saveRes?.data?._id;
        if (!quizServerId) throw new Error('Failed to create quiz topic.');
        const newEditIdx = chapters[chIdx].quizzes?.length || 0;
        const newQuiz = {
          _id: Date.now(),
          serverId: quizServerId,
          title: autoTitle,
          summary: quizForm.summary || '',
          settings: { ...quizSettings },
        };
        setChapters(prev => {
          const c = [...prev];
          c[chIdx] = { ...c[chIdx], quizzes: [...(c[chIdx].quizzes || []), newQuiz] };
          return c;
        });
        setQuizModal(prev => ({ ...prev, editIdx: newEditIdx }));
      }

      const res = await apiServiceHandler('POST', 'quiz-questions/generate', {
        courseId,
        chapterId: chServerId,
        quizId: quizServerId,
        courseTitle: form.title || 'Course',
        chapterTitle: chapters[chIdx]?.title || 'Chapter',
      });

      const newQAs = Array.isArray(res?.data) ? res.data : [];
      setQuizQAPool(prev => {
        const existIds = new Set([
          ...prev.map(q => String(q._id)),
          ...quizQASelected.map(q => String(q._id)),
        ]);
        return sortByDifficulty([...prev, ...newQAs.filter(q => !existIds.has(String(q._id)))]);
      });
      setQuizQAHasGenerated(true);
      toast.success(`${newQAs.length} questions generated.`);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate questions.');
    } finally {
      setQuizQAGenerating(false);
    }
  }
  function saveQuiz() {
    const chIdx = quizModal.chIdx;
    const autoTitle = quizForm.title.trim() || `${chapters[chIdx]?.title || 'Chapter'} Quiz`;
    const chServerId = chapters[chIdx]?.serverId;
    if (!chServerId) { toast.error('Please save the chapter first.'); return; }
    const isEdit = quizModal.editIdx != null;
    const existingQuiz = isEdit ? chapters[chIdx].quizzes[quizModal.editIdx] : null;
    const order = isEdit ? quizModal.editIdx + 1 : (chapters[chIdx].quizzes?.length || 0) + 1;
    const selectedQuestionIds = quizQASelected.map(q => q._id);
    const quizBase = {
      _id: isEdit ? existingQuiz._id : Date.now(),
      serverId: isEdit ? existingQuiz.serverId : null,
      title: autoTitle,
      summary: quizForm.summary,
      settings: { ...quizSettings, selectedQuestionIds },
    };
    const payload = {
      courseId, chapterId: chServerId,
      title: quizBase.title, desc: quizBase.summary || '',
      video_type: 'quiz',
      quizSettings: {
        ...quizSettings,
        selectedQuestionIds,
      },
      order, isPreview: false, status: 'active',
    };
    const apiCall = quizBase.serverId
      ? apiServiceHandler('PUT', `topic/update/${quizBase.serverId}`, payload)
      : apiServiceHandler('POST', 'topic/create', payload);
    apiCall
      .then(res => {
        const serverId = quizBase.serverId || res?.data?._id || null;
        const quiz = { ...quizBase, serverId };
        setChapters(prev => {
          const c = [...prev];
          const quizzes = [...(c[chIdx].quizzes || [])];
          if (isEdit) {
            quizzes[quizModal.editIdx] = quiz;
          } else {
            quizzes.push(quiz);
          }
          c[chIdx] = { ...c[chIdx], quizzes };
          return c;
        });
        closeQuizModal();
        toast.success(isEdit ? 'Quiz updated.' : 'Quiz saved.');
      })
      .catch(err => toast.error(err?.message || 'Failed to save quiz.'));
  }

  /* ── Aptitude Test modal ─────────────────────────────────── */
  const [aptitudeModalOpen, setAptitudeModalOpen] = useState(false);
  const [aptitudeQAPool, setAptitudeQAPool] = useState([]);
  const [aptitudeQASelected, setAptitudeQASelected] = useState([]);
  const [aptitudeQAGenerating, setAptitudeQAGenerating] = useState(false);
  const [aptitudeQAHasGenerated, setAptitudeQAHasGenerated] = useState(false);
  const [aptitudeQALoading, setAptitudeQALoading] = useState(false);
  const [aptitudeSaving, setAptitudeSaving] = useState(false);
  const [expandedAptitudeQIds, setExpandedAptitudeQIds] = useState(new Set());
  const [aptitudeLoadedOnce, setAptitudeLoadedOnce] = useState(false);

  function openAptitudeModal() {
    setAptitudeModalOpen(true);
    if (courseId && !aptitudeLoadedOnce) {
      loadAptitudeQA();
    }
  }
  function closeAptitudeModal() { setAptitudeModalOpen(false); }

  async function loadAptitudeQA(overrideCourseId, overrideSelectedIds) {
    const cId = overrideCourseId || courseId;
    if (!cId) return;
    setAptitudeQALoading(true);
    try {
      const res = await apiServiceHandler('GET', `aptitude-questions/list?courseId=${cId}`);
      const all = Array.isArray(res?.data) ? res.data : [];
      const selSet = new Set((overrideSelectedIds || form.aptitudeSelectedQuestionIds || []).map(String));
      setAptitudeQASelected(sortByDifficulty(all.filter(q => selSet.has(String(q._id)))));
      setAptitudeQAPool(sortByDifficulty(all.filter(q => !selSet.has(String(q._id)))));
      if (all.length > 0) setAptitudeQAHasGenerated(true);
      setAptitudeLoadedOnce(true);
    } catch {
      // fail silently — empty state shown in UI
    } finally {
      setAptitudeQALoading(false);
    }
  }

  async function generateAptitudeQA() {
    if (!form.aptitudeContext.trim()) {
      toast.error('Please enter context before generating aptitude questions.');
      return;
    }
    setAptitudeQAGenerating(true);
    try {
      const res = await apiServiceHandler('POST', 'aptitude-questions/generate', {
        courseId: courseId || null,
        courseTitle: form.title || 'Course',
        courseDesc: form.desc || '',
        context: form.aptitudeContext,
      });

      const newQAs = Array.isArray(res?.data) ? res.data : [];
      setAptitudeQAPool(prev => {
        const existIds = new Set([
          ...prev.map(q => String(q._id)),
          ...aptitudeQASelected.map(q => String(q._id)),
        ]);
        return sortByDifficulty([...prev, ...newQAs.filter(q => !existIds.has(String(q._id)))]);
      });
      setAptitudeQAHasGenerated(true);
      toast.success(`${newQAs.length} questions generated.`);
    } catch (err) {
      toast.error(err?.message || 'Failed to generate questions.');
    } finally {
      setAptitudeQAGenerating(false);
    }
  }

  async function saveAptitudeTest() {
    const e = {};
    if (!form.title.trim()) e.title = 'Course title is required.';
    if (!form.desc.trim()) e.desc = 'Description is required.';
    if (Object.keys(e).length) {
      setErrors(prev => ({ ...prev, ...e }));
      toast.error('Please fill in the course title and description before saving the aptitude test.');
      return;
    }

    setAptitudeSaving(true);
    try {
      const selectedIds = aptitudeQASelected.map(q => q._id);
      setForm(prev => ({ ...prev, aptitudeSelectedQuestionIds: selectedIds }));

      const resolvedCourseId = await saveCourseBasicInfo({ selectedQuestionIds: selectedIds });
      if (!resolvedCourseId) {
        // saveCourseBasicInfo already showed an error toast
        return;
      }

      const allIds = [
        ...aptitudeQAPool.map(q => q._id),
        ...aptitudeQASelected.map(q => q._id),
      ];
      if (allIds.length > 0) {
        await apiServiceHandler('PUT', 'aptitude-questions/attach-course', {
          ids: allIds,
          courseId: resolvedCourseId,
        });
      }

      toast.success('Aptitude test saved.');
      closeAptitudeModal();
    } catch (err) {
      toast.error(err?.message || 'Failed to save aptitude test.');
    } finally {
      setAptitudeSaving(false);
    }
  }

  /* ── Lesson modal ────────────────────────────────────────── */
  const [lessonModal, setLessonModal] = useState(null); // { chIdx, topicName } | null
  const [lessonForm, setLessonForm] = useState({
    name: '',
    content: '',
    featuredImage: null,
    imageUrl: '',
    video: null,
    videoUrl: '',
    playbackHour: '0',
    playbackMin: '0',
    playbackSec: '0',
    exerciseFile: null,
    lessonPreview: false,
  });

  function openLessonModal(chIdx) {
    setLessonForm({
      name: '', content: '', featuredImage: null, imageUrl: '', video: null, videoUrl: '',
      playbackHour: '0', playbackMin: '0', playbackSec: '0',
      exerciseFile: null, lessonPreview: false,
    });
    setLessonModal({ chIdx, topicName: chapters[chIdx]?.title || 'demo' });
  }

  function closeLessonModal() { setLessonModal(null); }

  function setLessonField(key, val) { setLessonForm(prev => ({ ...prev, [key]: val })); }

  function saveLesson() {
    if (!lessonForm.name.trim()) { toast.error('Lesson name is required.'); return; }
    const chIdx = lessonModal.chIdx;
    const chServerId = chapters[chIdx]?.serverId;
    if (!chServerId) { toast.error('Please save the chapter first.'); return; }
    const isEdit = lessonModal.editIdx != null;
    const existingLesson = isEdit ? chapters[chIdx].lessons[lessonModal.editIdx] : null;
    const order = isEdit ? lessonModal.editIdx + 1 : (chapters[chIdx].lessons?.length || 0) + 1;
    const lessonBase = {
      _id: isEdit ? existingLesson._id : Date.now(),
      serverId: isEdit ? existingLesson.serverId : null,
      name: lessonForm.name.trim(),
      content: lessonForm.content,
      featuredImage: lessonForm.featuredImage,
      video: lessonForm.video,
      videoUrl: lessonForm.videoUrl,
      playbackHour: lessonForm.playbackHour,
      playbackMin: lessonForm.playbackMin,
      playbackSec: lessonForm.playbackSec,
    };
    let payload;
    if (lessonBase.featuredImage || lessonBase.video) {
      payload = new FormData();
      payload.append('courseId', courseId);
      payload.append('chapterId', chServerId);
      payload.append('title', lessonBase.name);
      payload.append('desc', lessonBase.content || '');
      payload.append('video_type', 'lesson');
      payload.append('videoUrl', lessonBase.videoUrl || '');
      payload.append('duration_hr', lessonBase.playbackHour || '0');
      payload.append('duration_min', lessonBase.playbackMin || '0');
      payload.append('duration_sec', lessonBase.playbackSec || '0');
      payload.append('order', String(order));
      payload.append('isPreview', 'false');
      payload.append('status', 'active');
      if (lessonBase.featuredImage) payload.append('lesson_image', lessonBase.featuredImage);
      if (lessonBase.video) payload.append('lesson_video', lessonBase.video);
    } else {
      payload = {
        courseId, chapterId: chServerId,
        title: lessonBase.name, desc: lessonBase.content || '',
        video_type: 'lesson',
        videoUrl: lessonBase.videoUrl || null,
        duration_hr: lessonBase.playbackHour || '0',
        duration_min: lessonBase.playbackMin || '0',
        duration_sec: lessonBase.playbackSec || '0',
        order, isPreview: false, status: 'active',
      };
    }
    const apiCall = lessonBase.serverId
      ? apiServiceHandler('PUT', `topic/update/${lessonBase.serverId}`, payload)
      : apiServiceHandler('POST', 'topic/create', payload);
    apiCall
      .then(res => {
        const serverId = lessonBase.serverId || res?.data?._id || null;
        const lesson = { ...lessonBase, serverId };
        setChapters(prev => {
          const c = [...prev];
          const lessons = [...(c[chIdx].lessons || [])];
          if (isEdit) {
            lessons[lessonModal.editIdx] = lesson;
          } else {
            lessons.push(lesson);
          }
          c[chIdx] = { ...c[chIdx], lessons };
          return c;
        });
        closeLessonModal();
        toast.success(isEdit ? 'Lesson updated.' : 'Lesson saved.');
      })
      .catch(err => toast.error(err?.message || 'Failed to save lesson.'));
  }

  async function removeLesson(chIdx, lIdx) {
    const lesson = chapters[chIdx]?.lessons?.[lIdx];
    if (lesson?.serverId) {
      try {
        await apiServiceHandler('GET', `topic/delete/${lesson.serverId}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to delete lesson.');
        return;
      }
    }
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], lessons: c[chIdx].lessons.filter((_, i) => i !== lIdx) };
      return c;
    });
  }

  async function removeQuiz(chIdx, qIdx) {
    const quiz = chapters[chIdx]?.quizzes?.[qIdx];
    if (quiz?.serverId) {
      try {
        await apiServiceHandler('GET', `topic/delete/${quiz.serverId}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to delete quiz.');
        return;
      }
    }
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], quizzes: c[chIdx].quizzes.filter((_, i) => i !== qIdx) };
      return c;
    });
  }

  async function removeZoom(chIdx, zIdx) {
    const item = chapters[chIdx]?.zoomLinks?.[zIdx];
    if (item?.serverId) {
      try {
        await apiServiceHandler('GET', `topic/delete/${item.serverId}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to delete zoom link.');
        return;
      }
    }
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], zoomLinks: c[chIdx].zoomLinks.filter((_, i) => i !== zIdx) };
      return c;
    });
  }

  async function removeAssign(chIdx, aIdx) {
    const item = chapters[chIdx]?.assignments?.[aIdx];
    if (item?.serverId) {
      try {
        await apiServiceHandler('GET', `topic/delete/${item.serverId}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to delete assignment.');
        return;
      }
    }
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], assignments: c[chIdx].assignments.filter((_, i) => i !== aIdx) };
      return c;
    });
  }

  /* ── Zoom Link modal ─────────────────────────────────────── */
  const [zoomModal, setZoomModal] = useState(null); // { chIdx } | null
  const [zoomForm, setZoomForm] = useState({ title: '', link: '' });

  function openZoomModal(chIdx) {
    setZoomForm({ title: '', link: '' });
    setZoomModal({ chIdx });
  }
  function closeZoomModal() { setZoomModal(null); }
  function saveZoom() {
    if (!zoomForm.title.trim()) { toast.error('Title is required.'); return; }
    if (!zoomForm.link.trim()) { toast.error('Zoom link is required.'); return; }
    const chIdx = zoomModal.chIdx;
    const chServerId = chapters[chIdx]?.serverId;
    if (!chServerId) { toast.error('Please save the chapter first.'); return; }
    const isEdit = zoomModal.editIdx != null;
    const existingZoom = isEdit ? chapters[chIdx].zoomLinks[zoomModal.editIdx] : null;
    const order = isEdit ? zoomModal.editIdx + 1 : (chapters[chIdx].zoomLinks?.length || 0) + 1;
    const itemBase = {
      _id: isEdit ? existingZoom._id : Date.now(),
      serverId: isEdit ? existingZoom.serverId : null,
      title: zoomForm.title.trim(),
      link: zoomForm.link.trim(),
    };
    const payload = {
      courseId, chapterId: chServerId,
      title: itemBase.title, desc: '',
      video_type: 'zoom_link',
      videoUrl: itemBase.link,
      order, isPreview: false, status: 'active',
    };
    const apiCall = itemBase.serverId
      ? apiServiceHandler('PUT', `topic/update/${itemBase.serverId}`, payload)
      : apiServiceHandler('POST', 'topic/create', payload);
    apiCall
      .then(res => {
        const serverId = itemBase.serverId || res?.data?._id || null;
        const item = { ...itemBase, serverId };
        setChapters(prev => {
          const c = [...prev];
          const zoomLinks = [...(c[chIdx].zoomLinks || [])];
          if (isEdit) {
            zoomLinks[zoomModal.editIdx] = item;
          } else {
            zoomLinks.push(item);
          }
          c[chIdx] = { ...c[chIdx], zoomLinks };
          return c;
        });
        closeZoomModal();
        toast.success(isEdit ? 'Zoom link updated.' : 'Zoom link saved.');
      })
      .catch(err => toast.error(err?.message || 'Failed to save zoom link.'));
  }

  /* ── Certificate templates ─────────────────────────────── */
  const [certTemplates, setCertTemplates]       = useState([]);
  const [certTemplateId, setCertTemplateId]     = useState('');

  useEffect(() => {
    apiServiceHandler('GET', 'certificate-template/list')
      .then(res => setCertTemplates(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  /* ── Load existing course for edit ──────────────────────── */
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    Promise.all([
      apiServiceHandler('GET', `course/edit/${editId}`),
      apiServiceHandler('GET', `chapter/list?courseId=${editId}`),
      apiServiceHandler('GET', `topic/list?courseId=${editId}`),
    ])
      .then(([courseRes, chaptersRes, topicsRes]) => {
        const c = courseRes?.data;
        if (!c) return;

        // ── Pre-fill form ──────────────────────────────────
        const catId = c.catId?._id ?? c.catId ?? null;
        const subCatIds = Array.isArray(c.subCatIds)
          ? c.subCatIds.map(s => s._id ?? s)
          : [];
        const tagIds = Array.isArray(c.tagIds)
          ? c.tagIds.map(t => t._id ?? t)
          : [];
        const aptitudeSelectedQuestionIds = Array.isArray(c.aptitudeSelectedQuestionIds)
          ? c.aptitudeSelectedQuestionIds.map(q => q._id ?? q)
          : [];

        setForm({
          title: c.title || '',
          desc: c.desc || '',
          status: c.status || 'draft',
          duration_hr: c.duration_hr || '0',
          duration_min: c.duration_min || '00',
          selectedCatIds: catId ? [catId, ...subCatIds] : subCatIds,
          selectedTagIds: tagIds,
          difficultyLevel: c.level || 'beginner',
          enableReview: c.enable_review !== undefined ? c.enable_review : true,
          qnaEnabled: c.qna_enabled !== undefined ? c.qna_enabled : false,
          contentDrip: c.content_drip !== undefined ? c.content_drip : false,
          aptitudeEnabled: c.aptitudeEnabled !== undefined ? c.aptitudeEnabled : false,
          aptitudeContext: c.aptitudeContext || '',
          aptitudeSelectedQuestionIds,
          maxStudents: c.max_students ? String(c.max_students) : '',
          what_will_learn: c.what_will_learn || '',
          target_audience: c.target_audience || '',
          materials_included: c.materials_included || '',
          requirements: c.requirements || '',
        });

        if (c.certificate_template_id) {
          setCertTemplateId(String(c.certificate_template_id._id ?? c.certificate_template_id));
        }
        if (c.course_image) setExistingCourseImage(c.course_image);
        if (c.intro_video) setExistingIntroVideo(c.intro_video);

        // Eagerly load the selected aptitude questions (with answers) so
        // Step 1's Aptitude Test card can list them without requiring the
        // admin to open the Manage Aptitude Test modal first.
        if (aptitudeSelectedQuestionIds.length > 0) {
          loadAptitudeQA(editId, aptitudeSelectedQuestionIds);
        }

        // ── Reconstruct chapters with their topics ─────────
        const allTopics = Array.isArray(topicsRes?.data) ? topicsRes.data : [];
        const rawChapters = Array.isArray(chaptersRes?.data) ? chaptersRes.data : [];

        const builtChapters = rawChapters
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(ch => {
            const chTopics = allTopics.filter(t => String(t.chapterId) === String(ch._id));

            const lessons = chTopics
              .filter(t => t.video_type === 'lesson')
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map(t => ({
                _id: Date.now() + Math.floor(Math.random() * 1e6),
                serverId: t._id,
                name: t.title || '',
                content: t.desc || '',
                imageUrl: t.imageUrl || '',
                videoUrl: t.videoUrl || '',
                playbackHour: t.duration_hr || '0',
                playbackMin: t.duration_min || '0',
                playbackSec: '0',
                order: t.order ?? 0,
              }));

            const quizzes = chTopics
              .filter(t => t.video_type === 'quiz')
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map(t => ({
                _id: Date.now() + Math.floor(Math.random() * 1e6),
                serverId: t._id,
                title: t.title || '',
                summary: t.desc || '',
                settings: t.quizSettings || {},
                order: t.order ?? 0,
              }));

            const zoomLinks = chTopics
              .filter(t => t.video_type === 'zoom_link')
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map(t => ({
                _id: Date.now() + Math.floor(Math.random() * 1e6),
                serverId: t._id,
                title: t.title || '',
                link: t.videoUrl || '',
                order: t.order ?? 0,
              }));

            const assignments = chTopics
              .filter(t => t.video_type === 'assignment')
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map(t => ({
                _id: Date.now() + Math.floor(Math.random() * 1e6),
                serverId: t._id,
                title: t.title || '',
                fileName: t.attachments?.[0]?.name || '',
                fileUrl: t.attachments?.[0]?.url || '',
                order: t.order ?? 0,
              }));

            return {
              _id: Date.now() + Math.floor(Math.random() * 1e6),
              serverId: ch._id,
              title: ch.title || '',
              desc: ch.desc || '',
              order: ch.order ?? 1,
              status: ch.status || 'active',
              topics: [],
              lessons,
              quizzes,
              zoomLinks,
              assignments,
              saved: true,
              collapsed: false,
            };
          });

        setChapters(builtChapters);
      })
      .catch(() => toast.error('Failed to load course data.'))
      .finally(() => setLoadingEdit(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* ── Assignment modal ────────────────────────────────────── */
  const [assignModal, setAssignModal] = useState(null); // { chIdx } | null
  const [assignForm, setAssignForm] = useState({ title: '', file: null });

  function openAssignModal(chIdx) {
    setAssignForm({ title: '', file: null });
    setAssignModal({ chIdx });
  }
  function closeAssignModal() { setAssignModal(null); }
  function saveAssign() {
    if (!assignForm.title.trim()) { toast.error('Title is required.'); return; }
    const chIdx = assignModal.chIdx;
    const chServerId = chapters[chIdx]?.serverId;
    if (!chServerId) { toast.error('Please save the chapter first.'); return; }
    const isEdit = assignModal.editIdx != null;
    const existingAssign = isEdit ? chapters[chIdx].assignments[assignModal.editIdx] : null;
    if (!isEdit && !assignForm.file) { toast.error('Please upload a file.'); return; }
    const order = isEdit ? assignModal.editIdx + 1 : (chapters[chIdx].assignments?.length || 0) + 1;
    const itemBase = {
      _id: isEdit ? existingAssign._id : Date.now(),
      serverId: isEdit ? existingAssign.serverId : null,
      title: assignForm.title.trim(),
      fileName: assignForm.file ? assignForm.file.name : (existingAssign?.fileName || ''),
      fileUrl: isEdit ? existingAssign.fileUrl : null,
    };
    const fd = new FormData();
    fd.append('courseId', courseId);
    fd.append('chapterId', chServerId);
    fd.append('title', itemBase.title);
    fd.append('desc', '');
    fd.append('video_type', 'assignment');
    fd.append('order', String(order));
    fd.append('isPreview', 'false');
    fd.append('status', 'active');
    if (assignForm.file) fd.append('assignment_file', assignForm.file);
    const apiCall = itemBase.serverId
      ? apiServiceHandler('PUT', `topic/update/${itemBase.serverId}`, { title: itemBase.title, desc: '', video_type: 'assignment', order, status: 'active' })
      : apiServiceHandler('POST', 'topic/create', fd);
    apiCall
      .then(res => {
        const serverId = itemBase.serverId || res?.data?._id || null;
        const fileUrl = itemBase.fileUrl || res?.data?.attachments?.[0]?.url || null;
        const item = { ...itemBase, serverId, fileUrl };
        setChapters(prev => {
          const c = [...prev];
          const assignments = [...(c[chIdx].assignments || [])];
          if (isEdit) {
            assignments[assignModal.editIdx] = item;
          } else {
            assignments.push(item);
          }
          c[chIdx] = { ...c[chIdx], assignments };
          return c;
        });
        closeAssignModal();
        toast.success(isEdit ? 'Assignment updated.' : 'Assignment saved.');
      })
      .catch(err => toast.error(err?.message || 'Failed to save assignment.'));
  }

  /* ── Load categories and tags ────────────────────────────── */
  useEffect(() => {
    Promise.all([
      apiServiceHandler('GET', 'course-category/list-all'),
      apiServiceHandler('GET', 'course-subcategory/list'),
    ]).then(([catRes, subRes]) => {
      const cats = Array.isArray(catRes?.data) ? catRes.data : [];
      const subs = Array.isArray(subRes?.data) ? subRes.data : [];
      const catIds = new Set(cats.map(c => String(c._id)));
      const unified = [
        ...cats.map(c => ({
          _id: String(c._id),
          name: c.title || c.name,
          parentId: c.parentId ? String(c.parentId) : null,
        })),
        ...subs
          .filter(s => !catIds.has(String(s._id)))
          .map(s => ({
            _id: String(s._id),
            name: s.name,
            parentId: s.categoryId?._id ? String(s.categoryId._id) : (s.categoryId ? String(s.categoryId) : null),
          })),
      ];
      setAllCategories(unified);
    }).catch(() => {});
    apiServiceHandler('GET', 'tags/list')
      .then(res => setTags(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  /* ── Category tree for display ─────────────────────────── */
  const catTree = useMemo(() =>
    buildTree(allCategories.map(c => ({
      _id: c._id,
      name: c.name,
      parentId: c.parentId || null,
    }))),
  [allCategories]);

  const flatCategories = useMemo(() => flattenTree(catTree), [catTree]);

  const filteredCats = useMemo(() =>
    catSearch.trim()
      ? flatCategories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
      : [],
    [flatCategories, catSearch]
  );

  const filteredTags = useMemo(() =>
    tagSearch.trim()
      ? tags.filter(t => t.title.toLowerCase().includes(tagSearch.toLowerCase()))
      : tags,
    [tags, tagSearch]
  );

  function handleTitleChange(val) {
    setForm(prev => ({ ...prev, title: val }));
    if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
  }

  function toggleCatExpand(id) {
    setCollapsedCatIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  /* ── Add new tag inline ──────────────────────────────────── */
  async function handleAddTag() {
    const title = newTagInput.trim();
    if (!title) return;
    setAddingTag(true);
    try {
      const res = await apiServiceHandler('POST', 'tags/create', { title });
      const created = res?.data;
      if (created?._id) {
        setTags(prev => [...prev, created]);
        setForm(prev => ({ ...prev, selectedTagIds: [...prev.selectedTagIds, created._id] }));
        setNewTagInput('');
        setShowTagPopup(false);
        toast.success('Tag added.');
      }
    } catch {
      toast.error('Failed to add tag.');
    } finally {
      setAddingTag(false);
    }
  }

  /* ── Add new category inline ─────────────────────────────── */
  async function handleAddCategory() {
    const title = newCatInput.trim();
    if (!title) return;
    setAddingCat(true);
    try {
      const res = await apiServiceHandler('POST', 'course-category/create', {
        title,
        parentId: newCatParent || null,
        status: 'active',
      });
      const created = res?.data;
      if (created?._id) {
        const normalized = {
          _id: String(created._id),
          name: created.title || created.name,
          parentId: created.parentId ? String(created.parentId) : null,
        };
        setAllCategories(prev => [...prev, normalized]);
        setForm(prev => ({ ...prev, selectedCatIds: [...prev.selectedCatIds, String(created._id)] }));
        setNewCatInput('');
        setNewCatParent('');
        setShowCatPopup(false);
        toast.success('Category added.');
      }
    } catch {
      toast.error('Failed to add category.');
    } finally {
      setAddingCat(false);
    }
  }

  function setField(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function toggleCat(id) {
    setForm(prev => ({
      ...prev,
      selectedCatIds: prev.selectedCatIds.includes(id)
        ? prev.selectedCatIds.filter(x => x !== id)
        : [...prev.selectedCatIds, id],
    }));
  }

  function toggleTag(id) {
    setForm(prev => ({
      ...prev,
      selectedTagIds: prev.selectedTagIds.includes(id)
        ? prev.selectedTagIds.filter(x => x !== id)
        : [...prev.selectedTagIds, id],
    }));
  }

  /* ── Chapter operations ──────────────────────────────────── */
  function addChapter() { setChapters(prev => [...prev, newChapter(prev.length + 1)]); }

  async function removeChapter(idx) {
    const ch = chapters[idx];
    if (ch?.serverId) {
      try {
        await apiServiceHandler('GET', `chapter/delete/${ch.serverId}`);
      } catch (err) {
        toast.error(err?.message || 'Failed to delete chapter.');
        return;
      }
    }
    setChapters(prev => prev.filter((_, i) => i !== idx));
  }

  async function goToNextStep() {
    if (step === 1) {
      saveStep1AndProceed(2);
      return;
    }

    if (step === 2) {
      if (!validateCurriculumBeforeProceed()) return;

      // Silent safety-net: ensure order is persisted even if reorder auto-save was skipped
      await Promise.allSettled(
        chapters.map((ch, idx) => {
          if (!ch.serverId) return Promise.resolve();
          return apiServiceHandler('PUT', `chapter/update/${ch.serverId}`, {
            courseId,
            title: ch.title.trim(),
            desc: ch.desc?.trim() || '',
            order: idx + 1,
            status: ch.status || 'active',
            isPublished: true,
            totalTopics: (ch.lessons?.length || 0) + (ch.quizzes?.length || 0) +
                         (ch.zoomLinks?.length || 0) + (ch.assignments?.length || 0),
          });
        })
      );

      setStep(3);
    }
  }

  async function saveChapter(idx) {
    const ch = chapters[idx];
    if (!ch.title.trim()) { toast.error('Chapter title is required.'); return; }
    if (!courseId) { toast.error('Please save course basic info (Step 1) first.'); return; }
    setSavingChapterIdx(idx);
    try {
      const payload = {
        courseId,
        title: ch.title.trim(),
        desc: ch.desc.trim(),
        order: idx + 1,
        status: ch.status || 'active',
        isPublished: true,
        totalTopics: (ch.lessons?.length || 0) + (ch.quizzes?.length || 0) +
                     (ch.zoomLinks?.length || 0) + (ch.assignments?.length || 0),
      };
      let serverId = ch.serverId;
      if (serverId) {
        await apiServiceHandler('PUT', `chapter/update/${serverId}`, payload);
      } else {
        const res = await apiServiceHandler('POST', 'chapter/create', payload);
        serverId = res?.data?._id;
      }
      setChapters(prev => {
        const c = [...prev];
        c[idx] = { ...c[idx], serverId, saved: true };
        return c;
      });
      toast.success(ch.serverId ? 'Chapter updated.' : 'Chapter saved.');
    } catch (err) {
      toast.error(err?.message || 'Failed to save chapter.');
    } finally {
      setSavingChapterIdx(null);
    }
  }

  function editChapter(idx) {
    setChapters(prev => { const ch = [...prev]; ch[idx] = { ...ch[idx], saved: false }; return ch; });
  }
  function toggleChapterCollapse(idx) {
    setChapters(prev => { const ch = [...prev]; ch[idx] = { ...ch[idx], collapsed: !ch[idx].collapsed }; return ch; });
  }
  function updateChapter(idx, key, val) {
    setChapters(prev => { const c = [...prev]; c[idx] = { ...c[idx], [key]: val }; return c; });
  }
  function toggleChapter(idx) {
    setChapters(prev => { const c = [...prev]; c[idx] = { ...c[idx], isOpen: !c[idx].isOpen }; return c; });
  }
  function toggleTopics(idx) {
    setChapters(prev => { const c = [...prev]; c[idx] = { ...c[idx], isTopicsOpen: !c[idx].isTopicsOpen }; return c; });
  }
  function toggleTopic(chIdx, tIdx) {
    setChapters(prev => {
      const c = [...prev];
      const topics = [...c[chIdx].topics];
      topics[tIdx] = { ...topics[tIdx], isOpen: !topics[tIdx].isOpen };
      c[chIdx] = { ...c[chIdx], topics };
      return c;
    });
  }

  /* ── Topic operations ────────────────────────────────────── */
  function addTopic(chIdx) {
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], topics: [...c[chIdx].topics, newTopic(c[chIdx].topics.length + 1)] };
      return c;
    });
  }
  function removeTopic(chIdx, tIdx) {
    setChapters(prev => {
      const c = [...prev];
      c[chIdx] = { ...c[chIdx], topics: c[chIdx].topics.filter((_, i) => i !== tIdx) };
      return c;
    });
  }
  function updateTopic(chIdx, tIdx, key, val) {
    setChapters(prev => {
      const c = [...prev];
      const topics = [...c[chIdx].topics];
      topics[tIdx] = { ...topics[tIdx], [key]: val };
      c[chIdx] = { ...c[chIdx], topics };
      return c;
    });
  }

  /* ── Save course basic info (Step 1 fields) via API ──────── */
  // Shared by the "Next" button (saveStep1AndProceed) and the Aptitude Test
  // modal's Save action, which must persist the course before it can attach
  // aptitude questions to it. Returns the resolved courseId, or null on
  // validation/request failure (errors are already toast'd to the user).
  async function saveCourseBasicInfo(overrides = {}) {
    const e = {};
    if (!form.title.trim()) e.title = 'Course title is required.';
    if (!form.desc.trim()) e.desc = 'Description is required.';
    if (Object.keys(e).length) {
      setErrors(prev => ({ ...prev, ...e }));
      toast.error('Please fill in the course title and description before proceeding.');
      return null;
    }
    setErrors({});
    setSavingStep1(true);
    try {
      const inProgressStatus = editId ? (form.status || 'draft') : 'deleted';
      const aptitudeSelectedQuestionIds = overrides.selectedQuestionIds ?? form.aptitudeSelectedQuestionIds;
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('desc', form.desc.trim());
      fd.append('status', inProgressStatus);
      fd.append('duration_hr', form.duration_hr || '0');
      fd.append('duration_min', form.duration_min || '00');
      fd.append('level', form.difficultyLevel || 'beginner');
      fd.append('enable_review', String(form.enableReview));
      fd.append('qna_enabled', String(form.qnaEnabled));
      fd.append('max_students', form.maxStudents || '0');
      if (form.selectedCatIds.length > 0) fd.append('catId', form.selectedCatIds[0]);
      fd.append('subCatIds', JSON.stringify(form.selectedCatIds.slice(1)));
      fd.append('tagIds', JSON.stringify(form.selectedTagIds));
      fd.append('aptitudeEnabled', String(form.aptitudeEnabled));
      fd.append('aptitudeContext', form.aptitudeContext || '');
      fd.append('aptitudeSelectedQuestionIds', JSON.stringify(aptitudeSelectedQuestionIds || []));
      if (featuredImageFile) fd.append('course_image', featuredImageFile);
      if (introVideoFile) fd.append('intro_video', introVideoFile);

      if (courseId) {
        await apiServiceHandler('PUT', `course/update/${courseId}`, fd);
        toast.success('Course info updated.');
        return courseId;
      } else {
        const res = await apiServiceHandler('POST', 'course/create', fd);
        const id = res?.data?._id;
        if (id) {
          setCourseId(id);
          toast.success('Course basic info saved.');
          return id;
        } else {
          toast.error('Failed to save course info. Please try again.');
          return null;
        }
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save course info. Please try again.');
      return null;
    } finally {
      setSavingStep1(false);
    }
  }

  async function saveStep1AndProceed(targetStep = 2) {
    const id = await saveCourseBasicInfo();
    if (id) setStep(targetStep);
  }

  function handleStepClick(targetStep) {
    // Always validate & save/update when leaving step 1 going forward
    if (step === 1 && targetStep > 1) {
      saveStep1AndProceed(targetStep);
      return;
    }

    if (step === 2 && targetStep > 2) {
      if (!validateCurriculumBeforeProceed()) return;
    }

    setStep(targetStep);
  }

  function validateCurriculumBeforeProceed() {
    const chapterErrors = {};
    const hasUnsavedChapter = chapters.some(ch => !ch?.saved);

    chapters.forEach((ch, i) => {
      const chapterTitle = typeof ch?.title === 'string' ? ch.title.trim() : '';
      if (!chapterTitle) {
        chapterErrors[`chTitle_${i}`] = `Chapter ${i + 1} title is required.`;
      }
    });

    if (Object.keys(chapterErrors).length) {
      setErrors(prev => ({ ...prev, ...chapterErrors }));
      toast.error('Please add a title for each chapter before going to the next step.');
      return false;
    }

    if (hasUnsavedChapter) {
      toast.error('Please save or remove unsaved chapters before going to the next step.');
      return false;
    }

    return true;
  }

  /* ── Validation ──────────────────────────────────────────── */
  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Course title is required.';
    if (!form.desc.trim()) e.desc = 'Description is required.';
    chapters.forEach((ch, i) => {
      const chapterTitle = typeof ch?.title === 'string' ? ch.title.trim() : '';
      if (!chapterTitle) e[`chTitle_${i}`] = `Chapter ${i + 1} title is required.`;
    });
    return e;
  }

  /* ── Submit ──────────────────────────────────────────────── */
  async function handleSubmit(publishStatus) {
    const e = {};
    chapters.forEach((ch, i) => {
      const chapterTitle = typeof ch?.title === 'string' ? ch.title.trim() : '';
      if (!chapterTitle) e[`chTitle_${i}`] = `Chapter ${i + 1} title is required.`;
    });
    if (Object.keys(e).length) { setErrors(e); toast.error('Please fix the errors before submitting.'); return; }
    setErrors({});
    setSubmitting(true);
    try {
      let finalCourseId = courseId;

      // Build full FormData for create / final-update
      const buildFd = (status) => {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('desc', form.desc.trim());
        fd.append('status', status);
        fd.append('duration_hr', form.duration_hr || '0');
        fd.append('duration_min', form.duration_min || '00');
        fd.append('level', form.difficultyLevel || 'beginner');
        fd.append('enable_review', String(form.enableReview));
        fd.append('qna_enabled', String(form.qnaEnabled));
        fd.append('max_students', form.maxStudents || '0');
          if (form.selectedCatIds.length > 0) fd.append('catId', form.selectedCatIds[0]);
        fd.append('subCatIds', JSON.stringify(form.selectedCatIds.slice(1)));
        fd.append('tagIds', JSON.stringify(form.selectedTagIds));
        fd.append('aptitudeEnabled', String(form.aptitudeEnabled));
        fd.append('aptitudeContext', form.aptitudeContext || '');
        fd.append('aptitudeSelectedQuestionIds', JSON.stringify(form.aptitudeSelectedQuestionIds || []));
        fd.append('totalChapters', String(chapters.length));
        fd.append('what_will_learn', form.what_will_learn || '');
        fd.append('target_audience', form.target_audience || '');
        fd.append('materials_included', form.materials_included || '');
        fd.append('requirements', form.requirements || '');
        if (certTemplateId) fd.append('certificate_template_id', certTemplateId);
        if (featuredImageFile) fd.append('course_image', featuredImageFile);
        if (introVideoFile) fd.append('intro_video', introVideoFile);
        return fd;
      };

      if (!finalCourseId) {
        const res = await apiServiceHandler('POST', 'course/create', buildFd(publishStatus));
        finalCourseId = res?.data?._id;
      } else {
        await apiServiceHandler('PUT', `course/update/${finalCourseId}`, buildFd(publishStatus));
      }

      // In ADD mode only: bulk-create all chapters + topics.
      // In EDIT mode chapters are already persisted individually (saveChapter / saveLesson etc.),
      // so we must NOT re-create them here — doing so duplicates existing chapters and
      // re-introduces deleted ones that were already soft-deleted on the server.
      if (finalCourseId && !editId) {
        const chapterResults = await Promise.all(chapters.map((ch, idx) =>
          apiServiceHandler('POST', 'chapter/create', {
            courseId: finalCourseId, title: ch.title.trim(), desc: ch.desc.trim(),
            order: ch.order ?? idx + 1, status: ch.status ?? 'active',
            isPublished: true, totalTopics: ch.topics.length,
          })
        ));
        const topicPromises = [];
        chapterResults.forEach((chRes, chIdx) => {
          const chapterId = chRes?.data?._id;
          if (chapterId) {
            chapters[chIdx].topics.forEach((tp, tIdx) => {
              topicPromises.push(
                apiServiceHandler('POST', 'topic/create', {
                  chapterId, courseId: finalCourseId,
                  title: tp.title.trim(), order: tp.order ?? tIdx + 1,
                  type: tp.type, status: tp.status ?? 'active',
                  zoom_link_url: tp.zoom_link_url ?? '',
                })
              );
            });
          }
        });
        await Promise.all(topicPromises);
      }

      toast.success(editId ? 'Course updated successfully.' : 'Course created successfully.');
      router.push('/superadmin/course-builder');
    } catch {
      toast.error('Failed to create course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Lesson Modal ────────────────────────────────────────────── */
  function LessonModal() {
    if (!lessonModal) return null;
    return (
      <div className={s.modalOverlay}>
        <div className={s.modalBox}>
          {/* Header */}
          <div className={s.modalHeader}>
            <div className={s.modalHeaderLeft}>
              <span className={s.modalType}>Lesson</span>
              <span className={s.modalTypeSep}>|</span>
              <span className={s.modalTopic}>Topic: {lessonModal.topicName}</span>
            </div>
            <button type="button" className={s.modalClose} onClick={closeLessonModal}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className={s.modalBody}>
            {/* Left column */}
            <div className={s.modalLeft}>
              {/* Name */}
              <div className={s.modalFormGroup}>
                <label className={s.modalLabel}>
                  Name
                  <span className={s.modalAiIcon} title="AI assist">✦</span>
                </label>
                <input
                  className={s.modalInput}
                  type="text"
                  placeholder="Enter Lesson Name"
                  value={lessonForm.name}
                  onChange={e => setLessonField('name', e.target.value)}
                />
              </div>

              {/* Content */}
              <div className={s.modalFormGroup}>
                <label className={s.modalLabel}>
                  Content
                  <span className={s.modalAiIcon} title="AI assist">✦</span>
                </label>
                <textarea
                  className={s.modalTextarea}
                  rows={10}
                  placeholder="Enter lesson content…"
                  value={lessonForm.content}
                  onChange={e => setLessonField('content', e.target.value)}
                />
              </div>
            </div>

            {/* Right column */}
            <div className={s.modalRight}>
              {/* Featured Image */}
              <div className={s.modalSideSection}>
                <div className={s.modalSideTitle}>Featured Image</div>
                <div className={s.modalUploadArea}>
                  {lessonForm.featuredImage ? (
                    <img
                      src={URL.createObjectURL(lessonForm.featuredImage)}
                      alt="preview"
                      style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
                    />
                  ) : lessonForm.imageUrl ? (
                    <img
                      src={`${API_URL}${lessonForm.imageUrl}`}
                      alt="featured"
                      style={{ width: '100%', maxHeight: 90, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }}
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                  )}
                  <label className={s.modalUploadBtn}>
                    {lessonForm.featuredImage || lessonForm.imageUrl ? 'Change Image' : 'Upload Image'}
                    <input type="file" accept="image/*" hidden
                      onChange={e => setLessonField('featuredImage', e.target.files[0])} />
                  </label>
                  <span className={s.modalUploadNote}>JPEG, PNG, GIF, and WebP formats, up to 400 MB</span>
                  {lessonForm.featuredImage ? (
                    <>
                      <span className={s.modalFileName}>{lessonForm.featuredImage.name}</span>
                      <button type="button" className={s.modalAddFromUrl}
                        onClick={() => window.open(URL.createObjectURL(lessonForm.featuredImage), '_blank')}>
                        🖼 View in new tab
                      </button>
                    </>
                  ) : lessonForm.imageUrl ? (
                    <>
                      <span className={s.modalFileName}>{lessonForm.imageUrl.split('/').pop()}</span>
                      <button type="button" className={s.modalAddFromUrl}
                        onClick={() => window.open(`${API_URL}${lessonForm.imageUrl}`, '_blank')}>
                        🖼 View in new tab
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Video */}
              <div className={s.modalSideSection}>
                <div className={s.modalSideTitle}>Video</div>
                <div className={s.modalUploadArea}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28" strokeWidth="1.5">
                    <rect x="2" y="4" width="14" height="16" rx="2"/>
                    <path d="M16 9l6-3v12l-6-3V9z"/>
                  </svg>
                  <label className={s.modalUploadBtn}>
                    {lessonForm.video || lessonForm.videoUrl ? 'Change Video' : 'Upload Video'}
                    <input type="file" accept="video/*" hidden
                      onChange={e => {
                        const file = pickLessonVideoFile(e.target.files[0]);
                        if (!file) { e.target.value = ''; return; }
                        setLessonField('video', file);
                        setLessonField('videoUrl', '');
                      }} />
                  </label>
                  <span className={s.modalUploadNote}>MP4, and WebM formats, up to {MAX_LESSON_VIDEO_MB} MB</span>
                  {lessonForm.video ? (
                    <>
                      <span className={s.modalFileName}>{lessonForm.video.name}</span>
                      <button
                        type="button"
                        className={s.modalAddFromUrl}
                        onClick={() => window.open(URL.createObjectURL(lessonForm.video), '_blank')}
                      >
                        ▶ Play in new tab
                      </button>
                    </>
                  ) : lessonForm.videoUrl ? (
                    <>
                      <span className={s.modalFileName}>{lessonForm.videoUrl.split('/').pop()}</span>
                      <button
                        type="button"
                        className={s.modalAddFromUrl}
                        onClick={() => window.open(`${API_URL}${lessonForm.videoUrl}`, '_blank')}
                      >
                        ▶ Play in new tab
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={s.modalFooter}>
            <button type="button" className={s.modalBtnCancel} onClick={closeLessonModal}>Cancel</button>
            <button type="button" className={s.modalBtnSave} onClick={saveLesson}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz Modal ──────────────────────────────────────────────── */
  function QuizModal() {
    if (!quizModal) return null;

    /* ── Settings tab content ───────────────────── */
    function SettingsPanel() {
      const InfoIcon = (
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" style={{ color: '#9ca3af', flexShrink: 0 }}>
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
      );
      const Toggle = ({ checked, onChange }) => (
        <label className={s.qsToggle}>
          <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
          <span className={s.qsToggleSlider} />
        </label>
      );
      const ChevronIcon = ({ open }) => (
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      );

      return (
        <div className={s.qsWrap}>
          <div className={s.qsSection}>
            <button type="button" className={s.qsSectionHeader}
              onClick={() => setQS('basicOpen', !quizSettings.basicOpen)}>
              <span>Basic Settings</span>
              <ChevronIcon open={quizSettings.basicOpen} />
            </button>
            {quizSettings.basicOpen && (
              <div className={s.qsSectionBody}>
                <div className={s.qsRow}>
                  <label className={s.qsLabel}>Time Limit</label>
                  <div className={s.qsTimeLimitRow}>
                    <input className={s.qsInput} type="number" min="0"
                      value={quizSettings.timeLimit}
                      onChange={e => setQS('timeLimit', e.target.value)} />
                    <select className={s.qsSelect} value={quizSettings.timeUnit}
                      onChange={e => setQS('timeUnit', e.target.value)}>
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Seconds">Seconds</option>
                    </select>
                  </div>
                </div>
                <div className={s.qsToggleRow}>
                  <span className={s.qsLabel}>Hide Quiz Time</span>
                  <Toggle checked={quizSettings.hideQuizTime} onChange={v => setQS('hideQuizTime', v)} />
                </div>
                <div className={s.qsRow}>
                  <label className={s.qsLabelRow}>Attempts Allowed {InfoIcon}</label>
                  <input className={s.qsInput} type="number" min="0"
                    value={quizSettings.attemptsAllowed}
                    onChange={e => setQS('attemptsAllowed', e.target.value)} />
                </div>
                <div className={s.qsRow}>
                  <label className={s.qsLabelRow}>Passing Grade {InfoIcon}</label>
                  <div className={s.qsInputSuffix}>
                    <input className={s.qsInput} type="number" min="0" max="100"
                      value={quizSettings.passingGrade}
                      onChange={e => setQS('passingGrade', e.target.value)} />
                    <span className={s.qsSuffix}>%</span>
                  </div>
                </div>
                <div className={s.qsRow}>
                  <label className={s.qsLabelRow}>Max Question Allowed to Answer {InfoIcon}</label>
                  <input className={s.qsInput} type="number" min="0"
                    value={quizSettings.maxQuestions}
                    onChange={e => setQS('maxQuestions', e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <div className={s.qsSection}>
            <button type="button" className={s.qsSectionHeader}
              onClick={() => setQS('advancedOpen', !quizSettings.advancedOpen)}>
              <span>Advanced Settings</span>
              <ChevronIcon open={quizSettings.advancedOpen} />
            </button>
            {quizSettings.advancedOpen && (
              <div className={s.qsSectionBody}>
                <div className={s.qsToggleRow}>
                  <span className={s.qsLabelRow}>Quiz Auto Start {InfoIcon}</span>
                  <Toggle checked={quizSettings.quizAutoStart} onChange={v => setQS('quizAutoStart', v)} />
                </div>
                <div className={s.qsDoubleRow}>
                  <div className={s.qsRow}>
                    <label className={s.qsLabel}>Question Layout</label>
                    <select className={s.qsSelect} value={quizSettings.questionLayout}
                      onChange={e => setQS('questionLayout', e.target.value)}>
                      <option value="single">Single question</option>
                      <option value="all">All questions</option>
                    </select>
                  </div>
                  <div className={s.qsRow}>
                    <label className={s.qsLabel}>Question Order</label>
                    <select className={s.qsSelect} value={quizSettings.questionOrder}
                      onChange={e => setQS('questionOrder', e.target.value)}>
                      <option value="random">Random</option>
                      <option value="sequential">Sequential</option>
                    </select>
                  </div>
                </div>
                <div className={s.qsToggleRow}>
                  <span className={s.qsLabel}>Hide Question Number</span>
                  <Toggle checked={quizSettings.hideQuestionNumber} onChange={v => setQS('hideQuestionNumber', v)} />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={s.modalOverlay}>
        <div className={s.quizModalBox}>
          {/* Header */}
          <div className={s.quizModalHeader}>
            <div className={s.modalHeaderLeft}>
              <span className={s.modalType}>{quizModal.editIdx != null ? 'Edit Quiz' : 'Quiz'}</span>
              <span className={s.modalTypeSep}>|</span>
              <span className={s.modalTopic}>Topic: {quizModal.topicName}</span>
            </div>
            <div className={s.quizModalTabs}>
              <button type="button"
                className={`${s.quizTab} ${quizTab === 'details' ? s.quizTabActive : ''}`}
                onClick={() => setQuizTab('details')}>
                Question Details
              </button>
              <button type="button"
                className={`${s.quizTab} ${quizTab === 'settings' ? s.quizTabActive : ''}`}
                onClick={() => setQuizTab('settings')}>
                Settings
              </button>
            </div>
            <button type="button" className={s.modalClose} onClick={closeQuizModal}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          {quizTab === 'details' ? (
            <div className={s.quizDetailsBody}>

              {/* ── Left: Generated QA pool ── */}
              <div className={s.quizModalLeft}>
                <div className={s.quizColHeader}>
                  <span className={s.quizColTitle}>Generated QA</span>
                  <span className={s.quizColBadge}>{quizQAPool.length}</span>
                </div>
                <div className={s.quizQAList}>
                  {quizQALoading ? (
                    <div className={s.quizQAEmpty}>Loading questions…</div>
                  ) : quizQAPool.length === 0 ? (
                    <div className={s.quizQAEmpty}>
                      {quizQAHasGenerated
                        ? 'All generated questions are selected.'
                        : 'Click Generate in the right panel to create questions using AI.'}
                    </div>
                  ) : (
                    quizQAPool.map((q, i) => {
                      const id = String(q._id);
                      const open = expandedQIds.has(id);
                      return (
                        <div key={id} className={s.quizQAAccordion}>
                          <div className={s.quizQAAccordionHead}
                            onClick={() => {
                              setQuizQAPool(prev => prev.filter(x => String(x._id) !== id));
                              setQuizQASelected(prev => sortByDifficulty([...prev, q]));
                            }}>
                            <span className={s.quizQANum}>{i + 1}</span>
                            <span className={s.quizQAText}>{q.question}</span>
                            <span className={`${s.quizQADiff} ${s[`quizQADiff_${q.difficulty}`]}`}>
                              {DIFF_LABEL[q.difficulty] || 'B'}
                            </span>
                            <button type="button" className={s.quizQAChevBtn}
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedQIds(prev => {
                                  const next = new Set(prev);
                                  next.has(id) ? next.delete(id) : next.add(id);
                                  return next;
                                });
                              }}>
                              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                                style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}>
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                          {open && q.answer && (
                            <div className={s.quizQAAccordionBody}>
                              <span className={s.quizQAAnswerLabel}>Answer</span>
                              <p className={s.quizQAAnswer}>{q.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Middle: Selected QA ── */}
              <div className={s.quizModalMiddle}>
                <div className={s.quizColHeader}>
                  <span className={s.quizColTitle}>Selected Questions</span>
                  <span className={s.quizColBadge}>{quizQASelected.length}</span>
                </div>
                <div className={s.quizQAList}>
                  {quizQASelected.length === 0 ? (
                    <div className={s.quizMiddleEmpty}>
                      <svg width="64" height="64" viewBox="0 0 90 90" fill="none">
                        <circle cx="45" cy="45" r="40" fill="#f0f1f5"/>
                        <rect x="22" y="28" width="46" height="6" rx="3" fill="#d1d5db"/>
                        <rect x="22" y="40" width="36" height="5" rx="2.5" fill="#e5e7eb"/>
                        <circle cx="18" cy="43" r="4" fill="#d1d5db"/>
                        <rect x="22" y="51" width="40" height="5" rx="2.5" fill="#e5e7eb"/>
                        <circle cx="18" cy="54" r="4" fill="#d1d5db"/>
                      </svg>
                      <p className={s.quizEmptyText}>Click questions on the left to add them here.</p>
                    </div>
                  ) : (
                    quizQASelected.map((q, i) => {
                      const id = String(q._id);
                      const open = expandedQIds.has(id);
                      return (
                        <div key={id} className={`${s.quizQAAccordion} ${s.quizQAAccordionSel}`}>
                          <div className={s.quizQAAccordionHead}
                            onClick={() => {
                              setQuizQASelected(prev => prev.filter(x => String(x._id) !== id));
                              setQuizQAPool(prev => sortByDifficulty([...prev, q]));
                            }}>
                            <span className={s.quizQANum}>{i + 1}</span>
                            <span className={s.quizQAText}>{q.question}</span>
                            <span className={`${s.quizQADiff} ${s[`quizQADiff_${q.difficulty}`]}`}>
                              {DIFF_LABEL[q.difficulty] || 'B'}
                            </span>
                            <button type="button" className={s.quizQAChevBtn}
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedQIds(prev => {
                                  const next = new Set(prev);
                                  next.has(id) ? next.delete(id) : next.add(id);
                                  return next;
                                });
                              }}>
                              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                                style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}>
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                          {open && q.answer && (
                            <div className={s.quizQAAccordionBody}>
                              <span className={s.quizQAAnswerLabel}>Answer</span>
                              <p className={s.quizQAAnswer}>{q.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Right: Controls ── */}
              <div className={s.quizModalRight}>
                <div className={s.quizRightForm}>

                  <div className={s.quizRightChapterRow}>
                    <span className={s.quizRightChapterLabel}>Chapter</span>
                    <span className={s.quizRightChapterName}>{quizModal.topicName}</span>
                  </div>

                  <button type="button" className={s.btnGenerate}
                    disabled={quizQAGenerating}
                    onClick={generateQuizQA}>
                    {quizQAGenerating ? (
                      <>
                        <span className={s.btnGenerateSpinner} />
                        Generating…
                      </>
                    ) : quizQAHasGenerated ? 'Re-Generate' : 'Generate'}
                  </button>

                  {quizQAHasGenerated && (
                    <div className={s.quizRightStats}>
                      <div className={s.quizRightStatRow}>
                        <span>Pool</span>
                        <strong>{quizQAPool.length}</strong>
                      </div>
                      <div className={s.quizRightStatRow}>
                        <span>Selected</span>
                        <strong>{quizQASelected.length}</strong>
                      </div>
                      <div className={s.quizRightStatRow}>
                        <span>Total</span>
                        <strong>{quizQAPool.length + quizQASelected.length}</strong>
                      </div>
                    </div>
                  )}

                  <div className={s.quizRightDivider} />

                  <button type="button" className={s.btnSaveQA} onClick={saveQuiz}>
                    Save Quiz
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className={s.quizSettingsBody}>
              {SettingsPanel()}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Aptitude Test Modal ─────────────────────────────────── */
  function AptitudeModal() {
    if (!aptitudeModalOpen) return null;

    return (
      <div className={s.modalOverlay}>
        <div className={s.quizModalBox}>
          {/* Header — no tabs: the Aptitude Test has no Settings panel */}
          <div className={s.quizModalHeader}>
            <div className={s.modalHeaderLeft}>
              <span className={s.modalType}>Aptitude Test</span>
              <span className={s.modalTypeSep}>|</span>
              <span className={s.modalTopic}>Course: {form.title || '(Untitled course)'}</span>
            </div>
            <button type="button" className={s.modalClose} onClick={closeAptitudeModal}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className={s.quizDetailsBody}>

            {/* ── Left: Generated QA pool ── */}
            <div className={s.quizModalLeft}>
              <div className={s.quizColHeader}>
                <span className={s.quizColTitle}>Generated QA</span>
                <span className={s.quizColBadge}>{aptitudeQAPool.length}</span>
              </div>
              <div className={s.quizQAList}>
                {aptitudeQALoading ? (
                  <div className={s.quizQAEmpty}>Loading questions…</div>
                ) : aptitudeQAPool.length === 0 ? (
                  <div className={s.quizQAEmpty}>
                    {aptitudeQAHasGenerated
                      ? 'All generated questions are selected.'
                      : 'Add context in the right panel and click Generate to create questions using AI.'}
                  </div>
                ) : (
                  aptitudeQAPool.map((q, i) => {
                    const id = String(q._id);
                    const open = expandedAptitudeQIds.has(id);
                    return (
                      <div key={id} className={s.quizQAAccordion}>
                        <div className={s.quizQAAccordionHead}
                          onClick={() => {
                            setAptitudeQAPool(prev => prev.filter(x => String(x._id) !== id));
                            setAptitudeQASelected(prev => sortByDifficulty([...prev, q]));
                          }}>
                          <span className={s.quizQANum}>{i + 1}</span>
                          <span className={s.quizQAText}>{q.question}</span>
                          <span className={`${s.quizQADiff} ${s[`quizQADiff_${q.difficulty}`]}`}>
                            {DIFF_LABEL[q.difficulty] || 'B'}
                          </span>
                          <button type="button" className={s.quizQAChevBtn}
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedAptitudeQIds(prev => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                              });
                            }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}>
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                        {open && q.answer && (
                          <div className={s.quizQAAccordionBody}>
                            <span className={s.quizQAAnswerLabel}>Answer</span>
                            <p className={s.quizQAAnswer}>{q.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Middle: Selected QA ── */}
            <div className={s.quizModalMiddle}>
              <div className={s.quizColHeader}>
                <span className={s.quizColTitle}>Selected Questions</span>
                <span className={s.quizColBadge}>{aptitudeQASelected.length}</span>
              </div>
              <div className={s.quizQAList}>
                {aptitudeQASelected.length === 0 ? (
                  <div className={s.quizMiddleEmpty}>
                    <svg width="64" height="64" viewBox="0 0 90 90" fill="none">
                      <circle cx="45" cy="45" r="40" fill="#f0f1f5"/>
                      <rect x="22" y="28" width="46" height="6" rx="3" fill="#d1d5db"/>
                      <rect x="22" y="40" width="36" height="5" rx="2.5" fill="#e5e7eb"/>
                      <circle cx="18" cy="43" r="4" fill="#d1d5db"/>
                      <rect x="22" y="51" width="40" height="5" rx="2.5" fill="#e5e7eb"/>
                      <circle cx="18" cy="54" r="4" fill="#d1d5db"/>
                    </svg>
                    <p className={s.quizEmptyText}>Click questions on the left to add them here.</p>
                  </div>
                ) : (
                  aptitudeQASelected.map((q, i) => {
                    const id = String(q._id);
                    const open = expandedAptitudeQIds.has(id);
                    return (
                      <div key={id} className={`${s.quizQAAccordion} ${s.quizQAAccordionSel}`}>
                        <div className={s.quizQAAccordionHead}
                          onClick={() => {
                            setAptitudeQASelected(prev => prev.filter(x => String(x._id) !== id));
                            setAptitudeQAPool(prev => sortByDifficulty([...prev, q]));
                          }}>
                          <span className={s.quizQANum}>{i + 1}</span>
                          <span className={s.quizQAText}>{q.question}</span>
                          <span className={`${s.quizQADiff} ${s[`quizQADiff_${q.difficulty}`]}`}>
                            {DIFF_LABEL[q.difficulty] || 'B'}
                          </span>
                          <button type="button" className={s.quizQAChevBtn}
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedAptitudeQIds(prev => {
                                const next = new Set(prev);
                                next.has(id) ? next.delete(id) : next.add(id);
                                return next;
                              });
                            }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}>
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </button>
                        </div>
                        {open && q.answer && (
                          <div className={s.quizQAAccordionBody}>
                            <span className={s.quizQAAnswerLabel}>Answer</span>
                            <p className={s.quizQAAnswer}>{q.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Right: Controls ── */}
            <div className={s.quizModalRight}>
              <div className={s.quizRightForm}>

                <div className={s.formGroup}>
                  <label className={s.label}>Context</label>
                  <textarea className={s.textarea} rows={6}
                    placeholder="Describe the topics, skills, or knowledge areas the aptitude test should cover…"
                    value={form.aptitudeContext}
                    onChange={e => setField('aptitudeContext', e.target.value)} />
                </div>

                <button type="button" className={s.btnGenerate}
                  disabled={aptitudeQAGenerating}
                  onClick={generateAptitudeQA}>
                  {aptitudeQAGenerating ? (
                    <>
                      <span className={s.btnGenerateSpinner} />
                      Generating…
                    </>
                  ) : aptitudeQAHasGenerated ? 'Re-Generate' : 'Generate'}
                </button>

                {aptitudeQAHasGenerated && (
                  <div className={s.quizRightStats}>
                    <div className={s.quizRightStatRow}>
                      <span>Pool</span>
                      <strong>{aptitudeQAPool.length}</strong>
                    </div>
                    <div className={s.quizRightStatRow}>
                      <span>Selected</span>
                      <strong>{aptitudeQASelected.length}</strong>
                    </div>
                    <div className={s.quizRightStatRow}>
                      <span>Total</span>
                      <strong>{aptitudeQAPool.length + aptitudeQASelected.length}</strong>
                    </div>
                  </div>
                )}

                <div className={s.quizRightDivider} />

                <button type="button" className={s.btnSaveQA} disabled={aptitudeSaving} onClick={saveAptitudeTest}>
                  {aptitudeSaving ? 'Saving…' : 'Save Aptitude Test'}
                </button>

                <button type="button" className={s.btnCloseAptitude} onClick={closeAptitudeModal}>
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  /* ── Zoom Link Modal ─────────────────────────────────────── */
  function ZoomLinkModal() {
    if (!zoomModal) return null;
    return (
      <div className={s.modalOverlay}>
        <div className={s.simpleModalBox}>
          <div className={s.simpleModalHeader}>
            <span className={s.simpleModalTitle}>{zoomModal.editIdx != null ? 'Edit Zoom Link' : 'Add Zoom Link'}</span>
            <button type="button" className={s.modalClose} onClick={closeZoomModal}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
          <div className={s.simpleModalBody}>
            <div className={s.simpleModalField}>
              <label className={s.simpleModalLabel}>Title</label>
              <input
                className={s.simpleModalInput}
                type="text"
                placeholder="Enter title"
                value={zoomForm.title}
                onChange={e => setZoomForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className={s.simpleModalField}>
              <label className={s.simpleModalLabel}>Zoom Link</label>
              <input
                className={s.simpleModalInput}
                type="url"
                placeholder="https://zoom.us/j/..."
                value={zoomForm.link}
                onChange={e => setZoomForm(prev => ({ ...prev, link: e.target.value }))}
              />
            </div>
          </div>
          <div className={s.simpleModalFooter}>
            <button type="button" className={s.modalBtnCancel} onClick={closeZoomModal}>Cancel</button>
            <button type="button" className={s.modalBtnSave} onClick={saveZoom}>Submit</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Assignment Modal ────────────────────────────────────── */
  function AssignmentModal() {
    if (!assignModal) return null;
    return (
      <div className={s.modalOverlay}>
        <div className={s.simpleModalBox}>
          <div className={s.simpleModalHeader}>
            <span className={s.simpleModalTitle}>{assignModal.editIdx != null ? 'Edit Assignment' : 'Add Assignment'}</span>
            <button type="button" className={s.modalClose} onClick={closeAssignModal}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
          <div className={s.simpleModalBody}>
            <div className={s.simpleModalField}>
              <label className={s.simpleModalLabel}>Title</label>
              <input
                className={s.simpleModalInput}
                type="text"
                placeholder="Enter title"
                value={assignForm.title}
                onChange={e => setAssignForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className={s.simpleModalField}>
              <label className={s.simpleModalLabel}>
                File{assignModal.editIdx != null ? ' (leave empty to keep existing)' : ''}
              </label>
              <label className={s.simpleFileUpload}>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,.ppt,.pptx,.zip,.rar"
                  style={{ display: 'none' }}
                  onChange={e => setAssignForm(prev => ({ ...prev, file: e.target.files[0] || null }))}
                />
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" style={{ color: '#6b7280' }}>
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 012 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                <span className={s.simpleFileLabel}>
                  {assignForm.file
                    ? assignForm.file.name
                    : assignModal.editIdx != null
                      ? (chapters[assignModal.chIdx]?.assignments?.[assignModal.editIdx]?.fileName || 'No file selected')
                      : 'Upload file (.doc, .docx, .pdf, .ppt, .pptx, .zip, .rar)'}
                </span>
              </label>
            </div>
          </div>
          <div className={s.simpleModalFooter}>
            <button type="button" className={s.modalBtnCancel} onClick={closeAssignModal}>Cancel</button>
            <button type="button" className={s.modalBtnSave} onClick={saveAssign}>Submit</button>
          </div>
        </div>
      </div>
    );
  }

  function SidePanel() {
    return (
      <div className={s.sidePanel}>
        {/* Featured Image */}
        <div className={s.sidePanelCard}>
          <div className={s.sidePanelTitle}>Featured Image</div>
          <div className={s.sidePanelBody}>
            <div className={s.uploadArea}>
              {featuredImageFile ? (
                <img
                  src={URL.createObjectURL(featuredImageFile)}
                  alt="Featured preview"
                  style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                />
              ) : existingCourseImage ? (
                <img
                  src={`${API_URL}${existingCourseImage}`}
                  alt="Featured preview"
                  style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                />
              ) : ImageIcon}
              <label className={s.uploadAreaBtn} style={{ cursor: 'pointer' }}>
                {featuredImageFile || existingCourseImage ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => setFeaturedImageFile(e.target.files[0] || null)}
                />
              </label>
              <span className={s.uploadAreaNote}>JPEG, PNG, GIF, and WebP formats, up to 400 MB</span>
              {featuredImageFile ? (
                <>
                  <span className={s.uploadAreaNote} style={{ wordBreak: 'break-all' }}>{featuredImageFile.name}</span>
                  <button type="button" className={s.modalAddFromUrl}
                    onClick={() => window.open(URL.createObjectURL(featuredImageFile), '_blank')}>
                    🖼 View in new tab
                  </button>
                </>
              ) : existingCourseImage ? (
                <>
                  <span className={s.uploadAreaNote} style={{ wordBreak: 'break-all' }}>{existingCourseImage.split('/').pop()}</span>
                  <button type="button" className={s.modalAddFromUrl}
                    onClick={() => window.open(`${API_URL}${existingCourseImage}`, '_blank')}>
                    🖼 View in new tab
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Intro Video */}
        <div className={s.sidePanelCard}>
          <div className={s.sidePanelTitle}>Intro Video</div>
          <div className={s.sidePanelBody}>
            <div className={s.uploadArea}>
              {VideoIcon}
              <label className={s.uploadAreaBtn} style={{ cursor: 'pointer' }}>
                {introVideoFile || existingIntroVideo ? 'Change Video' : 'Upload Video'}
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={e => setIntroVideoFile(e.target.files[0] || null)}
                />
              </label>
              <span className={s.uploadAreaNote}>MP4, and WebM formats, up to 400 MB</span>
              {introVideoFile ? (
                <>
                  <span className={s.uploadAreaNote} style={{ wordBreak: 'break-all' }}>{introVideoFile.name}</span>
                  <button type="button" className={s.modalAddFromUrl}
                    onClick={() => window.open(URL.createObjectURL(introVideoFile), '_blank')}>
                    ▶ Play in new tab
                  </button>
                </>
              ) : existingIntroVideo ? (
                <>
                  <span className={s.uploadAreaNote} style={{ wordBreak: 'break-all' }}>{existingIntroVideo.split('/').pop()}</span>
                  <button type="button" className={s.modalAddFromUrl}
                    onClick={() => window.open(`${API_URL}${existingIntroVideo}`, '_blank')}>
                    ▶ Play in new tab
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className={s.sidePanelCard} style={{ position: 'relative' }}>
          <div className={s.sidePanelTitle}>Categories</div>
          <div className={s.sidePanelBody}>
            <div className={s.categoryBox}>
              <div className={s.catBoxSearch}>
                {SearchIcon}
                <input type="text" placeholder="Search"
                  value={catSearch} onChange={e => setCatSearch(e.target.value)} />
              </div>
              <div className={s.catBoxList}>
                {catSearch.trim() ? (
                  filteredCats.length > 0
                    ? filteredCats.map(cat => (
                        <label key={cat._id} className={s.categoryItem}
                          style={{ paddingLeft: cat.depth * 18 + 2 }}>
                          <input type="checkbox"
                            checked={form.selectedCatIds.includes(cat._id)}
                            onChange={() => toggleCat(cat._id)} />
                          {cat.name}
                        </label>
                      ))
                    : <span className={s.noCatsMsg}>No categories found.</span>
                ) : (
                  catTree.map(function renderNode(node, depth) {
                    depth = depth || 0;
                    const hasChildren = node.children?.length > 0;
                    const isCollapsed = collapsedCatIds.has(node._id);
                    return (
                      <div key={node._id}>
                        <div className={s.catTreeRow} style={{ paddingLeft: depth * 18 + 2 }}>
                          <button type="button" className={`${s.catExpandBtn}${hasChildren ? '' : ' ' + s.catExpandBtnHidden}`}
                            onClick={() => hasChildren && toggleCatExpand(node._id)}>
                            {hasChildren ? (isCollapsed ? '▸' : '▾') : ''}
                          </button>
                          <label className={s.categoryItem}>
                            <input type="checkbox"
                              checked={form.selectedCatIds.includes(node._id)}
                              onChange={() => toggleCat(node._id)} />
                            {node.name}
                          </label>
                        </div>
                        {hasChildren && !isCollapsed && (
                          <div className={s.catChildren}>
                            {node.children.map(child => renderNode(child, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <button type="button" className={s.addCatLink}
              onClick={() => setShowCatPopup(v => !v)}>
              + Add
            </button>
          </div>
          {showCatPopup && (
          <div className={s.addCatPopup}>
            <input className={s.input} type="text" placeholder="Category name"
              value={newCatInput} onChange={e => setNewCatInput(e.target.value)} />
            <select className={s.select} value={newCatParent}
              onChange={e => setNewCatParent(e.target.value)}>
              <option value="">Select parent</option>
              {flatCategories.map(c => (
                <option key={c._id} value={c._id}>
                  {`${'\u00a0\u00a0'.repeat(c.depth)}${c.depth > 0 ? '↳ ' : ''}${c.name}`}
                </option>
              ))}
            </select>
            <div className={s.addCatPopupActions}>
              <button type="button" className={s.btnCatCancel}
                onClick={() => { setShowCatPopup(false); setNewCatInput(''); setNewCatParent(''); }}>
                Cancel
              </button>
              <button type="button" className={s.btnCatOk}
                disabled={!newCatInput.trim() || addingCat}
                onClick={handleAddCategory}>
                {addingCat ? '…' : 'Ok'}
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Tags */}
        <div className={s.sidePanelCard} style={{ position: 'relative' }}>
          <div className={s.sidePanelTitle}>Tags</div>
          <div className={s.sidePanelBody}>
            <div className={s.categoryBox}>
              <div className={s.catBoxSearch}>
                {SearchIcon}
                <input type="text" placeholder="Search tags…"
                  value={tagSearch} onChange={e => setTagSearch(e.target.value)} />
              </div>
              <div className={s.catBoxList}>
                {filteredTags.length > 0
                  ? filteredTags.map(tag => (
                      <label key={tag._id} className={s.categoryItem}>
                        <input type="checkbox"
                          checked={form.selectedTagIds.includes(tag._id)}
                          onChange={() => toggleTag(tag._id)} />
                        {tag.title}
                      </label>
                    ))
                  : <span className={s.noCatsMsg}>No tags found.</span>
                }
              </div>
            </div>
            <button type="button" className={s.addCatLink}
              onClick={() => setShowTagPopup(v => !v)}>
              + Add
            </button>
          </div>
          {showTagPopup && (
          <div className={s.addCatPopup}>
            <input className={s.input} type="text" placeholder="Tag name"
              value={newTagInput} onChange={e => setNewTagInput(e.target.value)} />
            <div className={s.addCatPopupActions}>
              <button type="button" className={s.btnCatCancel}
                onClick={() => { setShowTagPopup(false); setNewTagInput(''); }}>
                Cancel
              </button>
              <button type="button" className={s.btnCatOk}
                disabled={!newTagInput.trim() || addingTag}
                onClick={handleAddTag}>
                {addingTag ? '…' : 'Ok'}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Step 1: Basics ──────────────────────────────────────── */
  function Step1() {
    return (
      <div className={s.builderBody}>
        <div className={s.main}>
          {/* Title & Slug */}
          <div className={s.formCard}>
            <div className={s.formCardBody}>
              <div className={s.formGroup}>
                <label className={s.label}>Course Title <span className={s.required}>*</span></label>
                <input className={s.input} type="text" placeholder="Enter course title"
                  value={form.title} onChange={e => handleTitleChange(e.target.value)} />
                {errors.title && <span className={s.errorMsg}>{errors.title}</span>}
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>Description <span className={s.required}>*</span></label>
                <textarea className={s.textarea} rows={4} placeholder="What will students learn from this course?"
                  value={form.desc} onChange={e => { setField('desc', e.target.value); if (errors.desc) setErrors(prev => ({ ...prev, desc: undefined })); }} />
                {errors.desc && <span className={s.errorMsg}>{errors.desc}</span>}
              </div>
            </div>
          </div>

          {/* Options panel */}
          <div className={s.formCard}>
            <div className={s.formCardHeader}>
              <div className={s.formCardHeaderLeft}>{MenuIcon} Options</div>
            </div>
            <div className={s.optionsLayout}>
              <div className={s.optionsNav}>
                {[
                  { key: 'general',      label: 'General' },
                  { key: 'enrollment',   label: 'Enrollment' },
                ].map(tab => (
                  <div key={tab.key}
                    className={`${s.optionsNavItem} ${optionTab === tab.key ? s.optionsNavItemActive : ''}`}
                    onClick={() => setOptionTab(tab.key)}>
                    {tab.label}
                  </div>
                ))}
              </div>
              <div className={s.optionsPanel}>
                {optionTab === 'general' && (
                  <>
                    <div className={s.formGroup}>
                      <label className={s.label}>Difficulty Level</label>
                      <select className={s.select} value={form.difficultyLevel}
                        onChange={e => setField('difficultyLevel', e.target.value)}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className={s.formRow}>
                      <div className={s.formGroup}>
                        <label className={s.label}>Duration (Hours)</label>
                        <input className={s.input} type="number" min="0"
                          value={form.duration_hr} onChange={e => setField('duration_hr', e.target.value)} />
                      </div>
                      <div className={s.formGroup}>
                        <label className={s.label}>Duration (Minutes)</label>
                        <select className={s.select} value={form.duration_min}
                          onChange={e => setField('duration_min', e.target.value)}>
                          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className={s.toggleRow}>
                      <span>Enable Reviews</span>
                      <label className={s.toggle}>
                        <input type="checkbox" checked={form.enableReview}
                          onChange={e => setField('enableReview', e.target.checked)} />
                        <span className={s.toggleSlider} />
                      </label>
                    </div>
                    <div className={s.toggleRow}>
                      <span>Q&amp;A Enabled</span>
                      <label className={s.toggle}>
                        <input type="checkbox" checked={form.qnaEnabled}
                          onChange={e => setField('qnaEnabled', e.target.checked)} />
                        <span className={s.toggleSlider} />
                      </label>
                    </div>
                  </>
                )}
                {optionTab === 'content-drip' && (
                  <>
                    <div className={s.toggleRow}>
                      <span>Enable Content Drip</span>
                      <label className={s.toggle}>
                        <input
                          type="checkbox"
                          checked={!!form.contentDrip}
                          onChange={e => setField('contentDrip', e.target.checked)}
                        />
                        <span className={s.toggleSlider} />
                      </label>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                      Release course content gradually to enrolled students over time.
                    </p>
                  </>
                )}
                {optionTab === 'enrollment' && (
                  <>
                    <div className={s.formGroup}>
                      <label className={s.label}>Max Students (0 = unlimited)</label>
                      <input className={s.input} type="number" min="0" placeholder="0"
                        value={form.maxStudents} onChange={e => setField('maxStudents', e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Aptitude Test panel */}
          <div className={s.formCard}>
            <div className={s.formCardHeader}>
              <div className={s.formCardHeaderLeft}>{MenuIcon} Aptitude Test</div>
            </div>
            <div className={s.formCardBody}>
              <span className={s.quizRightChapterLabel}>Selected Questions</span>
              <div className={s.quizQAList} style={{ maxHeight: 320, overflowY: 'auto' }}>
                {aptitudeQASelected.length === 0 ? (
                  <div className={s.quizQAEmpty}>No questions selected yet.</div>
                ) : (
                  aptitudeQASelected.map((q, i) => {
                    const id = String(q._id);
                    const open = expandedAptitudeQIds.has(id);
                    return (
                      <div key={id} className={`${s.quizQAAccordion} ${s.quizQAAccordionSel}`}>
                        <div className={s.quizQAAccordionHead}
                          onClick={() => {
                            setExpandedAptitudeQIds(prev => {
                              const next = new Set(prev);
                              next.has(id) ? next.delete(id) : next.add(id);
                              return next;
                            });
                          }}>
                          <span className={s.quizQANum}>{i + 1}</span>
                          <span className={s.quizQAText}>{q.question}</span>
                          <span className={`${s.quizQADiff} ${s[`quizQADiff_${q.difficulty}`]}`}>
                            {DIFF_LABEL[q.difficulty] || 'B'}
                          </span>
                          <span className={s.quizQAChevBtn}>
                            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"
                              style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s' }}>
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </span>
                        </div>
                        {open && q.answer && (
                          <div className={s.quizQAAccordionBody}>
                            <span className={s.quizQAAnswerLabel}>Answer</span>
                            <p className={s.quizQAAnswer}>{q.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <button type="button" className={s.btnGenerate} onClick={openAptitudeModal}>
                Manage Aptitude Test QA
              </button>
            </div>
          </div>
        </div>

        {SidePanel()}
      </div>
    );
  }

  /* ── Step 2: Curriculum ─────────────────────────────── */
  function Step2() {
    const allSaved = chapters.length > 0 && chapters.every(ch => ch.saved);
    const allCollapsed = chapters.every(ch => ch.collapsed);

    function handleExpandAll() {
      const expand = allCollapsed;
      setChapters(prev => prev.map(ch => ({ ...ch, collapsed: !expand })));
    }

    return (
      <div className={s.curriculumWrap}>
        {chapters.length > 0 && (
          <div className={s.curriculumHeader}>
            <div className={s.curriculumHeading}>
              <button type="button" className={s.btnCurriculumBack} onClick={() => setStep(1)}>
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </button>
              <span>Curriculum</span>
            </div>
            {allSaved && (
              <button type="button" className={s.btnExpandAll} onClick={handleExpandAll}>
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}
          </div>
        )}
        {chapters.length === 0 ? (
          <div className={s.curriculumEmpty}>
            <div className={s.curriculumEmptyImg}>
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none">
                <ellipse cx="70" cy="88" rx="60" ry="20" fill="#e8ecf8"/>
                <ellipse cx="42" cy="77" rx="32" ry="22" fill="#dde4f5"/>
                <ellipse cx="100" cy="75" rx="28" ry="19" fill="#dde4f5"/>
                <rect x="50" y="42" width="40" height="36" rx="4" fill="#4a7de8"/>
                <rect x="56" y="51" width="28" height="3" rx="1.5" fill="#fff" opacity="0.8"/>
                <rect x="56" y="58" width="22" height="3" rx="1.5" fill="#fff" opacity="0.8"/>
                <rect x="50" y="68" width="40" height="10" rx="4" fill="#f5a623"/>
                <circle cx="70" cy="30" r="14" fill="#4a7de8"/>
                <circle cx="65" cy="29" r="3.5" fill="white"/>
                <circle cx="75" cy="29" r="3.5" fill="white"/>
                <circle cx="65" cy="30" r="2" fill="#1a2e5a"/>
                <circle cx="75" cy="30" r="2" fill="#1a2e5a"/>
                <path d="M64 37 Q70 42 76 37" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <rect x="33" y="53" width="18" height="6" rx="3" fill="#4a7de8"/>
                <rect x="89" y="53" width="18" height="6" rx="3" fill="#4a7de8"/>
                <circle cx="115" cy="67" r="9" fill="#6ba3ef"/>
                <circle cx="112" cy="65" r="2.5" fill="white"/>
                <circle cx="118" cy="65" r="2.5" fill="white"/>
                <circle cx="112" cy="66" r="1.2" fill="#1a2e5a"/>
                <circle cx="118" cy="66" r="1.2" fill="#1a2e5a"/>
                <path d="M111 72 Q115 76 119 72" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                <path d="M122 62 L130 52" stroke="#6ba3ef" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={s.curriculumEmptyTitle}>Start building your course!</div>
            <div className={s.curriculumEmptySub}>Add Topics, Lessons, and Quizzes to get started.</div>
            <button type="button" className={s.btnAddChapterPrimary} onClick={addChapter}>
              + Add Chapter
            </button>
          </div>
        ) : (
          <div className={s.chapterList}>
            {chapters.map((ch, chIdx) => (
              <div
                key={ch._id}
                className={`${s.chCard}${dragOverChIdx === chIdx && dragChIdx !== chIdx ? ' ' + s.chCardDragOver : ''}`}
                style={{ '--ch-color': CHAPTER_COLORS[chIdx % CHAPTER_COLORS.length] }}
                draggable
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragChIdx(chIdx); }}
                onDragOver={e => { e.preventDefault(); setDragOverChIdx(chIdx); }}
                onDrop={() => { reorderChapters(dragChIdx, dragOverChIdx); setDragChIdx(null); setDragOverChIdx(null); }}
                onDragEnd={() => { setDragChIdx(null); setDragOverChIdx(null); }}
              >
                {ch.saved ? (
                  /* ─── Saved / View mode ─────────────────── */
                  <>
                    <div className={s.chSavedTop}>
                      <span className={s.chCardDrag}>⠿</span>
                      <div className={s.chSavedInfo}>
                        <span className={s.chSavedChapterNo}>Chapter {chIdx + 1}</span>
                        <span className={s.chSavedTitle}>{ch.title || '(Untitled)'}</span>
                        {!ch.collapsed && ch.desc && (
                          <span className={s.chSavedDesc}>{ch.desc}</span>
                        )}
                      </div>
                      <div className={s.chSavedActions}>
                        <button type="button" className={s.btnChIcon} title="Edit"
                          onClick={() => editChapter(chIdx)}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                        </button>
                        <button type="button" className={s.btnChIconDanger} title="Delete"
                          onClick={() => setChapterToDelete(chIdx)}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                        </button>
                        <button type="button" className={`${s.btnChIcon} ${ch.collapsed ? s.rotatedDown : ''}`}
                          title={ch.collapsed ? 'Expand' : 'Collapse'}
                          onClick={() => toggleChapterCollapse(chIdx)}>
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {!ch.collapsed && (
                      <>
                        {/* Unified sortable item list */}
                        {(() => {
                          const flatItems = getChapterFlatItems(ch);
                          if (flatItems.length === 0) return null;
                          return (
                            <div className={s.lessonList}>
                              {flatItems.map((item, flatIdx) => (
                                <div
                                  key={item._id}
                                  className={`${s.lessonRow}${dragOverItemInfo?.chIdx === chIdx && dragOverItemInfo?.flatIdx === flatIdx ? ` ${s.lessonRowDragOver}` : ''}`}
                                  draggable
                                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragItemInfo({ chIdx, flatIdx }); }}
                                  onDragOver={e => { e.preventDefault(); setDragOverItemInfo({ chIdx, flatIdx }); }}
                                  onDrop={() => {
                                    if (dragItemInfo?.chIdx === chIdx) reorderChapterItem(chIdx, dragItemInfo.flatIdx, flatIdx);
                                    setDragItemInfo(null);
                                    setDragOverItemInfo(null);
                                  }}
                                  onDragEnd={() => { setDragItemInfo(null); setDragOverItemInfo(null); }}
                                >
                                  <span className={s.lessonDrag}>≡</span>
                                  {item._type === 'lesson' && <span style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: '#eff6ff', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Lesson</span>}
                                  {item._type === 'quiz' && <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Quiz</span>}
                                  {item._type === 'zoom' && <span style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', background: '#ecfeff', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Zoom</span>}
                                  {item._type === 'assignment' && <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fef3c7', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Assignment</span>}
                                  <span className={s.lessonName}>
                                    {item._type === 'lesson' ? item.name : item.title}
                                    {item._type === 'assignment' && item.fileName && (
                                      <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>({item.fileName})</span>
                                    )}
                                  </span>
                                  <div className={s.lessonRowActions}>
                                    <button type="button" className={s.btnChIcon} title="Edit"
                                      onClick={() => {
                                        if (item._type === 'lesson') {
                                          setLessonForm({ name: item.name, content: item.content, featuredImage: null, imageUrl: item.imageUrl || '', video: null, videoUrl: item.videoUrl || '', playbackHour: item.playbackHour, playbackMin: item.playbackMin, playbackSec: item.playbackSec, exerciseFile: null, lessonPreview: false });
                                          setLessonModal({ chIdx, topicName: ch.title || '(Untitled)', editIdx: item._typeIdx });
                                        } else if (item._type === 'quiz') {
                                          setQuizForm({ title: item.title, summary: item.summary || '' });
                                          setQuizSettings({ ...item.settings });
                                          setQuizTab('details');
                                          setQuizQAPool([]);
                                          setQuizQASelected([]);
                                          setQuizQAHasGenerated(false);
                                          setExpandedQIds(new Set());
                                          setQuizModal({ chIdx, topicName: ch.title || '(Untitled)', editIdx: item._typeIdx });
                                          loadQuizQA(item.serverId, item.settings?.selectedQuestionIds);
                                        } else if (item._type === 'zoom') {
                                          setZoomForm({ title: item.title, link: item.link });
                                          setZoomModal({ chIdx, editIdx: item._typeIdx });
                                        } else {
                                          setAssignForm({ title: item.title, file: null });
                                          setAssignModal({ chIdx, editIdx: item._typeIdx });
                                        }
                                      }}>
                                      <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                                      </svg>
                                    </button>
                                    <button type="button" className={s.btnChIconDanger} title="Delete"
                                      onClick={() => {
                                        if (item._type === 'lesson') setLessonToDelete({ chIdx, lIdx: item._typeIdx });
                                        else if (item._type === 'quiz') setQuizToDelete({ chIdx, qIdx: item._typeIdx });
                                        else if (item._type === 'zoom') setZoomToDelete({ chIdx, zIdx: item._typeIdx });
                                        else setAssignToDelete({ chIdx, aIdx: item._typeIdx });
                                      }}>
                                      {TrashIcon}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div className={s.chCardBar}>
                          <button type="button" className={s.btnChBarItem} onClick={() => openLessonModal(chIdx)}>+ Lesson</button>
                          <button type="button" className={s.btnChBarItem} onClick={() => openQuizModal(chIdx)}>+ Quiz</button>
                          <button type="button" className={s.btnChBarItem} onClick={() => openZoomModal(chIdx)}>+ Zoom Link</button>
                          <button type="button" className={s.btnChBarItem} onClick={() => openAssignModal(chIdx)}>+ Assignment</button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* ─── Edit / New mode ───────────────────── */
                  <>
                    <div className={s.chCardTop}>
                      <span className={s.chCardDrag}>⠿</span>
                      <div className={s.chCardForm}>
                        <div className={s.chCardLabel}>Chapter {chIdx + 1}</div>
                        <input
                          className={s.chCardTitleInput}
                          type="text"
                          placeholder="Add a title"
                          value={ch.title}
                          onChange={e => updateChapter(chIdx, 'title', e.target.value)}
                        />
                        <div className={s.chCardDivider} />
                        <textarea
                          className={s.chCardSummary}
                          placeholder="Add a summary"
                          rows={3}
                          value={ch.desc}
                          onChange={e => updateChapter(chIdx, 'desc', e.target.value)}
                        />
                        <div className={s.chCardFormFooter}>
                          <button type="button" className={s.btnChCancel}
                            onClick={() => {
                              if (ch.serverId) {
                                setChapters(prev => { const c = [...prev]; c[chIdx] = { ...c[chIdx], saved: true }; return c; });
                              } else {
                                removeChapter(chIdx);
                              }
                            }}>
                            Cancel
                          </button>
                          <button type="button" className={s.btnChOk}
                            disabled={savingChapterIdx === chIdx}
                            onClick={() => saveChapter(chIdx)}>
                            {savingChapterIdx === chIdx ? 'Saving…' : 'Ok'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={s.chCardBar}>
                      <button type="button" className={s.btnChBarItem} disabled>+ Lesson</button>
                      <button type="button" className={s.btnChBarItem} disabled>+ Quiz</button>
                      <button type="button" className={s.btnChBarItem} disabled>+ Zoom Link</button>
                      <button type="button" className={s.btnChBarItem} disabled>+ Assignment</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button type="button" className={s.btnAddChapter} onClick={addChapter}>
              + Add Chapter
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Step 3: Additional ──────────────────────────────────── */
  function Step3() {
    return (
      <div className={s.additionalWrap}>
        {/* Overview card */}
        <div className={s.formCard}>
          <div className={s.addCardHeader}>
            <span className={s.addCardTitle}>Overview</span>
            <span className={s.addCardSub}>Provide essential course information to attract and inform potential students</span>
          </div>
          <div className={s.addCardBody}>
            <div className={s.formGroup}>
              <label className={s.addLabel}>What Will I Learn?</label>
              <textarea className={s.addTextarea} rows={3} placeholder="Define the key takeaways from this course (list one benefit per line)"
                value={form.what_will_learn} onChange={e => setField('what_will_learn', e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.addLabel}>Target Audience</label>
              <textarea className={s.addTextarea} rows={3} placeholder="Specify the target audience that will benefit the most from the course. (One Line Per target audience)"
                value={form.target_audience} onChange={e => setField('target_audience', e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.addLabel}>Total Course Duration</label>
              <div className={s.durationRow}>
                <input className={s.durationInput} type="number" min="0"
                  value={form.duration_hr} onChange={e => setField('duration_hr', e.target.value)} />
                <span className={s.durationUnit}>hour(s)</span>
                <input className={s.durationInput} type="number" min="0"
                  value={form.duration_min} onChange={e => setField('duration_min', e.target.value)} />
                <span className={s.durationUnit}>min(s)</span>
              </div>
            </div>
            <div className={s.formGroup}>
              <label className={s.addLabel}>Materials Included</label>
              <textarea className={s.addTextarea} rows={3} placeholder="A list of assets you will be providing for the students in this course (One Per Line)"
                value={form.materials_included} onChange={e => setField('materials_included', e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.addLabel}>Requirements/Instructions</label>
              <textarea className={s.addTextarea} rows={3} placeholder="Additional requirements or special instructions for the students (One Per Line)"
                value={form.requirements} onChange={e => setField('requirements', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Certificate card */}
        <div className={s.formCard}>
          <div className={s.addCardHeader}>
            <span className={s.addCardTitle}>Certificate</span>
          </div>
          <div className={s.certTemplateRow}>
            <label className={s.addLabel}>Certificate Template</label>
            <select
              className={s.certTemplateSelect}
              value={certTemplateId}
              onChange={e => setCertTemplateId(e.target.value)}
            >
              <option value="">— Select a template —</option>
              {certTemplates.map(t => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
          </div>

        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */
  if (loadingEdit) {
    return (
      <SuperAdminShell activeSection="course-builder">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, fontSize: 16, color: '#6b7280' }}>
          Loading course data…
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell activeSection="course-builder">
      {/* Sticky top bar */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          {editId ? 'Edit Course' : 'Course Builder'}
        </div>

        {/* Step tabs */}
        <div className={s.steps}>
          {[
            { n: 1, label: 'Basics' },
            { n: 2, label: 'Curriculum' },
            { n: 3, label: 'Additional' },
          ].map((st, i) => (
            <span key={st.n} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span className={s.stepSep} />}
              <span
                className={`${s.step} ${step === st.n ? s.stepActive : ''}`}
                onClick={() => handleStepClick(st.n)}>
                <span className={s.stepNum}>{st.n}</span>
                {st.label}
              </span>
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className={s.topBarActions}>
          <button type="button" className={s.btnDraft} disabled={step < 3 || submitting}
            onClick={() => handleSubmit('draft')}>
            Save as Draft
          </button>
          <button type="button" className={s.btnPublish} disabled={step < 3 || submitting}
            onClick={() => handleSubmit('published')}>
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Step content */}
      {step === 1 && Step1()}
      {step === 2 && Step2()}
      {step === 3 && Step3()}

      {/* Step footer navigation */}
      <div className={s.stepFooter}>
        <div>
          {step > 1 && (
            <button type="button" className={s.btnPrev} onClick={() => setStep(s => s - 1)}>
              ← Previous
            </button>
          )}
        </div>
        <div>
          {step < 3 && (
            <button
              type="button"
              className={s.btnNext}
              disabled={savingStep1}
              onClick={goToNextStep}>
              {step === 1 && savingStep1 ? 'Saving…' : 'Next →'}
            </button>
          )}
        </div>
      </div>

      {/* Delete topic confirmation */}
      {topicToDelete && (
        <ConfirmModal
          show={true}
          message="Are you sure you want to remove this topic?"
          onConfirm={() => { removeTopic(topicToDelete.chIdx, topicToDelete.tIdx); setTopicToDelete(null); }}
          onCancel={() => setTopicToDelete(null)}
        />
      )}

      {/* Delete chapter confirmation */}
      {chapterToDelete !== null && (
        <ConfirmModal
          show={true}
          title="Delete Chapter"
          message="Are you sure you want to delete this chapter? This will also remove all its lessons."
          onConfirm={() => { removeChapter(chapterToDelete); setChapterToDelete(null); }}
          onCancel={() => setChapterToDelete(null)}
        />
      )}

      {/* Delete lesson confirmation */}
      {lessonToDelete !== null && (
        <ConfirmModal
          show={true}
          title="Delete Lesson"
          message="Are you sure you want to delete this lesson?"
          onConfirm={() => { removeLesson(lessonToDelete.chIdx, lessonToDelete.lIdx); setLessonToDelete(null); }}
          onCancel={() => setLessonToDelete(null)}
        />
      )}

      {/* Delete quiz confirmation */}
      {quizToDelete !== null && (
        <ConfirmModal
          show={true}
          title="Delete Quiz"
          message="Are you sure you want to delete this quiz?"
          onConfirm={() => { removeQuiz(quizToDelete.chIdx, quizToDelete.qIdx); setQuizToDelete(null); }}
          onCancel={() => setQuizToDelete(null)}
        />
      )}

      {/* Delete zoom link confirmation */}
      {zoomToDelete !== null && (
        <ConfirmModal
          show={true}
          title="Delete Zoom Link"
          message="Are you sure you want to delete this zoom link?"
          onConfirm={() => { removeZoom(zoomToDelete.chIdx, zoomToDelete.zIdx); setZoomToDelete(null); }}
          onCancel={() => setZoomToDelete(null)}
        />
      )}

      {/* Delete assignment confirmation */}
      {assignToDelete !== null && (
        <ConfirmModal
          show={true}
          title="Delete Assignment"
          message="Are you sure you want to delete this assignment?"
          onConfirm={() => { removeAssign(assignToDelete.chIdx, assignToDelete.aIdx); setAssignToDelete(null); }}
          onCancel={() => setAssignToDelete(null)}
        />
      )}

      {/* Lesson modal */}
      {LessonModal()}

      {/* Quiz modal */}
      {QuizModal()}

      {/* Aptitude Test modal */}
      {AptitudeModal()}

      {/* Zoom Link modal */}
      {ZoomLinkModal()}

      {/* Assignment modal */}
      {AssignmentModal()}
    </SuperAdminShell>
  );
}
