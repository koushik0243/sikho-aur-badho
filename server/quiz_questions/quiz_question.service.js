import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import QuizQuestion from './quiz_question.model.js';
import Topic from '../topics/topic.model.js';
import Course from '../courses/course.model.js';
import AptitudeAttempt from '../aptitude_attempts/aptitude_attempt.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { ObjectId } = mongoose.Types;

// Aptitude level -> quiz-question difficulty distribution. Keys on the left are
// aptitude_attempts.level values; keys on the right are quiz_questions.difficulty tiers.
const LEVEL_DIFFICULTY_SPLIT = {
  beginner:     { beginner: 0.8, intermediate: 0.1, advanced: 0.1 },
  intermediate: { beginner: 0.1, intermediate: 0.8, advanced: 0.1 },
  expert:       { beginner: 0.1, intermediate: 0.1, advanced: 0.8 },
};
const DIFFICULTY_TIERS = ['beginner', 'intermediate', 'advanced'];

const buildQuery = (filters = {}) => {
  const query = { deletedAt: null, status: { $ne: 'inactive' } };
  if (filters.status) query.status = filters.status;
  if (filters.quizId && ObjectId.isValid(filters.quizId)) {
    query.quizId = new ObjectId(filters.quizId);
  }
  if (filters.courseId && ObjectId.isValid(filters.courseId)) {
    query.courseId = new ObjectId(filters.courseId);
  }
  if (filters.chapterId && ObjectId.isValid(filters.chapterId)) {
    query.chapterId = new ObjectId(filters.chapterId);
  }
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.batchNumber) query.batchNumber = filters.batchNumber;
  return query;
};

const transcribeVideoFile = async (videoUrl) => {
  const isLocal = videoUrl.startsWith('/uploads/') || videoUrl.startsWith('uploads/');
  if (!isLocal) return null;

  const relPath = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl;
  const filePath = path.join(__dirname, '..', 'public', relPath);

  if (!fs.existsSync(filePath)) return null;

  const stats = fs.statSync(filePath);
  const MAX_BYTES = 25 * 1024 * 1024;
  if (stats.size > MAX_BYTES) return null; // too large — fall back to metadata-based generation

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcription = await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1',
    response_format: 'text',
  });

  return transcription || null;
};

export const generateAndSaveQuestions = async ({ courseId, chapterId, quizId, courseTitle, chapterTitle }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in .env');
  }

  // Find a lesson with a video first, then fall back to any lesson for description
  const lessonWithVideo = await Topic.findOne({
    chapterId,
    video_type: 'lesson',
    videoUrl: { $nin: [null, ''] },
    deletedAt: null,
    status: 'active',
  }).sort({ order: 1 }).lean();

  const anyLesson = lessonWithVideo || await Topic.findOne({
    chapterId,
    video_type: 'lesson',
    deletedAt: null,
    status: 'active',
  }).sort({ order: 1 }).lean();

  // Attempt transcription; returns null if file is missing, non-local, or > 25 MB
  const transcript = lessonWithVideo?.videoUrl
    ? await transcribeVideoFile(lessonWithVideo.videoUrl)
    : null;

  // Build the best available text context for generation
  const lessonDesc = anyLesson?.desc?.trim() || '';
  const lessonTitle = anyLesson?.title?.trim() || '';

  if (!transcript && !lessonDesc && !lessonTitle) {
    throw new Error('No lesson content found. Please add a lesson with a video or description before generating quiz questions.');
  }

  let contentSection;
  if (transcript) {
    contentSection = `LESSON TRANSCRIPT:\n"""\n${transcript}\n"""`;
  } else {
    const lines = [
      `Course: ${courseTitle}`,
      `Chapter: ${chapterTitle}`,
      lessonTitle  ? `Lesson: ${lessonTitle}` : '',
      lessonDesc   ? `Description:\n${lessonDesc}` : '',
    ].filter(Boolean).join('\n');
    contentSection = `LESSON CONTENT:\n"""\n${lines}\n"""`;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are an expert educator. Based on the following lesson content, generate exactly 50 short-answer questions.

${contentSection}

Requirements:
- 20 beginner questions (fundamental concepts, basic recall from the content)
- 20 intermediate questions (application and understanding of the content)
- 10 advanced questions (analysis, synthesis, and deeper understanding)
- Each question must have a clear text-based answer (1–4 sentences; no multiple-choice options)
- Answers should be concise but complete — a learner reading the answer should fully understand the concept
- Questions must be directly based on the provided content

Return ONLY a valid JSON array (no markdown fences, no extra text) in this exact format:
[
  {
    "question": "Question text?",
    "answer": "A clear, concise text answer to the question.",
    "difficulty": "beginner",
    "explanation": "Optional extra context or elaboration on the answer."
  }
]`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert educator. Return ONLY a valid JSON array, no markdown.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 10000,
  });

  const raw = completion.choices[0]?.message?.content || '[]';
  let questions;
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    questions = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON.');
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('AI returned no questions.');
  }

  // Remove questions/answers that contain non-Latin script characters from the transcript
  // (Khmer, Thai, Arabic, CJK, Devanagari, etc.) — they indicate leaked transcript text
  const NON_LATIN_SCRIPT = /[؀-ۿݐ-ݿ฀-๿ऀ-ॿঀ-৿ក-៿⺀-⻿぀-ヿ㐀-䶿一-鿿가-힯]/;
  questions = questions.filter(q => {
    const combined = (q.question || '') + ' ' + (q.answer || '');
    return !NON_LATIN_SCRIPT.test(combined);
  });

  if (questions.length === 0) {
    throw new Error('All generated questions were filtered out due to non-Latin characters in the content. Please ensure the lesson has English text.');
  }

  const lastBatch = await QuizQuestion.findOne(
    { quizId, deletedAt: null },
    { batchNumber: 1 },
    { sort: { batchNumber: -1 } }
  ).lean();
  const batchNumber = (lastBatch?.batchNumber || 0) + 1;

  const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
  const docs = questions.map(q => ({
    courseId, chapterId, quizId,
    question: q.question || '',
    answer: q.answer || '',
    options: [],
    difficulty: VALID_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'beginner',
    explanation: q.explanation || '',
    batchNumber,
    status: 'active',
    deletedAt: null,
  }));

  return await QuizQuestion.insertMany(docs);
};

export const createQuestion = async (data) => {
  try {
    return await new QuizQuestion({
      courseId: data.courseId,
      chapterId: data.chapterId,
      quizId: data.quizId,
      question: data.question,
      answer: data.answer || '',
      options: data.options || [],
      difficulty: data.difficulty,
      explanation: data.explanation || '',
      batchNumber: data.batchNumber || 1,
      status: data.status || 'active',
    }).save();
  } catch (error) {
    throw error;
  }
};

export const editQuestion = async (editId) => {
  try {
    return await QuizQuestion.findOne({ _id: editId, deletedAt: null }).lean();
  } catch (error) {
    throw error;
  }
};

export const updateQuestion = async (updateId, data) => {
  try {
    const fields = [
      'courseId', 'chapterId', 'quizId', 'question', 'answer',
      'options', 'difficulty', 'explanation', 'batchNumber', 'status'
    ];
    const updateFields = {};
    for (const field of fields) {
      if (data[field] !== undefined) updateFields[field] = data[field];
    }

    if (Object.keys(updateFields).length === 0) {
      return await QuizQuestion.findOne({ _id: updateId, deletedAt: null }).lean();
    }

    updateFields.updatedAt = new Date();

    return await QuizQuestion.findOneAndUpdate(
      { _id: updateId, deletedAt: null },
      { $set: updateFields },
      { returnDocument: 'before', runValidators: true }
    ).lean();
  } catch (error) {
    throw error;
  }
};

export const listQuestions = async (filters = {}) => {
  try {
    const query = buildQuery(filters);
    return await QuizQuestion.find(query).sort({ batchNumber: 1, createdAt: 1 }).lean();
  } catch (error) {
    throw error;
  }
};

// Learner-facing question list for a chapter quiz: restricts to the admin-curated
// selection pool (Topic.quizSettings.selectedQuestionIds, falling back to every active
// question for the quiz if nothing was explicitly selected), then takes a rounded
// percentage from EACH difficulty tier's OWN selected count according to the learner's
// aptitude level for this course — e.g. at Intermediate level (10/80/10), 42 selected
// Intermediate questions contribute round(42 * 0.80) = 34, independent of how many
// Basic/Advanced questions exist. Because a percentage of a count can never round above
// that same count, no tier can ever come up short against its own target — the totals
// simply add up to whatever the three tiers' roundings produce. If the course has no
// aptitude test enabled, or no aptitude attempt is on record yet, the pool is returned
// unfiltered — the level-based split only ever applies once a per-course level exists.
export const listQuestionsForLearner = async ({ quizId, userId }) => {
  try {
    if (!quizId || !ObjectId.isValid(quizId)) return [];

    // Topic lookup and pool lookup are independent of each other (pool only needs
    // quizId, not the topic doc) — run them in parallel instead of sequentially.
    const [topic, pool0] = await Promise.all([
      Topic.findById(quizId).select('courseId quizSettings').lean(),
      QuizQuestion.find(buildQuery({ quizId })).sort({ batchNumber: 1, createdAt: 1 }).lean(),
    ]);
    const selectedIds = Array.isArray(topic?.quizSettings?.selectedQuestionIds)
      ? topic.quizSettings.selectedQuestionIds.map(String)
      : [];

    let pool = pool0;
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds);
      pool = pool.filter(q => selectedSet.has(String(q._id)));
    }

    const level = await resolveAptitudeLevel({ userId, courseId: topic?.courseId });
    if (!level) return pool;

    const byTier = { beginner: [], intermediate: [], advanced: [] };
    for (const q of pool) {
      const tier = String(q.difficulty || '').toLowerCase();
      if (byTier[tier]) byTier[tier].push(q);
    }

    const pcts = LEVEL_DIFFICULTY_SPLIT[level];
    return DIFFICULTY_TIERS.flatMap(tier => {
      const available = byTier[tier].length;
      if (available === 0) return [];
      // A small selected count can round all the way down to 0 (e.g. 4 Advanced x 10% =
      // 0.4). Rather than let a tier vanish entirely when it has any questions selected
      // and the level assigns it a nonzero share, guarantee at least 1 from it.
      const take = pcts[tier] > 0
        ? Math.max(1, Math.round(available * pcts[tier]))
        : Math.round(available * pcts[tier]);
      return byTier[tier].slice(0, take);
    });
  } catch (error) {
    throw error;
  }
};

async function resolveAptitudeLevel({ userId, courseId }) {
  if (!userId || !courseId) return null;
  const course = await Course.findById(courseId).select('aptitudeEnabled').lean();
  if (!course?.aptitudeEnabled) return null;

  const attempt = await AptitudeAttempt.findOne({ userId, courseId })
    .sort({ createdAt: -1 })
    .select('level')
    .lean();
  return attempt?.level && LEVEL_DIFFICULTY_SPLIT[attempt.level] ? attempt.level : null;
}

export const listQuestionsPagination = async (page, limit, filters = {}) => {
  try {
    const query = buildQuery(filters);
    return await QuizQuestion.find(query)
      .sort({ batchNumber: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  } catch (error) {
    throw error;
  }
};

export const getQuestionCount = async (filters = {}) => {
  try {
    const query = buildQuery(filters);
    return await QuizQuestion.countDocuments(query);
  } catch (error) {
    throw error;
  }
};

export const deleteQuestion = async (delId) => {
  try {
    return await QuizQuestion.findOneAndUpdate(
      { _id: delId, deletedAt: null },
      { $set: { deletedAt: new Date(), status: 'inactive' } },
      { returnDocument: 'before' }
    ).lean();
  } catch (error) {
    throw error;
  }
};
