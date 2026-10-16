import axios from 'axios';
import { API_URL } from './constant';
import { getAuthToken, clearGetCache } from '../service/apiService';

// Homework submissions: the learner uploads a video of the finished assignment (≤ 25 MB);
// the learner, super admins and the learner's store owner can play it back. Videos are
// fetched with the login token (never a public URL) and played from a blob URL.

export const MAX_SUBMISSION_BYTES = 25 * 1024 * 1024; // per video
export const MAX_VIDEOS_PER_ASSIGNMENT = 50;     // the highest "How many videos can upload?" allowed
export const DEFAULT_VIDEOS_PER_ASSIGNMENT = 10; // the field's default (and for assignments saved before it existed)

/** The most videos a learner can ever upload for an assignment ("How many videos can upload?"). */
export const videoLimitOf = (topic) => {
  const n = Number(topic?.maxVideos);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_VIDEOS_PER_ASSIGNMENT) : DEFAULT_VIDEOS_PER_ASSIGNMENT;
};
export const SUBMISSION_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/3gpp,.mp4,.webm,.mov,.mkv,.avi,.m4v,.3gp';

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** "12.4 MB" */
export function formatBytes(n) {
  if (!n && n !== 0) return '—';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** A video's reviewer comments, oldest first (older data has only a single `comment`). */
export const videoComments = (video) => (Array.isArray(video?.comments) && video.comments.length
  ? video.comments
  : (video?.comment && (video.comment.note || video.comment.status) ? [video.comment] : []));

/** "15-10-2026" */
export function formatDayDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
}

/** Why this file can't be submitted, or '' when it's fine. */
export function checkSubmissionFile(file) {
  if (!file) return 'Please choose a video.';
  const isVideo = /^video\//.test(file.type || '') || /\.(mp4|webm|mov|mkv|avi|m4v|3gp)$/i.test(file.name || '');
  if (!isVideo) return 'Please choose a video file (MP4, WebM, MOV…).';
  if (file.size > MAX_SUBMISSION_BYTES) return `This video is ${formatBytes(file.size)} — it must be 25 MB or smaller.`;
  return '';
}

/**
 * Uploads the learner's video and marks the homework done.
 * @returns {Promise<object>} the saved record ({ _id, topicId, submission })
 */
export async function uploadAssignmentVideo({ courseId, topicId, file, onProgress, signal }) {
  const form = new FormData();
  form.append('courseId', courseId);
  form.append('topicId', topicId);
  form.append('video', file);
  try {
    const res = await axios.post(`${API_URL}/topic-activity/assignment-submit`, form, {
      headers: authHeaders(),
      signal,
      onUploadProgress: e => { if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100)); },
    });
    clearGetCache();
    return res.data?.data;
  } catch (err) {
    throw new Error(err?.response?.data?.message || 'Upload failed. Please try again.');
  }
}

/** Loads video `n` (1-based; default the latest) of a submission and returns a blob URL to play (revoke it when done). */
export async function loadSubmissionVideo(id, n) {
  const v = Number.isInteger(n) && n > 0 ? `?v=${n}` : '';
  const res = await fetch(`${API_URL}/topic-activity/submissions/${id}/video${v}`, { headers: authHeaders() });
  if (!res.ok) {
    let message = 'Could not load the video.';
    try { message = (await res.json()).message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  return URL.createObjectURL(await res.blob());
}

/**
 * onPlay handler: pause every other video in the same list (the nearest <ul>),
 * so only one submission video plays at a time.
 */
export function pauseOtherVideos(e) {
  const current = e.currentTarget;
  const list = current.closest('ul') || document;
  list.querySelectorAll('video').forEach(v => { if (v !== current && !v.paused) v.pause(); });
}
