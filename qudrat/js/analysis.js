// تحليل الأداء: يُحسب في المتصفح من بيانات يسلّمها الخادم بعد التحقق من الصلاحية
const num = (v) => (v === null || v === undefined || v === 'null' ? null : Number(v));
export const fmtDur = (sec) => (sec == null ? '—' : `${Math.floor(sec / 60)} د ${sec % 60} ث`);

export function classify(pct, n, s) {
  if (n < s.min_skill_questions) return { level: 'insufficient', label: 'بيانات غير كافية' };
  if (pct >= s.mastery_high) return { level: 'mastered', label: 'متقن' };
  if (pct >= s.mastery_mid) return { level: 'near', label: 'قريب من الإتقان' };
  return { level: 'support', label: 'يحتاج إلى دعم' };
}

export function grade(att) {
  const snap = att.snapshot, answers = att.answers || {}, seen = new Set((att.seen || []).map(Number));
  return snap.map((q, i) => {
    const a = num(answers[i]);
    let status;
    if (!seen.has(i) && a === null) status = 'excluded';
    else if (a === null) status = 'blank';
    else if (a === q.answer) status = 'correct';
    else status = 'wrong';
    return { i, status, chosen: a };
  });
}

function skillAgg(atts, s) {
  const m = new Map();
  for (const at of atts) {
    const items = grade(at);
    at.snapshot.forEach((q, i) => {
      if (items[i].status === 'excluded') return;
      const k = q.skill_id ?? 0;
      if (!m.has(k)) m.set(k, { skill_id: q.skill_id, name: q.skill_name, n: 0, correct: 0, pages: new Set(), users: new Set() });
      const x = m.get(k); x.n++; if (items[i].status === 'correct') x.correct++; if (q.file_page) x.pages.add(q.file_page); if (at.user_id) x.users.add(at.user_id);
    });
  }
  return [...m.values()].map(x => {
    const pct = x.n ? Math.round((x.correct / x.n) * 100) : 0;
    return { skill_id: x.skill_id, name: x.name, n: x.n, correct: x.correct, pct, pages: [...x.pages].sort((a, b) => a - b), students: x.users.size, ...classify(pct, x.n, s) };
  }).sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0));
}
const planFor = (k, lesson) => ({
  skill_id: k.skill_id, skill: k.name, level: k.label,
  lesson: lesson ? { id: lesson.id, title: lesson.title, page: lesson.file_page } : null,
  steps: [
    `راجع شرح «${k.name}»${k.pages.length ? ` (صفحة الملف ${k.pages.join('، ')})` : ''}.`,
    `تدرّب على مهارة «${k.name}» في الجزء التدريبي حتى تجيب صحيحًا عن 3 أسئلة متتالية.`,
    'أعد التقويم بعد إتمام التدريب لقياس التحسن.',
  ],
});

export function attemptReport(d) {
  const s = d.settings, a = d.attempt, snap = a.snapshot;
  const items = grade(a);
  const cnt = (st) => items.filter(x => x.status === st).length;
  const skills = skillAgg([a], s);
  const weak = skills.filter(k => k.level === 'support' || k.level === 'near');
  const lessonBySkill = new Map(d.lessons.map(l => [l.skill_id, l]));
  const prev = d.history.filter(h => h.attempt_no < a.attempt_no).pop() || null;
  const score = Number(a.score);
  return {
    attempt: { id: a.id, attempt_no: a.attempt_no, started_at: a.started_at, submitted_at: a.submitted_at, duration_sec: a.duration_sec, duration: fmtDur(a.duration_sec),
      submit_reason: a.submit_reason, needs_review: a.needs_review, review_note: a.review_note, is_official: a.is_official },
    student: d.student, course: d.course, assessment: d.assessment,
    total: snap.length, counted: snap.length - cnt('excluded'),
    score, correct: cnt('correct'), wrong: cnt('wrong'), blank: cnt('blank'), excluded: cnt('excluded'),
    passed: score >= d.assessment.pass_score,
    skills, strengths: skills.filter(k => k.level === 'mastered'), weak, insufficient: skills.filter(k => k.level === 'insufficient'),
    pagesToReview: [...new Set(weak.flatMap(k => k.pages))].sort((x, y) => x - y),
    plan: weak.slice().sort((x, y) => x.pct - y.pct).map(k => planFor(k, lessonBySkill.get(k.skill_id))),
    history: d.history.map(h => ({ ...h, score: Number(h.score) })), previous: prev, change: prev ? Math.round((score - Number(prev.score)) * 10) / 10 : null,
    questions: snap.map((q, i) => ({ n: i + 1, stem: q.stem, choices: q.choices, answer: q.answer, chosen: items[i].chosen, status: items[i].status,
      explanation: q.explanation, skill: q.skill_name, file_page: q.file_page, printed_page: q.printed_page, difficulty: q.difficulty })),
    thresholds: { high: s.mastery_high, mid: s.mastery_mid, min: s.min_skill_questions },
    comparison: d.comparison,
    disclaimer: 'هذه الدرجة تقويم داخلي للمنصة، وليست درجة رسمية ولا توقعًا مؤكدًا لنتيجة اختبار القدرات.',
  };
}

export function cumulative(d) {
  const s = d.settings;
  const skills = skillAgg(d.attempts, s);
  const weak = skills.filter(k => k.level === 'support' || k.level === 'near');
  return {
    ...d,
    attempts: d.attempts.map(a => ({ id: a.id, title: a.title, attempt_no: a.attempt_no, score: Number(a.score), submitted_at: a.submitted_at, duration: fmtDur(a.duration_sec), correct: a.correct, wrong: a.wrong, blank: a.blank })),
    skills, strengths: skills.filter(k => k.level === 'mastered'), weak,
    plan: weak.map(k => ({ skill: k.name, steps: planFor(k).steps })),
    thresholds: { high: s.mastery_high, mid: s.mastery_mid, min: s.min_skill_questions },
    disclaimer: 'الدرجات تقويم داخلي للمنصة، وليست درجات رسمية ولا توقعًا مؤكدًا لنتيجة اختبار القدرات.',
  };
}

export function groupSkills(attempts, s) {
  return skillAgg(attempts, s).sort((a, b) => a.pct - b.pct);
}
