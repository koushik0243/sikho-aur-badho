import mongoose from 'mongoose';
import Progress from './progress.model.js';

export const updateProgress = async ({ userId, courseId, topicId, watchedSeconds, durationSeconds, lastPosition }) => {
  const pct = durationSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100)) : 0;
  const completed = pct >= 80;

  return await Progress.findOneAndUpdate(
    { userId, topicId },
    {
      userId, courseId, topicId,
      watchedSeconds:  Math.floor(watchedSeconds),
      durationSeconds: Math.floor(durationSeconds),
      percentage:      pct,
      lastPosition:    Math.floor(lastPosition ?? watchedSeconds),
      completed,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
};

export const getCourseProgress = async ({ userId, courseId }) => {
  const records = await Progress.find({
    userId,
    courseId: new mongoose.Types.ObjectId(courseId),
  }).lean();

  const totalDuration = records.reduce((s, r) => s + (r.durationSeconds || 0), 0);
  const totalWatched  = records.reduce((s, r) => s + Math.min(r.watchedSeconds || 0, r.durationSeconds || 0), 0);
  const overallPercent = totalDuration > 0 ? Math.min(100, Math.round((totalWatched / totalDuration) * 100)) : 0;

  return { overallPercent, topics: records };
};
