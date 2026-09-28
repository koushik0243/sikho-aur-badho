import mongoose from 'mongoose';
import CourseCompletion from './course_completion.model.js';
import Chapter from '../chapters/chapter.model.js';
import Topic from '../topics/topic.model.js';
import Progress from '../progress/progress.model.js';
import QuizAttempt from '../quiz_attempts/quiz_attempt.model.js';

const { ObjectId } = mongoose.Types;

export const getCompletion = async ({ userId, courseId }) =>
  CourseCompletion.findOne({ userId, courseId }).lean();

export const listCompletions = async ({ userId }) =>
  CourseCompletion.find({ userId }).select('courseId completedAt').lean();

// Same content the learner player shows: live chapters and their topics.
async function loadCourseContent(courseId) {
  const cid = new ObjectId(courseId);
  const chapters = await Chapter.find({ courseId: cid, deletedAt: null, status: { $ne: 'inactive' } })
    .select('_id').lean();
  const chapterIds = chapters.map(c => String(c._id));
  const topics = await Topic.find({ courseId: cid, deletedAt: null, chapterId: { $in: chapterIds } })
    .select('_id chapterId video_type videoUrl').lean();
  return { chapterIds, topics };
}

const topicKind = (t) => {
  const vt = String(t.video_type || '').toLowerCase().trim();
  if (vt === 'zoom_link') return 'zoom';
  if (vt === 'quiz' || vt === 'assignment') return vt;
  return 'lesson';
};

// Server-side check of what the server can see: every lesson video watched and
// every quiz passed. (Assignments are marked done in the learner's browser and
// zoom sessions have no completion signal, so those aren't checked here.)
async function verifyCourseDone({ userId, courseId, topics, chapterIds }) {
  if (chapterIds.length === 0 || topics.length === 0) return false;
  const lessonIds = topics.filter(t => topicKind(t) === 'lesson' && t.videoUrl).map(t => t._id);
  const quizIds   = topics.filter(t => topicKind(t) === 'quiz').map(t => t._id);
  const [watched, passed] = await Promise.all([
    lessonIds.length
      ? Progress.countDocuments({ userId, topicId: { $in: lessonIds }, completed: true })
      : 0,
    quizIds.length
      ? QuizAttempt.distinct('topicId', { userId, topicId: { $in: quizIds }, passed: true })
      : [],
  ]);
  return watched === lessonIds.length && passed.length === quizIds.length;
}

/**
 * Records the certificate the first time the course is completed. An existing
 * record is returned unchanged — the certificate is permanent.
 * @returns {Promise<{ record: object|null, reason?: string }>}
 */
export const markCourseComplete = async ({ userId, courseId }) => {
  const existing = await getCompletion({ userId, courseId });
  if (existing) return { record: existing };

  const { chapterIds, topics } = await loadCourseContent(courseId);
  const done = await verifyCourseDone({ userId, courseId, topics, chapterIds });
  if (!done) return { record: null, reason: 'Course is not complete yet.' };

  const record = await CourseCompletion.findOneAndUpdate(
    { userId, courseId },
    {
      $setOnInsert: {
        userId, courseId,
        completedAt: new Date(),
        chapterIds,
        topicIds: topics.map(t => t._id),
      },
    },
    { upsert: true, new: true }
  ).lean();
  return { record };
};
