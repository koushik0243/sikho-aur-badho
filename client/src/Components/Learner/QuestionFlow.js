'use client';
import s from './QuestionFlow.module.css';

// Shared rules for the learner's voice-answer quiz and aptitude test: a test can
// only be submitted once every question has an answer. Skipped questions and
// "answered" ones with no recorded speech both count as unanswered.

/** @param {Record<string, {status: string, transcript?: string}>} answers */
export function isQuestionAnswered(answers, question) {
  const a = answers[String(question._id)];
  return a?.status === 'answered' && !!String(a.transcript || '').trim();
}

export function unansweredIndexes(questions, answers) {
  return questions.reduce((acc, q, i) => (isQuestionAnswered(answers, q) ? acc : [...acc, i]), []);
}

export function nextUnansweredAfter(questions, answers, fromIdx) {
  for (let i = fromIdx + 1; i < questions.length; i++) {
    if (!isQuestionAnswered(answers, questions[i])) return i;
  }
  return -1;
}

export function prevUnansweredBefore(questions, answers, fromIdx) {
  for (let i = fromIdx - 1; i >= 0; i--) {
    if (!isQuestionAnswered(answers, questions[i])) return i;
  }
  return -1;
}

// Cycling variants: Next/Previous only ever land on unanswered questions, and
// wrap past the end/start. Returns -1 when no OTHER question is unanswered.
export function nextUnansweredCycling(questions, answers, fromIdx) {
  const n = questions.length;
  for (let step = 1; step < n; step++) {
    const i = (fromIdx + step) % n;
    if (!isQuestionAnswered(answers, questions[i])) return i;
  }
  return -1;
}

export function prevUnansweredCycling(questions, answers, fromIdx) {
  const n = questions.length;
  for (let step = 1; step < n; step++) {
    const i = (fromIdx - step + n) % n;
    if (!isQuestionAnswered(answers, questions[i])) return i;
  }
  return -1;
}

/**
 * Lists the questions still waiting for an answer, as "Q1. <question>" lines.
 * @param {{ items: {n: number, question: string}[], onClose: () => void }} props
 */
export function UnansweredAlert({ items, onClose }) {
  if (!items?.length) return null;
  return (
    <div className={s.overlay} role="alertdialog" aria-modal="true" aria-labelledby="unanswered-title">
      <div className={s.box}>
        <h3 id="unanswered-title" className={s.title}>Unanswered questions</h3>
        <ul className={s.list}>
          {items.map(it => (
            <li key={it.n} className={s.item}>
              <span className={s.num}>Q{it.n}.</span> {it.question}
            </li>
          ))}
        </ul>
        <p className={s.note}>Please answer all the questions.</p>
        <button type="button" className={s.okBtn} onClick={onClose} autoFocus>OK</button>
      </div>
    </div>
  );
}
