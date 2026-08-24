import OpenAI from 'openai';
import { toFile } from 'openai';

// Whisper's hard limit is 25 MB; stay a little under it.
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

function extensionFor(mimetype = '') {
  if (mimetype.includes('ogg')) return 'ogg';
  if (mimetype.includes('wav')) return 'wav';
  if (mimetype.includes('mp4') || mimetype.includes('m4a')) return 'mp4';
  return 'webm';
}

// Transcribes a short voice-answer recording (used as the Firefox/Safari fallback for
// browsers with no native SpeechRecognition support) via OpenAI Whisper.
export const transcribeAudioBuffer = async (buffer, mimetype = 'audio/webm') => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in .env');
  }
  if (!buffer || buffer.length === 0) {
    return '';
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    const err = new Error('Recording is too long to transcribe. Please answer in a shorter clip.');
    err.statusCode = 400;
    throw err;
  }

  // Cap the request so a stalled upstream call can't hold the connection (and the
  // caller's HTTP request) open indefinitely.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30 * 1000 });
  const file = await toFile(buffer, `recording.${extensionFor(mimetype)}`, { type: mimetype });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text',
    language: 'en',
  });

  return typeof transcription === 'string' ? transcription.trim() : String(transcription || '').trim();
};
