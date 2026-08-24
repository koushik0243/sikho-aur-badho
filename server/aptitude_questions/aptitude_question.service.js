import mongoose from 'mongoose';
import OpenAI from 'openai';
import AptitudeQuestion from './aptitude_question.model.js';

const { ObjectId } = mongoose.Types;

const buildQuery = (filters = {}) => {
  const query = { deletedAt: null, status: { $ne: 'inactive' } };
  if (filters.status) query.status = filters.status;
  if (filters.courseId && ObjectId.isValid(filters.courseId)) {
    query.courseId = new ObjectId(filters.courseId);
  }
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.batchNumber) query.batchNumber = filters.batchNumber;
  return query;
};

export const generateAndSaveQuestions = async ({ courseId, courseTitle, courseDesc, context }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in .env');
  }

  const trimmedContext = (context || '').trim();
  if (!trimmedContext) {
    throw new Error('Context is required to generate aptitude questions.');
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const contentSection = [
    courseTitle ? `Course: ${courseTitle}` : '',
    courseDesc ? `Description:\n${courseDesc}` : '',
    `CONTEXT:\n"""\n${trimmedContext}\n"""`,
  ].filter(Boolean).join('\n');

  const prompt = `You are an expert aptitude-test author. Based on the following context, generate exactly 50 short-answer aptitude questions.

${contentSection}

Requirements:
- 20 beginner questions (fundamental concepts, basic recall from the content)
- 20 intermediate questions (application and understanding of the content)
- 10 advanced questions (analysis, synthesis, and deeper understanding)
- Each question must have a clear text-based answer (1–4 sentences; no multiple-choice options)
- Answers should be concise but complete — a learner reading the answer should fully understand the concept
- Questions must be directly based on the provided context

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
      { role: 'system', content: 'You are an expert aptitude-test author. Return ONLY a valid JSON array, no markdown.' },
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

  // Remove questions/answers that contain non-Latin script characters
  // (Khmer, Thai, Arabic, CJK, Devanagari, etc.) — indicates leaked/garbled content
  const NON_LATIN_SCRIPT = /[؀-ۿݐ-ݿ฀-๿ऀ-ॿঀ-৿ក-៿⺀-⻿぀-ヿ㐀-䶿一-鿿가-힯]/;
  questions = questions.filter(q => {
    const combined = (q.question || '') + ' ' + (q.answer || '');
    return !NON_LATIN_SCRIPT.test(combined);
  });

  if (questions.length === 0) {
    throw new Error('All generated questions were filtered out due to non-Latin characters in the content. Please ensure the context is in English.');
  }

  const batchFilter = { deletedAt: null };
  if (courseId && ObjectId.isValid(courseId)) batchFilter.courseId = new ObjectId(courseId);
  else batchFilter.courseId = null;

  const lastBatch = await AptitudeQuestion.findOne(
    batchFilter,
    { batchNumber: 1 },
    { sort: { batchNumber: -1 } }
  ).lean();
  const batchNumber = (lastBatch?.batchNumber || 0) + 1;

  const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
  const docs = questions.map(q => ({
    courseId: courseId && ObjectId.isValid(courseId) ? courseId : null,
    question: q.question || '',
    answer: q.answer || '',
    difficulty: VALID_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : 'beginner',
    explanation: q.explanation || '',
    batchNumber,
    status: 'active',
    deletedAt: null,
  }));

  return await AptitudeQuestion.insertMany(docs);
};

export const listQuestions = async (filters = {}) => {
  try {
    const query = buildQuery(filters);
    return await AptitudeQuestion.find(query).sort({ batchNumber: 1, createdAt: 1 }).lean();
  } catch (error) {
    throw error;
  }
};

export const attachCourseId = async (ids, courseId) => {
  try {
    const validIds = (ids || []).filter(id => ObjectId.isValid(id));
    if (!validIds.length || !ObjectId.isValid(courseId)) return { modifiedCount: 0 };
    return await AptitudeQuestion.updateMany(
      { _id: { $in: validIds }, deletedAt: null },
      { $set: { courseId, updatedAt: new Date() } }
    );
  } catch (error) {
    throw error;
  }
};
