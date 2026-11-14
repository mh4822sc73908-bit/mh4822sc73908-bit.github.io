import { $, esc, state, get, render, fmtDate, fmtScore, lineChart, barChart, donut, LEVEL_BADGE } from './core.js';
import { compareHtml } from './student.js';

const back = () => state.user.role === 'student' ? '#/s' : state.user.role === 'parent' ? '#/p' : '#/a/results';
const header = (title, sub) => `<div class="report-head"><img src="logo.jpg" alt=""><div><h1 style="margin:0">${esc(title)}</h1><div class="muted small">منصة ابوسالم في القدرات — ${esc(sub)}</div></div></div>`;
const toolbar = (extra = '') => `<div class="row no-print" style="margin-bottom:12px"><a class="btn ghost sm" href="${back()}">رجوع</a><button class="btn sm" id="print">🖨️ طباعة / حفظ PDF</button>${extra}<span class="hint">اختر «حفظ بتنسيق PDF» من نافذة الطباعة.</span></div>`;
const bindPrint = () => { const b = $('#print'); if (b) b.onclick = () => window.print(); };
const skillTable = (skills) => `<div class="table-wrap"><table><tr><th>المهارة</th><th>الصفحات</th><th>عدد الأسئلة</th><th>الصحيحة</th><th>النسبة</th><th>التصنيف</th></tr>
  ${skills.map(k => `<tr><td>${esc(k.name)}</td><td>${(k.pages || []).join('، ') || '—'}</td><td>${k.n}</td><td>${k.correct}</td><td>${k.pct}%</td><td><span class="badge ${LEVEL_BADGE[k.level]}">${esc(k.label)}</span></td></tr>`).join('')}</table></div>`;

export async function attemptReport(id) {
  const r = await get(`/api/reports/attempt/${id}`);
  const SC = { best: 'أعلى محاولة', last: 'آخر محاولة', first: 'أول محاولة' };
  const el = render(`${toolbar(state.user.role === 'student' ? `<a class="btn ghost sm" href="#/report/student/${r.student.id}">التقرير التراكمي</a>` : '')}
  <div class="card">
    ${header('تقرير التقويم', r.assessment.title)}
    <div class="kv">
      <div><span>الطالب</span><b>${esc(r.student.name)}</b></div><div><span>الصف</span><b>${esc(r.student.grade || '—')}</b></div>
      <div><span>المقرر</span><b>${esc(r.course.title)}</b></div><div><span>تاريخ الاختبار</span><b>${fmtDate(r.attempt.submitted_at, true)}</b></div>
      <div><span>المحاولة</span><b>${r.attempt.attempt_no} ${r.attempt.is_official ? '<span class="badge green">المعتمدة</span>' : ''}</b></div><div><span>المحاولة المعتمدة للدرجة</span><b>${SC[r.assessment.scoring]}</b></div>
    </div>
  </div>
  <div class="grid g4">
    <div class="stat"><div class="v">${fmtScore(r.score)}<small style="font-size:.9rem">/100</small></div><div class="l">الدرجة (${fmtScore(r.score)}%) ${r.passed ? '<span class="badge green">مجتاز</span>' : `<span class="badge amber">دون ${r.assessment.pass_score}</span>`}</div></div>
    <div class="stat"><div class="v" style="color:var(--green)">${r.correct}</div><div class="l">إجابات صحيحة</div></div>
    <div class="stat"><div class="v" style="color:var(--red)">${r.wrong}</div><div class="l">إجابات خاطئة</div></div>
    <div class="stat"><div class="v">${r.blank}</div><div class="l">متروكة</div></div>
    <div class="stat"><div class="v" style="font-size:1.2rem">${esc(r.attempt.duration)}</div><div class="l">زمن الإجابة${r.attempt.submit_reason === 'timeout' ? ' (سُلّم عند انتهاء الوقت)' : ''}</div></div>
  </div>
  ${r.excluded ? `<div class="note">${r.excluded} سؤال لم يظهر للطالب بسبب خلل تقني، فلم يُحتسب خطأً واستُبعد من الحساب${r.attempt.needs_review ? '، والحالة مسجّلة لمراجعة المدير' : ''}. ${esc(r.attempt.review_note || '')}</div>` : ''}
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2>توزيع الإجابات</h2>${donut([{ l: 'صحيحة', v: r.correct, c: '#1f8a5b' }, { l: 'خاطئة', v: r.wrong, c: '#c0392b' }, { l: 'متروكة', v: r.blank, c: '#9aa5b5' }])}</div>
    <div class="card"><h2>المقارنة بالمحاولات السابقة</h2>
      ${r.history.length > 1 ? lineChart(r.history.map(h => ({ v: h.score, l: `م${h.attempt_no}` })), { height: 190 }) : '<p class="muted">هذه أول محاولة في هذا التقويم.</p>'}
      ${r.change != null ? `<p>${r.change >= 0 ? `📈 تحسّن بمقدار <b>${fmtScore(r.change)}</b> درجة عن المحاولة السابقة.` : `📉 أقل بمقدار <b>${fmtScore(-r.change)}</b> درجة من المحاولة السابقة؛ خطة التحسين أدناه تساعدك.`}</p>` : ''}
    </div>
  </div>
  <div class="card"><h2>الأداء في كل مهارة</h2>
    <p class="small muted">التصنيف: متقن ≥ ${r.thresholds.high}٪، قريب من الإتقان ≥ ${r.thresholds.mid}٪، وأقل من ذلك يحتاج إلى دعم. المهارة التي لها أقل من ${r.thresholds.min} أسئلة تُعرض «بيانات غير كافية».</p>
    ${barChart(r.skills)}<div style="margin-top:12px">${skillTable(r.skills)}</div></div>
  <div class="grid g2">
    <div class="card"><h2>نقاط القوة</h2>${r.strengths.length ? `<ul>${r.strengths.map(k => `<li>${esc(k.name)} (${k.pct}%)</li>`).join('')}</ul>` : '<p class="muted">لا توجد مهارة مصنفة «متقن» في هذه المحاولة.</p>'}</div>
    <div class="card"><h2>مهارات تحتاج إلى دعم</h2>${r.weak.length ? `<ul>${r.weak.map(k => `<li>${esc(k.name)} — ${esc(k.label)} (${k.pct}%)</li>`).join('')}</ul>` : '<p class="muted">لا توجد مهارات ضعيفة بحسب الأسئلة المتاحة.</p>'}
      ${r.insufficient.length ? `<p class="small muted">بيانات غير كافية للحكم على: ${r.insufficient.map(k => esc(k.name)).join('، ')}.</p>` : ''}</div>
  </div>
  <div class="card"><h2>الصفحات والموضوعات المقترح مراجعتها</h2>${r.pagesToReview.length ? `<p>صفحات الملف: <b>${r.pagesToReview.join('، ')}</b></p>` : '<p class="muted">لا توجد صفحات محددة للمراجعة.</p>'}</div>
  <div class="card"><h2>خطة التحسين الشخصية</h2>
    ${r.plan.length ? r.plan.map((p, i) => `<div class="example"><b>${i + 1}. ${esc(p.skill)}</b> <span class="badge ${p.level === 'يحتاج إلى دعم' ? 'red' : 'amber'}">${esc(p.level)}</span>
      <ol>${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${state.user.role === 'student' && p.lesson ? `<div class="row no-print"><a class="btn ghost sm" href="#/s/course/${r.course.id}/learn/${p.lesson.id}">الشرح المقترح</a><a class="btn ghost sm" href="#/s/course/${r.course.id}/practice?skill=${p.skill_id}">التدريب</a><a class="btn ghost sm" href="#/s/course/${r.course.id}/assess">إعادة التقويم</a></div>` : ''}</div>`).join('')
      : '<p>أداء ممتاز! استمر في التدريب للمحافظة على مستواك.</p>'}</div>
  ${state.user.role !== 'parent' ? `<div class="card"><h2>المقارنة مع الزملاء</h2>${compareHtml(r.comparison)}</div>` : `<div class="card"><h2>مؤشر المجموعة</h2>${r.comparison.insufficient ? `<p class="muted">${esc(r.comparison.message)}</p>` : `<p>متوسط المجموعة: <b>${fmtScore(r.comparison.average)}</b> — عدد المشاركين: <b>${r.comparison.participants}</b></p>`}</div>`}
  <div class="card"><h2>مراجعة الأسئلة</h2>
    ${r.questions.map(q => `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between small"><b>${q.n}. ${esc(q.skill)}</b><span>${q.status === 'correct' ? '<span class="badge green">صحيحة</span>' : q.status === 'wrong' ? '<span class="badge red">خاطئة</span>' : q.status === 'blank' ? '<span class="badge gray">متروكة</span>' : '<span class="badge amber">مستبعدة (خلل تقني)</span>'} <span class="badge gray">ص ${q.file_page ?? '—'}</span></span></div>
      <p style="margin:6px 0">${esc(q.stem)}</p>
      <div class="small">${q.chosen != null ? `إجابتك: <b>${esc(q.choices[q.chosen])}</b> · ` : ''}الصحيحة: <b style="color:var(--green-2)">${esc(q.choices[q.answer])}</b></div>
      <div class="small muted">التفسير: ${esc(q.explanation)}</div></div>`).join('')}</div>
  <p class="note small">${esc(r.disclaimer)}</p>`);
  bindPrint();
}

export async function studentReport(id) {
  const r = await get(`/api/reports/student/${id}`);
  const s = r.student;
  render(`${toolbar()}
  <div class="card">${header('التقرير التراكمي', s.name)}
    <div class="kv">
      <div><span>الطالب</span><b>${esc(s.name)}</b></div><div><span>الصف</span><b>${esc(s.grade || '—')}</b></div>
      <div><span>الاختبار القادم</span><b>${s.next_test_date ? fmtDate(s.next_test_date) : 'لم يُحدد بعد'}</b></div>
      <div><span>الحالة</span><b>${r.started ? 'بدأ' : 'لم يبدأ بعد'}</b></div>
      <div><span>تاريخ التقرير</span><b>${fmtDate(new Date().toISOString())}</b></div>
    </div></div>
  <div class="card"><h2>المقررات ونسبة الإنجاز</h2>
    ${r.courses.length ? `<div class="table-wrap"><table><tr><th>المقرر</th><th>الصفحات</th><th>موعد الإنجاز</th><th>الشرح</th><th>التدريب (مهارات)</th><th>الإنجاز</th></tr>
      ${r.courses.map(c => `<tr><td>${esc(c.title)}</td><td>${esc(c.pages_label || '')}</td><td>${c.due_date ? fmtDate(c.due_date) : '—'}</td><td>${c.progress.lessonsDone}/${c.progress.lessonsTotal}</td><td>${c.progress.skillsPracticed}/${c.progress.skillsTotal}</td><td><b>${c.progress.pct}%</b></td></tr>`).join('')}</table></div>` : '<p class="muted">لا توجد مقررات منشورة.</p>'}
    ${r.activity ? `<p class="small" style="margin-top:8px">آخر نشاط: ${esc(r.activity.type)} — ${esc(r.activity.text)} (${fmtDate(r.activity.at, true)})</p>` : '<p class="small muted">لا يوجد نشاط تعليمي بعد.</p>'}</div>
  <div class="card"><h2>تطور المستوى</h2>${lineChart(r.attempts.map((a, i) => ({ v: a.score, l: `م${i + 1}` })))}
    ${r.attempts.length ? `<div class="table-wrap"><table><tr><th>#</th><th>التقويم</th><th>المحاولة</th><th>الدرجة</th><th>صحيحة/خاطئة/متروكة</th><th>الزمن</th><th>التاريخ</th><th class="no-print"></th></tr>
      ${r.attempts.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.title)}</td><td>${a.attempt_no}</td><td><b>${fmtScore(a.score)}</b></td><td>${a.correct}/${a.wrong}/${a.blank}</td><td>${esc(a.duration)}</td><td>${fmtDate(a.submitted_at, true)}</td><td class="no-print"><a href="#/report/attempt/${a.id}">التقرير</a></td></tr>`).join('')}</table></div>` : ''}</div>
  <div class="card"><h2>الأداء التراكمي في المهارات</h2><p class="small muted">محسوب من جميع محاولات التقويم المكتملة.</p>${barChart(r.skills)}${r.skills.length ? `<div style="margin-top:12px">${skillTable(r.skills)}</div>` : ''}</div>
  <div class="grid g2">
    <div class="card"><h2>نقاط القوة</h2>${r.strengths.length ? `<ul>${r.strengths.map(k => `<li>${esc(k.name)} (${k.pct}%)</li>`).join('')}</ul>` : '<p class="muted">—</p>'}</div>
    <div class="card"><h2>نقاط تحتاج إلى دعم</h2>${r.weak.length ? `<ul>${r.weak.map(k => `<li>${esc(k.name)} — ${esc(k.label)} (${k.pct}%)</li>`).join('')}</ul>` : '<p class="muted">—</p>'}</div>
  </div>
  <div class="card"><h2>نشاط التدريب</h2>${r.practice.length ? `<div class="table-wrap"><table><tr><th>المهارة</th><th>محاولات</th><th>صحيحة</th></tr>${r.practice.map(p => `<tr><td>${esc(p.name || '—')}</td><td>${p.total}</td><td>${p.correct}</td></tr>`).join('')}</table></div>` : '<p class="muted">لم يتدرب بعد.</p>'}
    ${r.frequentErrors.length ? `<h3 style="margin-top:12px">أخطاء متكررة في التدريب</h3><ul>${r.frequentErrors.map(f => `<li>${esc(f.skill || '')}: ${esc(f.stem)} <span class="muted">(${f.misses} مرات)</span></li>`).join('')}</ul>` : ''}</div>
  <div class="card"><h2>خطة التحسين</h2>${r.plan.length ? r.plan.map((p, i) => `<div class="example"><b>${i + 1}. ${esc(p.skill)}</b><ol>${p.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`).join('') : '<p class="muted">لا توجد مهارات تحتاج خطة تحسين حاليًا، أو لا توجد بيانات تقويم كافية بعد.</p>'}</div>
  <p class="note small">${esc(r.disclaimer)}</p>`);
  bindPrint();
}
