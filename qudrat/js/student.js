import { $, $$, esc, state, get, post, put, render, errorBox, toast, fmtDate, fmtScore, lineChart, countdown, openPage, form, normDigits, confirmBox, DIFF } from './core.js';
import { gradeOptions, setLeaveGuard, go } from './main.js';

const pct = (n) => `<div class="bar" aria-label="${n}%"><span style="width:${n}%"></span></div>`;

export async function dashboard() {
  const d = await get('/api/student/dashboard');
  const s = d.student;
  const unread = d.announcements.filter(a => !a.read);
  const cur = d.courses[0];
  render(`
  <div class="row between" style="margin-bottom:12px"><h1 style="margin:0">مرحبًا ${esc(s.name)} 👋</h1>
    <a class="btn green" href="#/s/path" style="font-size:1.05rem">الدخول إلى مسار القدرات ←</a></div>
  ${!d.started ? `<div class="info"><b>حالتك: لم يبدأ بعد.</b> ابدأ بالشرح ثم التدريب ثم التقويم، وستظهر هنا نسبة إنجازك ودرجاتك.</div>` : ''}
  <div class="grid g2">
    <div class="card">
      <div class="row between"><h2>بياناتي الدراسية</h2><a class="btn ghost sm" href="#/s/profile">تحديث</a></div>
      <div class="kv">
        <div><span>الصف</span><b>${esc(s.grade || '—')}</b></div>
        <div><span>اختبارات ورقية سابقة</span><b>${s.paper_tests ?? 0}</b></div>
        <div><span>اختبارات محوسبة سابقة</span><b>${s.computer_tests ?? 0}</b></div>
        <div><span>الدورة / المركز</span><b>${esc(s.course_center || 'غير مسجل')}</b></div>
      </div>
    </div>
    <div class="card">
      <h2>موعد الاختبار القادم</h2>
      ${s.next_test_date ? `<p><b>${fmtDate(s.next_test_date)}</b></p>${countdown(s.next_test_date)}` : '<p class="muted">لم يُحدد بعد. يمكنك إضافته من «تحديث» بياناتك.</p>'}
    </div>
  </div>
  <div class="grid g2">
    <div class="card">
      <h2>المقرر الحالي</h2>
      ${cur ? `<h3>${esc(cur.title)}</h3>
        <p class="small muted">${esc(cur.description || '')}</p>
        <p class="small"><b>الصفحات المطلوبة:</b> ${esc(cur.pages_label || cur.pages.map(p => p.file_page).join('، '))}
        ${cur.due_date ? `<br><b>موعد الإنجاز:</b> ${fmtDate(cur.due_date)}` : ''}</p>
        <div class="row between small"><span>نسبة الإنجاز</span><b>${cur.progress.pct}%</b></div>${pct(cur.progress.pct)}
        <p class="small muted" style="margin-top:6px">الشرح: ${cur.progress.lessonsDone}/${cur.progress.lessonsTotal} · مهارات تدرّبت عليها: ${cur.progress.skillsPracticed}/${cur.progress.skillsTotal} · التقويم: ${cur.progress.assessed ? 'تم' : 'لم يتم'}</p>
        <a class="btn sm" href="#/s/course/${cur.id}">فتح المقرر</a>`
        : '<p class="muted">لا يوجد مقرر مخصص لك حاليًا. سيظهر هنا عندما ينشره مدير المنصة.</p>'}
      ${d.courses.length > 1 ? `<p class="small" style="margin-top:8px">لديك ${d.courses.length} مقررات. <a href="#/s/path">عرض الكل</a></p>` : ''}
    </div>
    <div class="card">
      <h2>آخر درجة تقويمية</h2>
      ${d.lastScore ? `<div class="row" style="gap:16px"><div class="stat"><div class="v">${fmtScore(d.lastScore.score)}<small style="font-size:.9rem">/100</small></div><div class="l">${esc(d.lastScore.title)}</div></div>
        <div><p class="small muted">${fmtDate(d.lastScore.at, true)}</p><a class="btn ghost sm" href="#/report/attempt/${d.lastScore.id}">عرض التقرير</a></div></div>`
        : '<p class="muted">لم تؤدِّ أي تقويم بعد.</p>'}
    </div>
  </div>
  <div class="card"><div class="row between"><h2>تطور مستواي</h2><a class="btn ghost sm" href="#/report/student/${s.id}">التقرير التراكمي</a></div>
    ${lineChart(d.scores.map((x, i) => ({ v: x.score, l: `م${i + 1}` })))}
    <p class="small muted">كل نقطة محاولة تقويم مكتملة بالترتيب الزمني.</p></div>
  <div class="card"><div class="row between"><h2>التنبيهات ${unread.length ? `<span class="badge green">${unread.length} جديد</span>` : ''}</h2>${unread.length ? '<button class="btn ghost sm" id="readall">تعليم الكل كمقروء</button>' : ''}</div>
    ${d.announcements.length ? d.announcements.map(a => `<div style="padding:8px 0;border-bottom:1px solid var(--line)">${a.read ? '' : '<span class="badge green">جديد</span> '}<b>${esc(a.title)}</b><div class="small">${esc(a.body || '')}</div><div class="small muted">${fmtDate(a.created_at, true)}</div></div>`).join('') : '<p class="muted">لا توجد تنبيهات.</p>'}
  </div>`);
  const ra = $('#readall'); if (ra) ra.onclick = async () => { await post('/api/notifications/read'); dashboard(); };
}

export async function profile() {
  const d = await get('/api/student/dashboard');
  const s = d.student;
  const el = render(`<div class="auth card" style="max-width:560px"><h1>تحديث بياناتي</h1><div id="err"></div>
    <form id="f">
      <div class="field"><label>الصف الدراسي</label><select name="grade">${gradeOptions(s.grade)}</select></div>
      <div class="grid g2" style="gap:12px">
        <div class="field"><label>الاختبارات الورقية السابقة</label><input name="paper_tests" type="number" min="0" value="${s.paper_tests ?? 0}"></div>
        <div class="field"><label>الاختبارات المحوسبة السابقة</label><input name="computer_tests" type="number" min="0" value="${s.computer_tests ?? 0}"></div>
      </div>
      <div class="field"><label>تاريخ الاختبار القادم</label><input id="nd" name="next_test_date" type="date" value="${s.next_test_date || ''}" ${s.next_test_date ? '' : 'disabled'}>
        <label class="check" style="margin-top:6px"><input type="checkbox" id="none" ${s.next_test_date ? '' : 'checked'}> لم يُحدد بعد</label></div>
      <div class="field"><label>الدورة والمركز</label><input name="course_center" value="${esc(s.course_center || '')}"></div>
      <div class="row"><button class="btn green">حفظ</button><a class="btn ghost" href="#/s">إلغاء</a></div>
    </form></div>`);
  $('#none').onchange = (e) => { $('#nd').disabled = e.target.checked; if (e.target.checked) $('#nd').value = ''; };
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const b = form(e.target); b.paper_tests = normDigits(b.paper_tests); b.computer_tests = normDigits(b.computer_tests);
    if ($('#none').checked) b.next_test_date = null;
    try { await put('/api/student/profile', b); toast('تم حفظ بياناتك.'); go('#/s'); } catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

export async function pathView() {
  const d = await get('/api/student/dashboard');
  render(`<h1>مسار القدرات</h1>
  <p class="muted">اختر الجزء، ثم انتقل بين الشرح والتدريب والتقويم.</p>
  ${d.courses.length ? `<div class="grid g2">${d.courses.map((c, i) => `<div class="card">
      <span class="badge">${i + 1}</span> <h2 style="display:inline">${esc(c.title)}</h2>
      <p class="small muted" style="margin-top:6px">${esc(c.pages_label || '')}${c.due_date ? ` · الإنجاز قبل ${fmtDate(c.due_date)}` : ''}</p>
      <div class="row between small"><span>الإنجاز</span><b>${c.progress.pct}%</b></div>${pct(c.progress.pct)}
      <div class="row" style="margin-top:12px"><a class="btn" href="#/s/course/${c.id}">دخول الجزء</a></div></div>`).join('')}</div>`
    : '<div class="card"><p class="muted">لا توجد أجزاء منشورة لك بعد. يضيف مدير المنصة الأجزاء تباعًا.</p></div>'}
  <p class="small muted">تُضاف الأجزاء الجديدة هنا عند نشرها.</p>`);
}

export async function course(id) {
  const d = await get(`/api/courses/${id}`);
  render(`<p class="small"><a href="#/s/path">مسار القدرات</a> ‹ ${esc(d.course.title)}</p>
  <h1>${esc(d.course.title)}</h1>
  <p class="muted">${esc(d.course.description || '')}</p>
  <div class="row between small" style="max-width:460px"><span>نسبة إنجاز الجزء</span><b>${d.progress.pct}%</b></div><div style="max-width:460px">${pct(d.progress.pct)}</div>
  <div class="tiles" style="margin-top:18px">
    <a class="tile t1" href="#/s/course/${id}/learn"><div class="ic">📘</div><strong>الشرح</strong><small>فهم الصفحات المقررة</small><div class="small" style="margin-top:6px">${d.progress.lessonsDone}/${d.progress.lessonsTotal} أجزاء مكتملة</div></a>
    <a class="tile t2" href="#/s/course/${id}/practice"><div class="ic">✍️</div><strong>الجزء التدريبي</strong><small>تدريب شامل دون درجات رسمية</small><div class="small" style="margin-top:6px">${d.progress.skillsPracticed}/${d.progress.skillsTotal} مهارات</div></a>
    <a class="tile t3" href="#/s/course/${id}/assess"><div class="ic">📊</div><strong>تقويم</strong><small>الاختبار وقياس المستوى</small><div class="small" style="margin-top:6px">${d.progress.assessed ? 'أدّيت التقويم' : 'لم تؤدِّه بعد'}</div></a>
  </div>`);
}

// ---------- الشرح ----------
export async function learn(courseId, lessonId) {
  const d = await get(`/api/courses/${courseId}`);
  if (!d.lessons.length) return render(`<div class="card"><p>لا يوجد شرح منشور لهذا الجزء بعد.</p><a class="btn ghost" href="#/s/course/${courseId}">رجوع</a></div>`);
  const l = d.lessons.find(x => x.id === lessonId) || d.lessons.find(x => !x.done) || d.lessons[0];
  const printed = Object.fromEntries(d.pages.map(p => [p.file_page, p.printed_page]));
  const anyImage = d.pages.some(p => p.has_image);
  const byTopic = {};
  for (const x of d.lessons) (byTopic[`${x.topic || 'عام'}`] ||= []).push(x);
  const c = l.content;
  const idx = d.lessons.indexOf(l);
  const next = d.lessons[idx + 1];
  const pageLabel = (fp, pp) => `صفحة الملف ${fp ?? '—'}${pp ? ` · الرقم المطبوع ${esc(pp)}` : (fp ? ' · لا يوجد رقم مطبوع مختلف' : '')}`;
  render(`<p class="small"><a href="#/s/path">مسار القدرات</a> ‹ <a href="#/s/course/${courseId}">${esc(d.course.title)}</a> ‹ الشرح</p>
  <div class="lesson-layout">
    <aside class="card lesson-list" style="padding:10px">
      <div class="row between" style="padding:4px 8px"><b>الموضوعات</b><span class="small muted">${d.progress.lessonsDone}/${d.progress.lessonsTotal}</span></div>
      ${Object.entries(byTopic).map(([t, ls]) => `<div class="small muted" style="padding:8px 8px 2px">${esc(t)}</div>${ls.map(x => `<a href="#/s/course/${courseId}/learn/${x.id}" class="${x.id === l.id ? 'on' : ''}"><span>${esc(x.title)}<br><span class="pageref">ص ${x.file_page ?? '—'} · ${esc(x.section || 'كمي')}</span></span>${x.done ? '<span class="badge green">✓</span>' : ''}</a>`).join('')}`).join('')}
    </aside>
    <article class="card lesson">
      <div class="row between"><div><span class="badge">${esc(l.topic || '')}</span> <span class="badge gray">${esc(l.section || 'كمي')}</span></div>
        ${anyImage ? `<button class="btn ghost sm" id="open-page">📄 فتح الصفحة الأصلية</button>` : ''}</div>
      <h2 style="margin-top:10px">${esc(l.title)}</h2>
      <p class="pageref">${pageLabel(l.file_page, l.printed_page || printed[l.file_page])}</p>
      <p><b>${esc(c.summary || '')}</b></p>
      ${c.explanation?.length ? `<h3>الشرح المبسّط</h3><ul>${c.explanation.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${c.examples?.length ? `<h3>أمثلة محلولة خطوة بخطوة</h3>${c.examples.map((e, i) => `<div class="example"><b>مثال ${i + 1}:</b> ${esc(e.q)}<ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="ans">الإجابة: ${esc(e.answer)}</div></div>`).join('')}` : ''}
      ${c.mistakes?.length ? `<h3>أخطاء شائعة</h3>${c.mistakes.map(x => `<div class="mistake">${esc(x)}</div>`).join('')}` : ''}
      ${c.quick?.length ? `<h3>ملخص سريع</h3>${c.quick.map(x => `<div class="quick">${esc(x)}</div>`).join('')}` : ''}
      <div class="row" style="margin-top:18px">
        <button class="btn ${l.done ? 'ghost' : 'green'}" id="done">${l.done ? '✓ أتممت فهم هذا الجزء (إلغاء)' : 'أتممت فهم هذا الجزء'}</button>
        ${l.skill_id ? `<a class="btn ghost" href="#/s/course/${courseId}/practice?skill=${l.skill_id}">تدرّب على هذه المهارة</a>` : ''}
        ${next ? `<a class="btn ghost" href="#/s/course/${courseId}/learn/${next.id}">التالي ←</a>` : ''}
      </div>
    </article>
  </div>`);
  const op = $('#open-page');
  if (op) op.onclick = () => openPage({ pages: d.pages, page: l.file_page });
  $('#done').onclick = async () => {
    await post(`/api/lessons/${l.id}/done`, { done: !l.done });
    toast(l.done ? 'أُلغي التعليم.' : 'أحسنت! سُجّل إتمامك لهذا الجزء.');
    learn(courseId, !l.done && next ? next.id : l.id);
  };
}

// ---------- التدريب ----------
export async function practice(courseId, q) {
  const skill = q.get('skill') || '';
  const mode = q.get('mode') || 'all';
  const [c, st, list] = await Promise.all([
    get(`/api/courses/${courseId}`),
    get(`/api/practice/${courseId}/stats`),
    get(`/api/practice/${courseId}?mode=${mode}${skill ? `&skill=${skill}` : ''}`),
  ]);
  const qs = list.questions;
  let i = Math.max(0, qs.findIndex(x => !x.solved)); if (i < 0) i = 0;
  const el = render(`<p class="small"><a href="#/s/path">مسار القدرات</a> ‹ <a href="#/s/course/${courseId}">${esc(c.course.title)}</a> ‹ الجزء التدريبي</p>
  <h1>الجزء التدريبي</h1>
  <div class="note small">هذا القسم للتدريب فقط: لا تدخل نتائجه في الدرجة الرسمية ولا في ترتيب الطلاب.</div>
  <div class="card no-print"><div class="grid g3" style="gap:10px">
    <div><label for="sk">المهارة</label><select id="sk"><option value="">جميع المهارات</option>${st.skills.map(s => `<option value="${s.skill_id}" ${String(s.skill_id) === skill ? 'selected' : ''}>${esc(s.name)} (${s.solved}/${s.total})</option>`).join('')}</select></div>
    <div><label for="md">النوع</label><select id="md"><option value="all">كل الأسئلة (من السهل إلى الأصعب)</option><option value="mistakes" ${mode === 'mistakes' ? 'selected' : ''}>الأسئلة التي أخطأت فيها</option></select></div>
    <div style="align-self:end"><span class="small muted">حللت صحيحًا ${qs.filter(x => x.solved).length} من ${qs.length} في هذا العرض</span></div>
  </div></div>
  <div id="qbox"></div>
  <details class="card"><summary><b>إنجازي في التدريب حسب المهارة</b></summary><div class="table-wrap" style="margin-top:10px"><table><tr><th>المهارة</th><th>الصفحة</th><th>أسئلة حللتها صحيحًا</th><th>محاولات خاطئة</th></tr>
    ${st.skills.map(s => `<tr><td>${esc(s.name)}</td><td>${s.file_page ?? '—'}</td><td>${s.solved}/${s.total}</td><td>${s.misses}</td></tr>`).join('')}</table></div></details>`);
  const reload = () => { location.hash = `#/s/course/${courseId}/practice?mode=${$('#md').value}${$('#sk').value ? `&skill=${$('#sk').value}` : ''}`; };
  $('#sk').onchange = reload; $('#md').onchange = reload;
  const box = $('#qbox', el);
  const show = () => {
    if (!qs.length) { box.innerHTML = `<div class="card"><p>${mode === 'mistakes' ? 'لا توجد أسئلة أخطأت فيها في هذا العرض. أحسنت!' : 'لا توجد أسئلة تدريب منشورة هنا بعد.'}</p></div>`; return; }
    const x = qs[i]; let usedHint = false; let answered = false;
    box.innerHTML = `<div class="card">
      <div class="row between small"><span>سؤال ${i + 1} من ${qs.length}</span><span><span class="badge">${esc(x.skill_name || '')}</span> <span class="badge gray">${DIFF[x.difficulty]}</span> <span class="badge gray">ص ${x.file_page ?? '—'}</span></span></div>
      <p class="q" style="margin-top:10px">${esc(x.stem)}</p>
      <div class="choices">${x.choices.map((ch, k) => `<button class="choice" data-k="${k}"><span class="k">${'أبجدهو'[k]}</span><span>${esc(ch)}</span></button>`).join('')}</div>
      <div id="hintbox"></div><div id="sol"></div>
      <div class="row" style="margin-top:14px">
        ${x.hint ? '<button class="btn ghost sm" id="hint">💡 تلميح</button>' : ''}
        <button class="btn ghost sm" id="prev" ${i === 0 ? 'disabled' : ''}>السابق</button>
        <button class="btn sm" id="next" ${i >= qs.length - 1 ? 'disabled' : ''}>التالي</button>
      </div></div>`;
    const h = $('#hint', box); if (h) h.onclick = () => { usedHint = true; $('#hintbox', box).innerHTML = `<div class="info small" style="margin-top:10px">💡 ${esc(x.hint)}</div>`; };
    $('#prev', box).onclick = () => { i--; show(); };
    $('#next', box).onclick = () => { i++; show(); };
    $$('.choice', box).forEach(b => b.onclick = async () => {
      if (answered) return;
      const k = +b.dataset.k;
      try {
        const r = await post('/api/practice/answer', { question_id: x.id, chosen: k, used_hint: usedHint });
        answered = true;
        $$('.choice', box).forEach(bb => { bb.disabled = true; const kk = +bb.dataset.k; if (kk === r.answer) bb.classList.add('ok'); else if (kk === k) bb.classList.add('no'); });
        if (r.correct) x.solved = true;
        $('#sol', box).innerHTML = `<div class="solution"><b style="color:${r.correct ? 'var(--green-2)' : 'var(--red)'}">${r.correct ? '✓ إجابة صحيحة' : '✗ إجابة غير صحيحة'}</b><p style="margin:6px 0 0"><b>الإجابة الصحيحة:</b> ${esc(x.choices[r.answer])}</p><p style="margin:6px 0 0"><b>سبب صحتها وخطوات الحل:</b> ${esc(r.explanation)}</p>
          ${r.correct ? '' : '<button class="btn ghost sm" id="retry" style="margin-top:8px">أعد المحاولة</button>'}</div>`;
        const rt = $('#retry', box); if (rt) rt.onclick = () => show();
      } catch (er) { toast(er.message, true); }
    });
  };
  show();
}

// ---------- التقويم ----------
export async function assessList(courseId) {
  const [c, d] = await Promise.all([get(`/api/courses/${courseId}`), get(`/api/student/assessments/${courseId}`)]);
  const SC = { best: 'أعلى محاولة', last: 'آخر محاولة', first: 'أول محاولة' };
  const el = render(`<p class="small"><a href="#/s/path">مسار القدرات</a> ‹ <a href="#/s/course/${courseId}">${esc(c.course.title)}</a> ‹ تقويم</p>
  <h1>المسار التدريبي «تقويم»</h1>
  <div class="info small">هذا القسم هو المصدر الرسمي لدرجات المنصة وتقاريرها. الدرجة تقويم داخلي للمنصة، وليست درجة رسمية ولا توقعًا مؤكدًا لنتيجة اختبار القدرات.</div>
  ${d.assessments.length ? d.assessments.map(a => `<div class="card">
    <div class="row between"><h2>${esc(a.title)}</h2>${a.open ? '<span class="badge green">متاح</span>' : `<span class="badge gray">${esc(a.reason)}</span>`}</div>
    <div class="kv"><div><span>عدد الأسئلة</span><b>${a.num_questions}</b></div><div><span>المدة</span><b>${a.duration_min} دقيقة</b></div><div><span>درجة الاجتياز</span><b>${a.pass_score}/100</b></div>
      <div><span>المحاولات</span><b>${a.attempts.length} من ${a.max_attempts}</b></div><div><span>المحاولة المعتمدة</span><b>${SC[a.scoring]}</b></div></div>
    ${a.attempts.length ? `<div class="table-wrap" style="margin-top:12px"><table><tr><th>المحاولة</th><th>الحالة</th><th>الدرجة</th><th>التاريخ</th><th></th></tr>
      ${a.attempts.map(t => `<tr><td>${t.attempt_no}${t.id === a.official_id ? ' <span class="badge green">المعتمدة</span>' : ''}</td><td>${t.status === 'submitted' ? 'مكتملة' : 'جارية'}${t.needs_review ? ' <span class="badge amber">قيد المراجعة</span>' : ''}</td><td>${t.status === 'submitted' ? fmtScore(t.score) : '—'}</td><td>${fmtDate(t.submitted_at || t.deadline, true)}</td>
      <td>${t.status === 'submitted' ? `<a class="btn ghost sm" href="#/report/attempt/${t.id}">التقرير</a>` : `<a class="btn sm" href="#/s/attempt/${t.id}">استكمال</a>`}</td></tr>`).join('')}</table></div>` : ''}
    <div class="row" style="margin-top:12px">
      ${a.in_progress ? `<a class="btn green" href="#/s/attempt/${a.in_progress.id}">استكمال المحاولة الجارية</a>`
        : a.open && a.remaining > 0 ? `<button class="btn green" data-start="${a.id}">${a.attempts.length ? 'محاولة جديدة' : 'ابدأ التقويم'}</button>` : ''}
      ${a.official_id ? `<button class="btn ghost" data-cmp="${a.id}">المقارنة مع الزملاء</button>` : ''}
    </div><div id="cmp-${a.id}"></div></div>`).join('')
    : '<div class="card"><p class="muted">لا يوجد تقويم منشور لهذا الجزء بعد.</p></div>'}`);
  $$('[data-start]', el).forEach(b => b.onclick = async () => {
    const a = d.assessments.find(x => x.id === +b.dataset.start);
    if (!(await confirmBox(`سيبدأ الوقت (${a.duration_min} دقيقة) فور البدء، وتُحفظ إجاباتك تلقائيًا. هل تريد البدء؟`, { okText: 'ابدأ الآن' }))) return;
    try { const r = await post(`/api/assessments/${a.id}/start`); go(`#/s/attempt/${r.attempt_id}`); } catch (er) { toast(er.message, true); }
  });
  $$('[data-cmp]', el).forEach(b => b.onclick = async () => {
    const box = $(`#cmp-${b.dataset.cmp}`);
    box.innerHTML = compareHtml(await get(`/api/compare/${b.dataset.cmp}`));
  });
}

export function compareHtml(r) {
  if (!r) return '';
  if (r.insufficient) return `<div class="info" style="margin-top:12px">${esc(r.message)}</div>`;
  return `<div class="card" style="margin-top:12px;background:#f8fbff">
    <div class="kv"><div><span>درجتي المعتمدة</span><b>${r.mine != null ? fmtScore(r.mine) : '—'}</b></div><div><span>متوسط المجموعة</span><b>${fmtScore(r.average)}</b></div>
    ${r.rank ? `<div><span>ترتيبي</span><b>${r.rank} من ${r.participants}</b></div>` : ''}<div><span>عدد المشاركين</span><b>${r.participants}</b></div></div>
    ${r.message ? `<p class="small" style="margin-top:8px">🌱 ${esc(r.message)}</p>` : ''}
    ${r.leaderboard ? `<details><summary class="small">لوحة الترتيب</summary><table style="margin-top:8px"><tr><th>الترتيب</th><th>الاسم</th><th>الدرجة</th></tr>${r.leaderboard.map(x => `<tr ${x.me ? 'style="background:#e4f4ec"' : ''}><td>${x.rank}</td><td>${esc(x.name)}${x.me ? ' (أنت)' : ''}</td><td>${fmtScore(x.score)}</td></tr>`).join('')}</table></details>` : ''}
    <p class="hint">المقارنة بين المحاولات المعتمدة لنفس التقويم أو نماذجه المتكافئة.</p></div>`;
}

export async function takeAttempt(id) {
  let d = await get(`/api/attempts/${id}`);
  if (d.status === 'submitted') return go(`#/report/attempt/${id}`);
  const offset = new Date(d.server_now) - Date.now();
  const deadline = new Date(d.deadline).getTime();
  const answers = { ...d.answers };
  let cur = 0, timer, finished = false;
  const pending = new Map(); // إجابات بانتظار الحفظ عند انقطاع الاتصال
  const el = render(`<div class="examhead"><div class="card" style="margin:0"><div class="row between">
      <div><b>${esc(d.title)}</b> <span class="small muted">— المحاولة ${d.attempt_no}</span></div>
      <div class="row"><span class="small muted" id="savestate">الإجابات تُحفظ تلقائيًا</span><span class="timer" id="timer">--:--</span></div></div>
      <div class="qnav" id="qnav" style="margin-top:8px"></div></div></div>
    <div id="qwrap" style="margin-top:12px"></div>
    <div class="card"><div class="row between"><span class="small muted">لا تُعرض الإجابات الصحيحة أثناء التقويم.</span><button class="btn green" id="submit">تسليم الإجابات</button></div></div>`);
  const qwrap = $('#qwrap', el);
  // عرض جميع الأسئلة دفعة واحدة، وتسجيل ما ظهر منها فعليًا للخادم
  qwrap.innerHTML = d.questions.map((q, i) => `<div class="card qcard" id="q${i}" data-i="${i}" ${i ? 'hidden' : ''}>
      <div class="row between small"><span>السؤال ${i + 1} من ${d.questions.length}</span><span class="badge gray">${esc(q.skill)}</span></div>
      <p class="q" style="margin-top:8px">${esc(q.stem)}</p>
      <div class="choices">${q.choices.map((c, k) => `<button class="choice ${answers[i] === k ? 'sel' : ''}" data-k="${k}"><span class="k">${'أبجدهو'[k]}</span><span>${esc(c)}</span></button>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-clear>مسح الإجابة</button><button class="btn ghost sm" data-prev ${i === 0 ? 'disabled' : ''}>السابق</button><button class="btn sm" data-next ${i === d.questions.length - 1 ? 'disabled' : ''}>التالي</button></div></div>`).join('');
  const rendered = $$('.qcard', qwrap).filter(c => c.querySelector('.choice')).map(c => +c.dataset.i);
  post(`/api/attempts/${id}/seen`, { indices: rendered }).catch(() => {});
  const navHtml = () => { $('#qnav').innerHTML = d.questions.map((_, i) => `<button class="${answers[i] != null ? 'ans' : ''} ${i === cur ? 'cur' : ''}" data-go="${i}" aria-label="السؤال ${i + 1}">${i + 1}</button>`).join(''); };
  const showQ = (i) => { $$('.qcard', qwrap).forEach(c => { c.hidden = +c.dataset.i !== i; }); cur = i; navHtml(); };
  navHtml();
  $('#qnav').onclick = (e) => { const b = e.target.closest('[data-go]'); if (b) showQ(+b.dataset.go); };
  const setSave = (t, bad) => { const s = $('#savestate'); if (s) { s.textContent = t; s.style.color = bad ? 'var(--red)' : ''; } };
  async function save(i, choice) {
    pending.set(i, choice);
    setSave('جارٍ الحفظ…');
    try { await put(`/api/attempts/${id}/answer`, { i, choice }); pending.delete(i); setSave(pending.size ? 'بعض الإجابات لم تُحفظ بعد' : '✓ حُفظت إجاباتك'); }
    catch (e) { if (e.status === 409) { finish('timeout', true); } else setSave('انقطع الاتصال — سنعيد الحفظ تلقائيًا', true); }
  }
  const retry = setInterval(() => { for (const [i, c] of pending) save(i, c); }, 8000);
  qwrap.onclick = (e) => {
    const card = e.target.closest('.qcard'); if (!card) return;
    const i = +card.dataset.i;
    const ch = e.target.closest('.choice');
    if (ch) { const k = +ch.dataset.k; answers[i] = k; $$('.choice', card).forEach(b => b.classList.toggle('sel', +b.dataset.k === k)); navHtml(); save(i, k); }
    if (e.target.closest('[data-clear]')) { delete answers[i]; $$('.choice', card).forEach(b => b.classList.remove('sel')); navHtml(); save(i, null); }
    if (e.target.closest('[data-prev]')) showQ(i - 1);
    if (e.target.closest('[data-next]')) showQ(i + 1);
  };
  async function finish(reason, already) {
    if (finished) return; finished = true;
    clearInterval(timer); clearInterval(retry);
    if (!already) { try { await post(`/api/attempts/${id}/submit`, { reason }); } catch { /* الخادم يسلّم تلقائيًا عند انتهاء الوقت */ } }
    toast(reason === 'timeout' ? 'انتهى الوقت وسُلّمت إجاباتك المحفوظة.' : 'تم تسليم إجاباتك.');
    go(`#/report/attempt/${id}`);
  }
  const tick = () => {
    const left = Math.max(0, deadline - (Date.now() + offset));
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    const t = $('#timer'); if (!t) return;
    t.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    t.classList.toggle('low', left < 120000);
    if (left <= 0) finish('timeout');
  };
  tick(); timer = setInterval(tick, 1000);
  setLeaveGuard(() => { clearInterval(timer); clearInterval(retry); });
  $('#submit').onclick = async () => {
    const blank = d.questions.length - Object.keys(answers).length;
    if (await confirmBox(blank ? `لديك ${blank} سؤال دون إجابة. هل تريد التسليم؟` : 'هل تريد تسليم إجاباتك الآن؟', { okText: 'تسليم' })) finish('manual');
  };
}
