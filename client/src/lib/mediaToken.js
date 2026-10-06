'use client';
import { useState, useEffect } from 'react';
import apiServiceHandler from '../service/apiService';
import { API_URL } from './constant';

// Course content under /uploads (lesson videos/images, assignments, intro
// videos) is only served with a short-lived media token — see
// server/middleware/mediaAuth.js. This fetches and caches that token, refreshes
// it before it expires, and adds it to file URLs.

const REFRESH_EARLY_MS = 5 * 60 * 1000; // refresh 5 min before expiry

let cached = null;    // { token, expiresAt }
let inflight = null;  // Promise<string|null>

/** @returns {Promise<string|null>} a valid media token, or null if not logged in. */
export async function getMediaToken() {
  if (cached && cached.expiresAt - Date.now() > REFRESH_EARLY_MS) return cached.token;
  if (!inflight) {
    // Timestamp defeats apiServiceHandler's 60s GET cache.
    inflight = apiServiceHandler('GET', `media/token?t=${Date.now()}`)
      .then(res => {
        const data = res?.data ?? {};
        if (!data.token) return null;
        cached = { token: data.token, expiresAt: Date.now() + (Number(data.expiresIn) || 0) * 1000 };
        return data.token;
      })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Forget the cached token (e.g. on logout). */
export function clearMediaToken() { cached = null; }

/**
 * Full URL for an uploaded file, with the media token added for /uploads paths.
 * Returns null when there's no path, or while a protected file's token is still loading.
 * @param {string|null|undefined} filePath  e.g. "/uploads/lesson-videos/123.mp4" or an absolute URL
 * @param {string|null} token
 */
export function secureMediaUrl(filePath, token) {
  if (!filePath) return null;
  const isExternal = /^https?:\/\//i.test(filePath) && !filePath.startsWith(API_URL);
  if (isExternal) return filePath;
  const full = filePath.startsWith('http') ? filePath : `${API_URL}${filePath}`;
  if (!full.includes('/uploads/')) return full;
  if (!token) return null;
  return `${full}${full.includes('?') ? '&' : '?'}mt=${encodeURIComponent(token)}`;
}

/**
 * React hook: [token, refresh]. token is null until loaded and is kept fresh;
 * refresh() forces a new one (e.g. after a long-open video's token expired).
 */
export function useMediaToken() {
  const [token, setToken] = useState(() => (cached && cached.expiresAt - Date.now() > REFRESH_EARLY_MS ? cached.token : null));

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const load = async () => {
      const t = await getMediaToken();
      if (cancelled) return;
      setToken(t);
      if (t && cached) {
        const wait = Math.max(30 * 1000, cached.expiresAt - Date.now() - REFRESH_EARLY_MS);
        timer = setTimeout(load, wait);
      }
    };
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  const refresh = async () => {
    clearMediaToken();
    const t = await getMediaToken();
    setToken(t);
    return t;
  };

  return [token, refresh];
}
