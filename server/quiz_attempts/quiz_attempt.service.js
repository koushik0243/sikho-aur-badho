import OpenAI from 'openai';
import QuizAttempt from './quiz_attempt.model.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function evaluateAnswer(questionText, userAnswer, maxScore) {
  if (!userAnswer?.trim()) {
    return { score: 0, feedback: 'No answer provided.' };
  }
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a quiz evaluator. Return JSON only. Be lenient with grammar — answers are voice-transcribed.',
        },
        {
          role: 'user',
          content: `Rate this answer from 0 to 10.\n\nQuestion: ${questionText}\nStudent Answer: ${userAnswer}\n\nRubric:\n10 = fully correct and complete\n7-9 = mostly correct, minor gaps\n4-6 = partially correct, shows understanding\n1-3 = minimal relevant content\n0 = wrong, off-topic, or empty\n\nReturn: {"rating": <0-10>, "feedback": "<one concise sentence>"}`,
        },
      ],
    });
    const parsed = JSON.parse(res.choices[0].message.content);
    const rating = Math.min(10, Math.max(0, Number(parsed.rating) || 0));
    return {
      score: Math.round((rating / 10) * maxScore * 10) / 10,
      feedback: String(parsed.feedback || '').slice(0, 200),
    };
  } catch {
    return { score: 0, feedback: 'Evaluation unavailable.' };
  }
}

export const submitAttempt = async ({ userId, topicId, courseId, chapterId, answers }) => {
  const n = answers.length;
  if (n === 0) throw new Error('No answers submitted.');

  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;

  const withMax = answers.map((a, i) => ({
    ...a,
    maxScore: i === n - 1 ? base + remainder : base,
  }));

  const evaluations = await Promise.all(
    withMax.map(a => evaluateAnswer(a.questionText, a.userAnswer, a.maxScore))
  );

  const evaluated = withMax.map((a, i) => ({
    ...a,
    aiScore:    evaluations[i].score,
    aiFeedback: evaluations[i].feedback,
  }));

  const totalScore = Math.min(100, Math.round(evaluated.reduce((s, a) => s + a.aiScore, 0)));
  const passed = totalScore >= 60;

  const attempt = await QuizAttempt.create({
    userId, topicId, courseId, chapterId,
    answers: evaluated,
    totalScore,
    passed,
    status: 'evaluated',
    evaluatedAt: new Date(),
  });

  return attempt;
};

export const getAttemptHistory = async ({ userId, topicId }) => {
  return await QuizAttempt.find({ userId, topicId })
    .select('totalScore passed createdAt')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
};

export const getAttemptsByCourse = async ({ userId, courseId, chapterId }) => {
  const query = { userId, courseId };
  if (chapterId) query.chapterId = chapterId;
  return await QuizAttempt.find(query)
    .populate('topicId',   'title')
    .populate('chapterId', 'title')
    .sort({ createdAt: -1 })
    .lean();
};

export const getAttemptsByCourseAdmin = async ({ courseId }) => {
  return await QuizAttempt.find({ courseId })
    .populate('userId',    'name email')
    .populate('topicId',   'title')
    .populate('chapterId', 'title')
    .sort({ createdAt: -1 })
    .lean();
};
