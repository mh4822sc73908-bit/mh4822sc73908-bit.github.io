import { $, $$, esc, get, post, put, del, api, render, errorBox, toast, modal, confirmBox, fmtDate, fmtScore, form, DIFF, LEVEL_BADGE, openPage, pdfFromBlob } from './core.js';

const TABS = [['overview', 'نظرة عامة'], ['students', 'الطلاب'], ['parents', 'أولياء الأمور'], ['courses', 'المقررات والمحتوى'], ['assessments', 'التقويمات'], ['results', 'النتائج والتقارير'], ['announcements', 'التنبيهات'], ['settings', 'الإعدادات'], ['audit', 'سجل التعديلات'], ['backup', 'النسخ الاحتياطي']];
const tabs = (cur) => `<h1>لوحة مدير المنصة</h1><nav class="tabs">${TABS.map(([k, t]) => `<a href="#/a/${k}" class="${k === cur ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
const STATUS = { pending: ['gray', 'بانتظار التفعيل'], active: ['green', 'مفعّل'], disabled: ['red', 'معطّل'], draft: ['amber', 'مسودة'], published: ['green', 'منشور'], archived: ['gray', 'مؤرشف'], closed: ['gray', 'مغلق'], retired: ['gray', 'مستبعد'] };
const badge = (s) => `<span class="badge ${STATUS[s]?.[0] || 'gray'}">${STATUS[s]?.[1] || esc(s)}</span>`;
const toLocalInput = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
const SRC = { seed: 'محتوى أولي', ai: 'ذكاء اصطناعي', manual: 'يدوي' };

export async function view(section, id, sub, q) {
  const fn = { overview, students, parents, courses, course: () => coursePage(id, sub || 'pages', q), assessments, results, announcements, settings, audit, backup }[section];
  if (!fn) return overview();
  return fn(id, sub, q);
}

// ================= نظرة عامة =================
async function overview() {
  const d = await get('/api/admin/overview');
  render(`${tabs('overview')}
  <div class="grid g4">
    <div class="stat"><div class="v">${d.counts.active}/${d.counts.students}</div><div class="l">طلاب مفعّلون</div></div>
    <div class="stat"><div class="v">${d.counts.parents}</div><div class="l">أولياء أمور</div></div>
    <div class="stat"><div class="v">${d.counts.courses}</div><div class="l">مقررات منشورة</div></div>
    <div class="stat"><div class="v">${d.counts.drafts}</div><div class="l">عناصر بانتظار المراجعة</div></div>
    <div class="stat"><div class="v">${d.counts.review}</div><div class="l">محاولات تحتاج مراجعة</div></div>
  </div>
  ${d.counts.drafts ? `<div class="note" style="margin-top:14px">يوجد ${d.counts.drafts} عنصر (شرح/أسئلة) بحالة مسودة لا يراه الطلاب حتى تراجعه وتنشره من «المقررات والمحتوى».</div>` : ''}
  <div class="card" style="margin-top:14px"><h2>متابعة الطلاب</h2><div class="table-wrap"><table>
    <tr><th>الطالب</th><th>الحالة</th><th>الصف</th><th>الإنجاز</th><th>آخر درجة</th><th>آخر دخول</th><th></th></tr>
    ${d.students.map(s => `<tr><td>${esc(s.name)}</td><td>${badge(s.status)} ${s.status === 'active' && !s.started ? '<span class="badge gray">لم يبدأ بعد</span>' : ''}</td><td>${esc(s.grade || '—')}</td>
      <td>${s.progress.map(p => `<div class="small">${esc(p.title)}: <b>${p.pct}%</b></div>`).join('') || '—'}</td>
      <td>${s.lastScore ? fmtScore(s.lastScore.score) : '—'}</td><td class="small">${s.last_login ? fmtDate(s.last_login, true) : '—'}</td>
      <td>${s.status === 'active' ? `<a class="btn ghost sm" href="#/report/student/${s.id}">التقرير</a>` : ''}</td></tr>`).join('')}
  </table></div></div>
  <div class="card"><h2>المهارات المشتركة التي تحتاج إلى دعم</h2>
    ${d.groupSkills.length ? `<div class="table-wrap"><table><tr><th>المهارة</th><th>النسبة الجماعية</th><th>عدد الأسئلة</th><th>طلاب</th><th>التصنيف</th></tr>${d.groupSkills.map(k => `<tr><td>${esc(k.name)}</td><td>${k.pct}%</td><td>${k.n}</td><td>${k.students}</td><td><span class="badge ${LEVEL_BADGE[k.level]}">${esc(k.label)}</span></td></tr>`).join('')}</table></div>` : '<p class="muted">لا توجد محاولات تقويم مكتملة بعد.</p>'}
    <p class="hint">التقرير الجماعي القابل للطباعة متاح من «النتائج والتقارير».</p></div>`);
}

// ================= رمز الدعوة =================
async function issueCode(u) {
  const label = u.status === 'pending' ? 'رمز التفعيل' : 'رمز إعادة التعيين';
  if (u.status === 'active' && !(await confirmBox(`إصدار رمز إعادة تعيين لـ «${u.name}»؟ ${u.role === 'parent' ? 'سيُعطَّل دخول ولي الأمر حتى يعيد إنشاء كلمة المرور.' : 'يبقى رمز الدخول الحالي صالحًا حتى يستخدم الطالب الرمز.'}`))) return;
  try {
    const r = await post(`/api/admin/users/${u.id}/invite`);
    modal(`<h2>${label}</h2><p>سلّم هذا الرمز إلى <b>${esc(u.name)}</b>. يظهر مرة واحدة فقط وصالح ${r.expires_days} يومًا.</p>
      <p class="center" style="font-size:2rem;font-weight:700;letter-spacing:.15em;direction:ltr;background:var(--navy-soft);border-radius:12px;padding:12px">${esc(r.code)}</p>
      <p class="small muted">${u.role === 'parent' ? `يفعّل ولي الأمر حسابه من «دخول ولي الأمر ← تفعيل الحساب» باسم المستخدم <b class="ltr">${esc(u.username)}</b> وهذا الرمز.` : r.purpose === 'activate' ? 'يستخدمه الطالب في «التسجيل لأول مرة».' : 'يستخدمه الطالب في «لدي رمز إعادة تعيين» لإنشاء كلمة مرور جديدة.'}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>تم</button></div>`);
  } catch (e) { toast(e.message, true); }
}

// ================= الطلاب =================
async function students() {
  const list = await get('/api/admin/students');
  const el = render(`${tabs('students')}
  <div class="row between"><p class="muted small" style="margin:0">قائمة الطلاب المسموح لهم. التسجيل لأول مرة يتم برمز دعوة يصدره المدير، ولا تُعرض كلمات المرور.</p><button class="btn green" id="add">+ إضافة طالب</button></div>
  <div class="card" style="margin-top:12px"><div class="table-wrap"><table>
    <tr><th>الاسم</th><th>اسم العرض</th><th>الحالة</th><th>الصف</th><th>ورقي/محوسب</th><th>الاختبار القادم</th><th>الدورة</th><th>أولياء الأمور</th><th>إجراءات</th></tr>
    ${list.map(u => `<tr><td><b>${esc(u.name)}</b>${u.locked_until && new Date(u.locked_until) > new Date() ? '<br><span class="badge red">مقفل مؤقتًا</span>' : ''}</td><td>${esc(u.display_name || '')}</td><td>${badge(u.status)}${u.invite_purpose ? `<br><span class="small muted">${u.invite_purpose === 'activate' ? 'رمز تفعيل صادر' : 'رمز إعادة تعيين صادر'}</span>` : ''}</td>
      <td>${esc(u.grade || '—')}</td><td>${u.paper_tests ?? '—'}/${u.computer_tests ?? '—'}</td><td>${u.next_test_date ? fmtDate(u.next_test_date) : (u.status === 'active' ? 'لم يُحدد' : '—')}</td><td class="small">${esc(u.course_center || '—')}</td>
      <td class="small">${u.parents.map(p => esc(p.name)).join('، ') || '—'}</td>
      <td><div class="row" style="gap:4px">
        <button class="btn ghost sm" data-edit="${u.id}">تعديل</button>
        ${u.status !== 'disabled' ? `<button class="btn ghost sm" data-code="${u.id}">${u.status === 'pending' ? 'رمز تفعيل' : 'إعادة تعيين'}</button>` : ''}
        <button class="btn ${u.status === 'disabled' ? 'ghost' : 'danger'} sm" data-toggle="${u.id}">${u.status === 'disabled' ? 'تفعيل' : 'تعطيل'}</button>
        ${u.status === 'active' ? `<a class="btn ghost sm" href="#/report/student/${u.id}">التقرير</a>` : ''}
      </div></td></tr>`).join('')}
  </table></div></div>`);
  $('#add', el).onclick = () => editStudent(null);
  $$('[data-edit]', el).forEach(b => b.onclick = () => editStudent(list.find(u => u.id === +b.dataset.edit)));
  $$('[data-code]', el).forEach(b => b.onclick = async () => { await issueCode({ ...list.find(u => u.id === +b.dataset.code), role: 'student' }); students(); });
  $$('[data-toggle]', el).forEach(b => b.onclick = async () => {
    const u = list.find(x => x.id === +b.dataset.toggle);
    const enable = u.status === 'disabled';
    if (!(await confirmBox(`${enable ? 'تفعيل' : 'تعطيل'} حساب «${u.name}»؟`, { danger: !enable }))) return;
    await post(`/api/admin/students/${u.id}/status`, { enable }); students();
  });
}
function editStudent(u) {
  const m = modal(`<h2>${u ? 'تعديل بيانات الطالب' : 'إضافة طالب'}</h2><div id="err"></div><form id="f">
    <div class="grid g2" style="gap:12px"><div class="field"><label>الاسم (اسم المستخدم)</label><input name="name" value="${esc(u?.name || '')}" required></div>
    <div class="field"><label>اسم العرض في المقارنة</label><input name="display_name" value="${esc(u?.display_name || '')}" placeholder="الاسم الأول"></div></div>
    ${u ? `<div class="grid g2" style="gap:12px"><div class="field"><label>الصف</label><select name="grade"><option value="">—</option>${['ثاني ثانوي', 'ثالث ثانوي'].map(g => `<option ${u.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>تاريخ الاختبار القادم</label><input type="date" name="next_test_date" value="${u.next_test_date || ''}"></div>
      <div class="field"><label>الاختبارات الورقية</label><input type="number" min="0" name="paper_tests" value="${u.paper_tests ?? ''}"></div>
      <div class="field"><label>الاختبارات المحوسبة</label><input type="number" min="0" name="computer_tests" value="${u.computer_tests ?? ''}"></div></div>
      <div class="field"><label>الدورة والمركز</label><input name="course_center" value="${esc(u.course_center || '')}"></div>` : '<p class="small muted">بعد الإضافة أصدِر له «رمز تفعيل» ليسجّل لأول مرة.</p>'}
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`);
  $('#f', m.el).onsubmit = async (e) => {
    e.preventDefault();
    try { u ? await put(`/api/admin/students/${u.id}`, form(e.target)) : await post('/api/admin/students', form(e.target)); m.close(); toast('تم الحفظ.'); students(); }
    catch (er) { $('#err', m.el).innerHTML = errorBox(er); }
  };
}

// ================= أولياء الأمور =================
async function parents() {
  const [list, studs] = await Promise.all([get('/api/admin/parents'), get('/api/admin/students')]);
  const el = render(`${tabs('parents')}
  <div class="row between"><p class="muted small" style="margin:0">يحدد المدير الأبناء المرتبطين بكل ولي أمر صراحة، ولا يستطيع ولي الأمر ربط نفسه بأي طالب.</p><button class="btn green" id="add">+ إضافة ولي أمر</button></div>
  <div class="card" style="margin-top:12px"><div class="table-wrap"><table><tr><th>الاسم</th><th>اسم المستخدم</th><th>الحالة</th><th>الأبناء المرتبطون</th><th>آخر دخول</th><th>إجراءات</th></tr>
  ${list.length ? list.map(p => `<tr><td>${esc(p.name)}</td><td class="ltr">${esc(p.username)}</td><td>${badge(p.status)}</td><td>${p.children.map(c => esc(c.name)).join('، ') || '<span class="muted">لا يوجد</span>'}</td><td class="small">${p.last_login ? fmtDate(p.last_login, true) : '—'}</td>
    <td><div class="row" style="gap:4px"><button class="btn ghost sm" data-edit="${p.id}">الربط والاسم</button>${p.status !== 'disabled' ? `<button class="btn ghost sm" data-code="${p.id}">${p.status === 'pending' ? 'رمز تفعيل' : 'إعادة تعيين'}</button>` : ''}<button class="btn ${p.status === 'disabled' ? 'ghost' : 'danger'} sm" data-toggle="${p.id}">${p.status === 'disabled' ? 'تفعيل' : 'تعطيل'}</button></div></td></tr>`).join('') : '<tr><td colspan="6" class="muted">لا يوجد أولياء أمور بعد.</td></tr>'}
  </table></div></div>`);
  const edit = (p) => {
    const ids = new Set((p?.children || []).map(c => c.id));
    const m = modal(`<h2>${p ? 'تعديل ولي الأمر' : 'إضافة ولي أمر'}</h2><div id="err"></div><form id="f">
      <div class="field"><label>الاسم</label><input name="name" value="${esc(p?.name || '')}" required></div>
      ${p ? '' : '<div class="field"><label>اسم المستخدم (بالإنجليزية)</label><input name="username" class="ltr" style="display:block" required placeholder="abu.turki"></div>'}
      <div class="field"><label>الأبناء المرتبطون</label><div class="grid g3" style="gap:6px">${studs.map(s => `<label class="check"><input type="checkbox" name="children" data-multi="1" value="${s.id}" ${ids.has(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`);
    $('#f', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const b = form(e.target); b.children = (b.children || []).map(Number);
      try {
        if (p) await put(`/api/admin/parents/${p.id}`, b);
        else { const r = await post('/api/admin/parents', b); m.close(); await issueCode({ id: r.id, name: b.name, username: b.username.toLowerCase(), status: 'pending', role: 'parent' }); return parents(); }
        m.close(); toast('تم الحفظ.'); parents();
      } catch (er) { $('#err', m.el).innerHTML = errorBox(er); }
    };
  };
  $('#add', el).onclick = () => edit(null);
  $$('[data-edit]', el).forEach(b => b.onclick = () => edit(list.find(p => p.id === +b.dataset.edit)));
  $$('[data-code]', el).forEach(b => b.onclick = async () => { await issueCode({ ...list.find(p => p.id === +b.dataset.code), role: 'parent' }); parents(); });
  $$('[data-toggle]', el).forEach(b => b.onclick = async () => { const p = list.find(x => x.id === +b.dataset.toggle); await post(`/api/admin/students/${p.id}/status`, { enable: p.status === 'disabled' }); parents(); });
}

// ================= المقررات =================
async function courses() {
  const [list, studs] = await Promise.all([get('/api/admin/courses'), get('/api/admin/students')]);
  const cnt = (arr, k, v) => arr.filter(x => x[k] === v).reduce((s, x) => s + x.c, 0);
  const el = render(`${tabs('courses')}
  <div class="row between"><p class="muted small" style="margin:0">كل مقرر يمثل جزءًا في «مسار القدرات». المقررات المؤرشفة تحتفظ بنتائجها.</p><button class="btn green" id="add">+ مقرر جديد</button></div>
  <div class="grid g2" style="margin-top:12px">${list.map(c => `<div class="card">
    <div class="row between"><h2>${esc(c.title)}</h2>${badge(c.status)}</div>
    <p class="small muted">${esc(c.description || '')}</p>
    <div class="kv small"><div><span>الصفحات</span><b>${esc(c.pages_label || '—')}</b></div><div><span>الفترة</span><b>${c.start_date ? fmtDate(c.start_date) : '—'} ← ${c.end_date ? fmtDate(c.end_date) : '—'}</b></div>
      <div><span>موعد الإنجاز</span><b>${c.due_date ? fmtDate(c.due_date) : '—'}</b></div><div><span>مخصص لـ</span><b>${c.assign_all ? 'جميع الطلاب' : `${c.students.length} طلاب`}</b></div>
      <div><span>الشرح</span><b>${cnt(c.stats.lessons, 'status', 'published')} منشور · ${cnt(c.stats.lessons, 'status', 'draft')} مسودة</b></div>
      <div><span>الأسئلة</span><b>${cnt(c.stats.questions, 'status', 'published')} منشور · ${cnt(c.stats.questions, 'status', 'draft')} مسودة</b></div>
      <div><span>الملفات</span><b>${c.files.length}</b></div></div>
    <div class="row" style="margin-top:12px">
      <a class="btn sm" href="#/a/course/${c.id}/pages">المحتوى والمراجعة</a>
      <button class="btn ghost sm" data-edit="${c.id}">البيانات والتخصيص</button>
      ${c.status !== 'published' ? `<button class="btn green sm" data-st="${c.id}:published">نشر</button>` : `<button class="btn ghost sm" data-st="${c.id}:draft">إخفاء (مسودة)</button>`}
      ${c.status !== 'archived' ? `<button class="btn ghost sm" data-st="${c.id}:archived">أرشفة</button>` : ''}
    </div></div>`).join('')}</div>`);
  const edit = (c) => {
    const ids = new Set(c?.students || []);
    const m = modal(`<h2>${c ? 'بيانات المقرر' : 'مقرر جديد'}</h2><div id="err"></div><form id="f">
      <div class="field"><label>العنوان</label><input name="title" value="${esc(c?.title || '')}" required placeholder="مثال: الجزء الثاني"></div>
      <div class="field"><label>الوصف</label><textarea name="description">${esc(c?.description || '')}</textarea></div>
      <div class="grid g3" style="gap:12px">
        <div class="field"><label>بداية الفترة</label><input type="date" name="start_date" value="${c?.start_date || ''}"></div>
        <div class="field"><label>نهاية الفترة</label><input type="date" name="end_date" value="${c?.end_date || ''}"></div>
        <div class="field"><label>موعد الإنجاز</label><input type="date" name="due_date" value="${c?.due_date || ''}"></div></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label>وصف الصفحات المطلوبة</label><input name="pages_label" value="${esc(c?.pages_label || '')}" placeholder="صفحات الملف 6–10"></div>
      <div class="field"><label>الترتيب في المسار</label><input type="number" name="sort" value="${c?.sort ?? 0}"></div></div>
      <div class="field"><label class="check"><input type="checkbox" name="assign_all" id="all" ${!c || c.assign_all ? 'checked' : ''}> مخصص لجميع الطلاب</label>
        <div id="pick" class="grid g3" style="gap:6px;margin-top:6px">${studs.map(s => `<label class="check"><input type="checkbox" name="students" data-multi="1" value="${s.id}" ${ids.has(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`);
    const sync = () => { $('#pick', m.el).style.display = $('#all', m.el).checked ? 'none' : ''; };
    $('#all', m.el).onchange = sync; sync();
    $('#f', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const b = form(e.target); b.students = (b.students || []).map(Number);
      try { if (c) await put(`/api/admin/courses/${c.id}`, b); else { const r = await post('/api/admin/courses', b); m.close(); location.hash = `#/a/course/${r.id}/pages`; return; } m.close(); toast('تم الحفظ.'); courses(); }
      catch (er) { $('#err', m.el).innerHTML = errorBox(er); }
    };
  };
  $('#add', el).onclick = () => edit(null);
  $$('[data-edit]', el).forEach(b => b.onclick = () => edit(list.find(c => c.id === +b.dataset.edit)));
  $$('[data-st]', el).forEach(b => b.onclick = async () => {
    const [id, st] = b.dataset.st.split(':');
    const msg = { published: 'نشر المقرر للطلاب المخصص لهم؟ يظهر لهم الشرح والأسئلة «المنشورة» فقط.', draft: 'إخفاء المقرر عن الطلاب؟', archived: 'أرشفة المقرر؟ يُخفى عن الطلاب وتُغلق تقويماته، وتبقى نتائجه محفوظة.' }[st];
    if (!(await confirmBox(msg))) return;
    try { await post(`/api/admin/courses/${id}/status`, { status: st }); toast('تم.'); courses(); } catch (e) { toast(e.message, true); }
  });
}

// ================= محتوى المقرر =================
const SUBTABS = [['pages', 'الملفات والصفحات'], ['skills', 'المهارات'], ['lessons', 'الشرح'], ['questions', 'بنك الأسئلة'], ['coverage', 'جدول التغطية']];
async function coursePage(id, sub, q) {
  const all = await get('/api/admin/courses');
  const c = all.find(x => x.id === id);
  if (!c) throw new Error('المقرر غير موجود.');
  const head = `${tabs('courses')}<p class="small"><a href="#/a/courses">المقررات</a> ‹ ${esc(c.title)}</p>
    <div class="row between"><h2 style="margin:0">${esc(c.title)} ${badge(c.status)}</h2><button class="btn green sm" id="bulk">اعتماد ونشر المسودات بعد المراجعة</button></div>
    <nav class="tabs" style="margin-top:10px">${SUBTABS.map(([k, t]) => `<a href="#/a/course/${id}/${k}" class="${k === sub ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
  const fn = { pages: pagesTab, skills: skillsTab, lessons: lessonsTab, questions: questionsTab, coverage: coverageTab }[sub] || pagesTab;
  await fn(c, head, q);
  const bulk = $('#bulk');
  if (bulk) bulk.onclick = () => {
    const m = modal(`<h2>اعتماد ونشر المسودات</h2>
      <div class="note">لا تنشر المحتوى المولّد آليًا أو الأولي قبل مراجعته. افتح «الشرح» و«بنك الأسئلة» وراجع كل عنصر وصحّحه، ثم انشره فرديًا أو استخدم هذا الخيار بعد اكتمال المراجعة.</div>
      <label class="check"><input type="checkbox" id="k1" checked> الشرح</label><label class="check"><input type="checkbox" id="k2" checked> الأسئلة (التدريب والتقويم)</label>
      <div class="field" style="margin-top:10px"><label>للتأكيد اكتب: راجعت المحتوى</label><input id="cf"></div>
      <div id="err"></div><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>إلغاء</button><button class="btn green" id="go">نشر</button></div>`);
    $('#go', m.el).onclick = async () => {
      const kinds = [$('#k1', m.el).checked && 'lessons', $('#k2', m.el).checked && 'questions'].filter(Boolean);
      try { const r = await post(`/api/admin/courses/${id}/publish-reviewed`, { confirm: $('#cf', m.el).value.trim(), kinds }); m.close(); toast(`نُشر ${r.lessons} شرح و${r.questions} سؤال.`); coursePage(id, sub, q); }
      catch (e) { $('#err', m.el).innerHTML = errorBox(e); }
    };
  };
}

const TS = { ok: ['green', 'نص مقروء'], scanned: ['amber', 'صفحة مصوّرة'], failed: ['red', 'تعذر الاستخراج'], unknown: ['gray', 'لم يُفحص'], image: ['amber', 'صورة'], fixed: ['green', 'أُدخل المحتوى'] };
const toB64 = (canvas, q = 0.82) => canvas.toDataURL('image/jpeg', q).split(',')[1];
async function renderPdfPage(doc, n, maxW = 1400) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: Math.min(2.5, maxW / base.width) });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { data: toB64(c), width: c.width, height: c.height };
}
async function imageToJpeg(file, maxW = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return { data: toB64(c), width: c.width, height: c.height };
  } finally { URL.revokeObjectURL(url); }
}

async function pagesTab(c, head) {
  const el = render(`${head}
  <div class="card"><h3>رفع ملف للمقرر</h3>
    <form id="up" class="row"><input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required style="max-width:420px"><button class="btn">متابعة</button></form>
    <p class="hint">PDF أو صورة. تتحول الصفحات المطلوبة إلى صور محفوظة في قاعدة البيانات، ولا يراها إلا الطلاب المخصص لهم المقرر. يُفحص نص كل صفحة لكشف الصفحات المصوّرة.</p><div id="upmsg"></div></div>
  <div class="card"><h3>الصفحات المطلوبة (${c.pages.length})</h3>
    ${c.pages.length ? `<div class="table-wrap"><table><tr><th>صفحة الملف</th><th>الرقم المطبوع</th><th>الصورة</th><th>حالة المحتوى</th><th>ملاحظة</th><th></th></tr>
      ${c.pages.map(p => `<tr><td>${p.file_page}</td><td>${esc(p.printed_page || '—')}</td><td>${p.has_image ? '<span class="badge green">مرفوعة</span>' : '<span class="badge red">لم تُرفع</span>'}</td>
        <td><span class="badge ${TS[p.text_status]?.[0] || 'gray'}">${TS[p.text_status]?.[1] || esc(p.text_status)}</span></td><td class="small">${esc(p.note || '')}</td>
        <td><div class="row" style="gap:4px">${p.has_image ? `<button class="btn ghost sm" data-pv="${p.file_page}">عرض</button>` : ''}<button class="btn ghost sm" data-pe="${p.id}">تعديل</button><button class="btn danger sm" data-pd="${p.id}">حذف</button></div></td></tr>`).join('')}</table></div>`
      : '<p class="muted small">لم تُحدد صفحات مطلوبة بعد. ارفع ملفًا وحدد صفحاته.</p>'}
    ${c.pages.some(p => !p.has_image) ? '<div class="note small" style="margin-top:8px">صفحات بلا صورة: ارفع ملف المقرر وحدد هذه الصفحات ليتمكن الطلاب من فتح الصفحة الأصلية.</div>' : ''}
    ${c.pages.some(p => ['scanned', 'failed', 'image', 'unknown'].includes(p.text_status)) ? '<div class="note small" style="margin-top:8px">بعض الصفحات مصوّرة أو تعذر استخراج نصها: راجعها وأدخل محتواها يدويًا في «الشرح» و«بنك الأسئلة»، ثم غيّر حالتها إلى «أُدخل المحتوى».</div>' : ''}</div>
  ${c.files.length ? `<div class="card"><h3>الملفات المرفوعة</h3>${c.files.map(f => `<div class="row between" style="border-bottom:1px solid var(--line);padding:6px 0"><span>📄 ${esc(f.original_name)} <span class="small muted">(${f.page_count ?? '?'} صفحة · ${fmtDate(f.uploaded_at)})</span></span><button class="btn danger sm" data-delf="${f.id}">حذف الملف وصفحاته</button></div>`).join('')}</div>` : ''}
  <p class="hint">التوليد بمساعدة الذكاء الاصطناعي غير متاح في هذا الإصدار المجاني؛ أدخل الشرح والأسئلة يدويًا ثم راجعها وانشرها.</p>`);
  $('#up', el).onsubmit = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0]; if (!file) return;
    if (file.type === 'application/pdf') return selectPages(c, file);
    const def = (Math.max(0, ...c.pages.map(p => p.file_page)) || 0) + 1;
    const m = modal(`<h2>رفع صورة صفحة</h2><div id="err"></div><div class="grid g2" style="gap:12px"><div class="field"><label>رقم الصفحة في المقرر</label><input id="fp" type="number" min="1" value="${def}"></div><div class="field"><label>الرقم المطبوع (اختياري)</label><input id="pp"></div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>إلغاء</button><button class="btn green" id="go">رفع</button></div>`);
    $('#go', m.el).onclick = async () => {
      try {
        $('#go', m.el).disabled = true;
        const img = await imageToJpeg(file);
        const f = await post(`/api/admin/courses/${c.id}/files`, { name: file.name, mime: file.type, size: file.size, page_count: 1 });
        await post('/api/admin/pages', { file_id: f.id, file_page: $('#fp', m.el).value, printed_page: $('#pp', m.el).value, text_status: 'image', note: 'صورة: يلزم إدخال محتواها يدويًا ثم مراجعته.', mime: 'image/jpeg', ...img });
        m.close(); toast('رُفعت الصورة.'); coursePage(c.id, 'pages');
      } catch (er) { $('#err', m.el).innerHTML = errorBox(er); $('#go', m.el).disabled = false; }
    };
  };
  $$('[data-pv]', el).forEach(b => b.onclick = () => openPage({ pages: c.pages, page: +b.dataset.pv }));
  $$('[data-pd]', el).forEach(b => b.onclick = async () => { if (await confirmBox('حذف هذه الصفحة من المقرر؟', { danger: true })) { await del(`/api/admin/pages/${b.dataset.pd}`); coursePage(c.id, 'pages'); } });
  $$('[data-delf]', el).forEach(b => b.onclick = async () => { if (await confirmBox('حذف الملف وصفحاته المحددة؟ لا يؤثر ذلك على نتائج التقويم المحفوظة.', { danger: true })) { await del(`/api/admin/files/${b.dataset.delf}`); coursePage(c.id, 'pages'); } });
  $$('[data-pe]', el).forEach(b => b.onclick = () => {
    const pg = c.pages.find(x => x.id === +b.dataset.pe);
    const m = modal(`<h2>صفحة الملف ${pg.file_page}</h2><form id="f"><div class="field"><label>الرقم المطبوع على الصفحة (إن اختلف)</label><input name="printed_page" value="${esc(pg.printed_page || '')}"></div>
      <div class="field"><label>حالة المحتوى</label><select name="text_status">${Object.entries(TS).map(([k, v]) => `<option value="${k}" ${k === pg.text_status ? 'selected' : ''}>${v[1]}</option>`).join('')}</select></div>
      <div class="field"><label>ملاحظة</label><input name="note" value="${esc(pg.note || '')}"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`);
    $('#f', m.el).onsubmit = async (e) => { e.preventDefault(); await put(`/api/admin/pages/${pg.id}`, form(e.target)); m.close(); coursePage(c.id, 'pages'); };
  });
}

async function selectPages(c, localFile) {
  let doc, count = 0; const scan = {};
  try { doc = await pdfFromBlob(await localFile.arrayBuffer()); count = doc.numPages; }
  catch { return toast('تعذر فتح ملف PDF. تأكد أنه غير تالف أو محمي بكلمة مرور.', true); }
  const existing = new Map(c.pages.map(p => [p.file_page, p]));
  const lo = existing.size ? Math.min(...existing.keys()) : 1, hi = existing.size ? Math.min(count, Math.max(...existing.keys())) : Math.min(count, 5);
  const m = modal(`<h2>تحديد الصفحات المطلوبة</h2>
    <p class="small muted">الملف: ${esc(localFile.name)} — ${count} صفحة. حدد النطاق، وستُفحص النصوص تلقائيًا. ستُحفظ صور الصفحات المحددة فقط.</p>
    <div class="row"><div class="field" style="width:120px"><label>من صفحة</label><input id="from" type="number" min="1" max="${count}" value="${lo}"></div>
    <div class="field" style="width:120px"><label>إلى صفحة</label><input id="to" type="number" min="1" max="${count}" value="${hi}"></div>
    <button class="btn ghost" id="scan">فحص النص</button></div>
    <div id="rows"></div><div id="prog"></div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-close>إلغاء</button><button class="btn green" id="save">رفع الصفحات المحددة</button></div>`, { wide: true });
  const range = () => { const a = Math.max(1, +$('#from', m.el).value), b = Math.min(count, +$('#to', m.el).value); const out = []; for (let i = a; i <= b && i - a < 100; i++) out.push(i); return out; };
  const drawRows = () => {
    $('#rows', m.el).innerHTML = `<div class="table-wrap"><table><tr><th>صفحة الملف</th><th>الرقم المطبوع</th><th>نتيجة الفحص</th></tr>${range().map(p => {
      const ex = existing.get(p) || {}; const st = scan[p] || 'unknown';
      return `<tr><td>${p}</td><td><input data-pp="${p}" value="${esc(ex.printed_page || scan['pp' + p] || '')}" style="max-width:120px" placeholder="—"></td><td><span class="badge ${TS[st][0]}">${TS[st][1]}</span></td></tr>`;
    }).join('')}</table></div>`;
  };
  const runScan = async () => {
    for (const p of range()) {
      try {
        const tc = await (await doc.getPage(p)).getTextContent();
        const txt = tc.items.map(i => i.str).join(' ').trim();
        scan[p] = txt.replace(/\s/g, '').length > 25 ? 'ok' : 'scanned';
        const num = txt.match(/(?:^|\s)(\d{1,4})\s*$/); if (num) scan['pp' + p] = num[1];
      } catch { scan[p] = 'failed'; }
    }
    drawRows();
  };
  $('#from', m.el).onchange = runScan; $('#to', m.el).onchange = runScan; $('#scan', m.el).onclick = runScan;
  drawRows(); await runScan();
  $('#save', m.el).onclick = async () => {
    const pages = range(); if (!pages.length) return;
    $('#save', m.el).disabled = true;
    const prog = $('#prog', m.el);
    try {
      const f = await post(`/api/admin/courses/${c.id}/files`, { name: localFile.name, mime: 'application/pdf', size: localFile.size, page_count: count });
      for (const [k, p] of pages.entries()) {
        prog.innerHTML = `<p class="muted">جارٍ تحويل الصفحة ${p} ورفعها (${k + 1} من ${pages.length})…</p>`;
        const img = await renderPdfPage(doc, p);
        const st = scan[p] || 'unknown';
        await post('/api/admin/pages', { file_id: f.id, file_page: p, printed_page: $(`[data-pp="${p}"]`, m.el).value.trim(), text_status: st,
          note: st === 'scanned' ? 'صفحة مصوّرة: يلزم إدخال محتواها يدويًا ومراجعته.' : st === 'failed' ? 'تعذر استخراج النص: راجع الصفحة.' : '', mime: 'image/jpeg', ...img });
      }
      m.close(); toast(`رُفعت ${pages.length} صفحات.`); coursePage(c.id, 'pages');
    } catch (e) { prog.innerHTML = errorBox(e); $('#save', m.el).disabled = false; }
  };
}

async function skillsTab(c, head) {
  const list = await get(`/api/admin/courses/${c.id}/skills`);
  const el = render(`${head}<div class="card"><div class="row between"><h3>مهارات المقرر</h3><button class="btn green sm" id="add">+ مهارة</button></div>
    <div class="table-wrap"><table><tr><th>المهارة</th><th>القسم</th><th>صفحة الملف</th><th></th></tr>${list.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.section)}</td><td>${s.file_page ?? '—'}</td><td><button class="btn ghost sm" data-e="${s.id}">تعديل</button></td></tr>`).join('')}</table></div></div>`);
  const edit = (s) => {
    const m = modal(`<h2>${s ? 'تعديل مهارة' : 'مهارة جديدة'}</h2><div id="err"></div><form id="f"><div class="field"><label>الاسم</label><input name="name" value="${esc(s?.name || '')}" required></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label>القسم</label><select name="section"><option ${s?.section === 'كمي' ? 'selected' : ''}>كمي</option><option ${s?.section === 'لفظي' ? 'selected' : ''}>لفظي</option></select></div>
      <div class="field"><label>صفحة الملف</label><input type="number" name="file_page" value="${s?.file_page ?? ''}"></div></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`);
    $('#f', m.el).onsubmit = async (e) => { e.preventDefault(); try { s ? await put(`/api/admin/skills/${s.id}`, form(e.target)) : await post(`/api/admin/courses/${c.id}/skills`, form(e.target)); m.close(); coursePage(c.id, 'skills'); } catch (er) { $('#err', m.el).innerHTML = errorBox(er); } };
  };
  $('#add', el).onclick = () => edit(null);
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(list.find(s => s.id === +b.dataset.e)));
}

async function lessonsTab(c, head) {
  const [list, skills] = await Promise.all([get(`/api/admin/courses/${c.id}/lessons`), get(`/api/admin/courses/${c.id}/skills`)]);
  const el = render(`${head}<div class="card"><div class="row between"><h3>الشرح (${list.length})</h3><div class="row"><a class="btn ghost sm" href="#/a/course/${c.id}/lessons?preview=1" id="pv">معاينة كما يراه الطالب</a><button class="btn green sm" id="add">+ شرح</button></div></div>
    <div class="table-wrap"><table><tr><th>العنوان</th><th>المهارة</th><th>الصفحة</th><th>المصدر</th><th>الحالة</th><th></th></tr>
    ${list.map(l => `<tr><td>${esc(l.title)}<div class="small muted">${esc(l.content.summary || '').slice(0, 90)}</div></td><td class="small">${esc(skills.find(s => s.id === l.skill_id)?.name || '—')}</td><td>${l.file_page ?? '—'}${l.printed_page ? ` (مطبوع ${esc(l.printed_page)})` : ''}</td><td><span class="badge gray">${SRC[l.source] || l.source}</span></td><td>${badge(l.status)}</td>
      <td><div class="row" style="gap:4px"><button class="btn ghost sm" data-e="${l.id}">مراجعة وتعديل</button>${l.status === 'draft' ? `<button class="btn green sm" data-pub="${l.id}">نشر</button>` : `<button class="btn ghost sm" data-unpub="${l.id}">إخفاء</button>`}<button class="btn danger sm" data-d="${l.id}">حذف</button></div></td></tr>`).join('')}</table></div></div>`);
  $('#pv', el).onclick = (e) => { e.preventDefault(); previewLessons(list); };
  $('#add', el).onclick = () => lessonEditor(c, null, skills);
  $$('[data-e]', el).forEach(b => b.onclick = () => lessonEditor(c, list.find(l => l.id === +b.dataset.e), skills));
  $$('[data-pub]', el).forEach(b => b.onclick = async () => { await post(`/api/admin/lessons/${b.dataset.pub}/status`, { status: 'published' }); coursePage(c.id, 'lessons'); });
  $$('[data-unpub]', el).forEach(b => b.onclick = async () => { await post(`/api/admin/lessons/${b.dataset.unpub}/status`, { status: 'draft' }); coursePage(c.id, 'lessons'); });
  $$('[data-d]', el).forEach(b => b.onclick = async () => { if (await confirmBox('حذف هذا الشرح؟', { danger: true })) { await del(`/api/admin/lessons/${b.dataset.d}`); coursePage(c.id, 'lessons'); } });
}
function previewLessons(list) {
  modal(`<div class="modal-head"><h2>معاينة الشرح</h2><button class="btn sm" data-close>إغلاق</button></div>${list.map(l => `<div class="lesson card"><h3>${esc(l.title)} ${badge(l.status)}</h3><p><b>${esc(l.content.summary)}</b></p><ul>${(l.content.explanation || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${(l.content.examples || []).map((e, i) => `<div class="example"><b>مثال ${i + 1}:</b> ${esc(e.q)}<ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="ans">الإجابة: ${esc(e.answer)}</div></div>`).join('')}
    ${(l.content.mistakes || []).map(x => `<div class="mistake">${esc(x)}</div>`).join('')}${(l.content.quick || []).map(x => `<div class="quick">${esc(x)}</div>`).join('')}</div>`).join('')}`, { wide: true });
}
function lessonEditor(c, l, skills) {
  const ct = l?.content || { explanation: [], examples: [], mistakes: [], quick: [] };
  const exHtml = (e = { q: '', steps: [], answer: '' }) => `<div class="example ex"><div class="field"><label>نص المثال</label><input data-x="q" value="${esc(e.q)}"></div><div class="field"><label>الخطوات (سطر لكل خطوة)</label><textarea data-x="steps">${esc(e.steps.join('\n'))}</textarea></div><div class="field"><label>الإجابة</label><input data-x="answer" value="${esc(e.answer)}"></div><button type="button" class="btn danger sm" data-rmex>حذف المثال</button></div>`;
  const m = modal(`<h2>${l ? 'مراجعة الشرح وتعديله' : 'شرح جديد'}</h2>${l && l.source !== 'manual' ? `<div class="note small">مصدر هذا الشرح: ${SRC[l.source]}. راجع صحته مقابل الصفحة الأصلية قبل النشر.</div>` : ''}<div id="err"></div><form id="f">
    <div class="grid g2" style="gap:12px"><div class="field"><label>العنوان</label><input name="title" value="${esc(l?.title || '')}" required></div><div class="field"><label>الموضوع</label><input name="topic" value="${esc(l?.topic || '')}"></div>
    <div class="field"><label>المهارة</label><select name="skill_id"><option value="">—</option>${skills.map(s => `<option value="${s.id}" ${l?.skill_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label>صفحة الملف</label><input type="number" name="file_page" value="${l?.file_page ?? ''}"></div><div class="field"><label>الرقم المطبوع (إن اختلف)</label><input name="printed_page" value="${esc(l?.printed_page || '')}"></div></div>
    <div class="field"><label>الملخص</label><textarea name="summary">${esc(ct.summary || '')}</textarea></div>
    <div class="field"><label>نقاط الشرح المبسّط (سطر لكل نقطة)</label><textarea name="explanation" rows="6">${esc((ct.explanation || []).join('\n'))}</textarea></div>
    <label>أمثلة محلولة</label><div id="exs">${(ct.examples || []).map(exHtml).join('')}</div><button type="button" class="btn ghost sm" id="addex">+ مثال</button>
    <div class="field" style="margin-top:12px"><label>أخطاء شائعة (سطر لكل خطأ)</label><textarea name="mistakes">${esc((ct.mistakes || []).join('\n'))}</textarea></div>
    <div class="field"><label>ملخص سريع (سطر لكل نقطة)</label><textarea name="quick">${esc((ct.quick || []).join('\n'))}</textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button>${l?.status === 'draft' ? '<button type="button" class="btn" id="savepub">حفظ ونشر</button>' : ''}</div></form>`, { wide: true });
  $('#addex', m.el).onclick = () => $('#exs', m.el).insertAdjacentHTML('beforeend', exHtml());
  $('#exs', m.el).onclick = (e) => { if (e.target.closest('[data-rmex]')) e.target.closest('.ex').remove(); };
  const collect = () => {
    const b = form($('#f', m.el));
    b.examples = $$('.ex', m.el).map(x => ({ q: $('[data-x=q]', x).value, steps: $('[data-x=steps]', x).value.split('\n'), answer: $('[data-x=answer]', x).value }));
    ['explanation', 'mistakes', 'quick'].forEach(k => { b[k] = b[k].split('\n'); });
    b.skill_id = b.skill_id ? +b.skill_id : null;
    return b;
  };
  const save = async (publish) => {
    try {
      const b = collect();
      let id = l?.id;
      if (l) await put(`/api/admin/lessons/${l.id}`, b); else id = (await post(`/api/admin/courses/${c.id}/lessons`, b)).id;
      if (publish) await post(`/api/admin/lessons/${id}/status`, { status: 'published' });
      m.close(); toast('تم الحفظ.'); coursePage(c.id, 'lessons');
    } catch (er) { $('#err', m.el).innerHTML = errorBox(er); m.el.scrollIntoView(); }
  };
  $('#f', m.el).onsubmit = (e) => { e.preventDefault(); save(false); };
  const sp = $('#savepub', m.el); if (sp) sp.onclick = () => save(true);
}

async function questionsTab(c, head, q) {
  const [list, skills] = await Promise.all([get(`/api/admin/courses/${c.id}/questions`), get(`/api/admin/courses/${c.id}/skills`)]);
  const f = { pool: q?.get('pool') || '', status: q?.get('status') || '', skill: q?.get('skill') || '' };
  const shown = list.filter(x => (!f.pool || x.pool === f.pool) && (!f.status || x.status === f.status) && (!f.skill || String(x.skill_id) === f.skill));
  const el = render(`${head}<div class="card"><div class="row between"><h3>بنك الأسئلة (${shown.length} من ${list.length})</h3><button class="btn green sm" id="add">+ سؤال</button></div>
    <div class="row" style="margin:8px 0">
      <select id="fp" style="max-width:160px"><option value="">التدريب والتقويم</option><option value="practice" ${f.pool === 'practice' ? 'selected' : ''}>تدريب</option><option value="assessment" ${f.pool === 'assessment' ? 'selected' : ''}>تقويم</option></select>
      <select id="fs" style="max-width:160px"><option value="">كل الحالات</option><option value="draft" ${f.status === 'draft' ? 'selected' : ''}>مسودة</option><option value="published" ${f.status === 'published' ? 'selected' : ''}>منشور</option><option value="retired" ${f.status === 'retired' ? 'selected' : ''}>مستبعد</option></select>
      <select id="fk" style="max-width:260px"><option value="">كل المهارات</option>${skills.map(s => `<option value="${s.id}" ${String(s.id) === f.skill ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    ${shown.map(x => `<div style="border-top:1px solid var(--line);padding:10px 0">
      <div class="row between small"><span>${badge(x.status)} <span class="badge ${x.pool === 'assessment' ? 'amber' : ''}">${x.pool === 'assessment' ? 'تقويم' : 'تدريب'}</span> <span class="badge gray">${DIFF[x.difficulty]}</span> <span class="badge gray">ص ${x.file_page ?? '—'}</span> <span class="badge gray">${SRC[x.source] || x.source}</span> <span class="muted">${esc(skills.find(s => s.id === x.skill_id)?.name || 'بلا مهارة')}</span></span>
        <span class="row" style="gap:4px"><button class="btn ghost sm" data-e="${x.id}">مراجعة وتعديل</button>${x.status !== 'published' ? `<button class="btn green sm" data-st="${x.id}:published">نشر</button>` : `<button class="btn ghost sm" data-st="${x.id}:draft">إخفاء</button>`}<button class="btn danger sm" data-d="${x.id}">حذف</button></span></div>
      <p style="margin:6px 0"><b>${esc(x.stem)}</b></p>
      <div class="small">${x.choices.map((ch, k) => `<span style="margin-inline-end:14px;${k === x.answer ? 'color:var(--green-2);font-weight:700' : ''}">${'أبجدهو'[k]}) ${esc(ch)}${k === x.answer ? ' ✓' : ''}</span>`).join('')}</div>
      <div class="small muted">التفسير: ${esc(x.explanation)}${x.hint ? ` · التلميح: ${esc(x.hint)}` : ''}</div></div>`).join('') || '<p class="muted">لا توجد أسئلة مطابقة.</p>'}</div>`);
  const refilter = () => { location.hash = `#/a/course/${c.id}/questions?pool=${$('#fp').value}&status=${$('#fs').value}&skill=${$('#fk').value}`; };
  ['#fp', '#fs', '#fk'].forEach(s => { $(s).onchange = refilter; });
  $('#add', el).onclick = () => questionEditor(c, null, skills);
  $$('[data-e]', el).forEach(b => b.onclick = () => questionEditor(c, list.find(x => x.id === +b.dataset.e), skills));
  $$('[data-st]', el).forEach(b => b.onclick = async () => { const [id, st] = b.dataset.st.split(':'); await post(`/api/admin/questions/${id}/status`, { status: st }); coursePage(c.id, 'questions', q); });
  $$('[data-d]', el).forEach(b => b.onclick = async () => { if (await confirmBox('حذف السؤال؟ إن كان مستخدمًا في التدريب سيُستبعد بدل حذفه. المحاولات المكتملة لا تتأثر.', { danger: true })) { await del(`/api/admin/questions/${b.dataset.d}`); coursePage(c.id, 'questions', q); } });
}
function questionEditor(c, x, skills) {
  const choices = x?.choices || ['', '', '', ''];
  const m = modal(`<h2>${x ? 'مراجعة السؤال وتعديله' : 'سؤال جديد'}</h2>${x && x.source !== 'manual' ? `<div class="note small">مصدر السؤال: ${SRC[x.source]}. تحقّق من صحة الإجابة والتفسير قبل النشر.</div>` : ''}<div id="err"></div><form id="f">
    <div class="grid g3" style="gap:12px">
      <div class="field"><label>القسم</label><select name="pool"><option value="practice" ${x?.pool === 'practice' ? 'selected' : ''}>تدريب</option><option value="assessment" ${x?.pool === 'assessment' ? 'selected' : ''}>تقويم</option></select></div>
      <div class="field"><label>المهارة</label><select name="skill_id"><option value="">—</option>${skills.map(s => `<option value="${s.id}" ${x?.skill_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الصعوبة</label><select name="difficulty">${[1, 2, 3].map(d => `<option value="${d}" ${x?.difficulty === d ? 'selected' : ''}>${DIFF[d]}</option>`).join('')}</select></div>
      <div class="field"><label>صفحة الملف</label><input type="number" name="file_page" value="${x?.file_page ?? ''}"></div></div>
    <div class="field"><label>نص السؤال</label><textarea name="stem" required>${esc(x?.stem || '')}</textarea></div>
    <label>الخيارات (حدد الإجابة الصحيحة الوحيدة)</label>
    <div id="chs">${choices.map((ch, k) => `<div class="row" style="margin-bottom:6px"><input type="radio" name="answer" value="${k}" ${x?.answer === k ? 'checked' : ''} aria-label="الإجابة الصحيحة"><input data-ch value="${esc(ch)}" style="flex:1"></div>`).join('')}</div>
    <div class="field" style="margin-top:10px"><label>تفسير الحل المعتمد (خطوات الحل)</label><textarea name="explanation" required>${esc(x?.explanation || '')}</textarea></div>
    <div class="field"><label>تلميح (للتدريب)</label><input name="hint" value="${esc(x?.hint || '')}"></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button>${!x || x.status !== 'published' ? '<button type="button" class="btn" id="savepub">حفظ ونشر</button>' : ''}</div></form>`, { wide: true });
  const save = async (publish) => {
    const b = form($('#f', m.el)); b.choices = $$('[data-ch]', m.el).map(i => i.value); b.answer = b.answer === undefined ? -1 : +b.answer;
    try { let id = x?.id; if (x) await put(`/api/admin/questions/${x.id}`, b); else id = (await post(`/api/admin/courses/${c.id}/questions`, b)).id; if (publish) await post(`/api/admin/questions/${id}/status`, { status: 'published' }); m.close(); toast('تم الحفظ.'); coursePage(c.id, 'questions', new URLSearchParams(location.hash.split('?')[1] || '')); }
    catch (er) { $('#err', m.el).innerHTML = errorBox(er); }
  };
  $('#f', m.el).onsubmit = (e) => { e.preventDefault(); save(false); };
  const sp = $('#savepub', m.el); if (sp) sp.onclick = () => save(true);
}

async function coverageTab(c, head) {
  const d = await get(`/api/admin/courses/${c.id}/coverage`);
  const gapCell = (g) => g.length ? g.map(x => `<span class="badge red">${esc(x)}</span>`).join(' ') : '<span class="badge green">مغطاة</span>';
  render(`${head}<div class="info small">يحسب الجدول المحتوى «المنشور» فقط. المسودات تظهر في عمود مستقل حتى تُراجع وتُنشر.</div>
  <div class="card"><h3>تغطية الصفحات</h3><div class="table-wrap"><table><tr><th>صفحة الملف</th><th>المطبوع</th><th>المهارات</th><th>شرح</th><th>تدريب</th><th>تقويم</th><th>حالة المحتوى</th><th>التنبيهات</th></tr>
    ${d.pages.map(p => `<tr><td>${p.file_page}</td><td>${esc(p.printed_page || '—')}</td><td class="small">${p.skills.map(esc).join('، ') || '—'}</td><td>${p.lessons}</td><td>${p.practice}</td><td>${p.assessment}</td><td><span class="badge ${TS[p.text_status]?.[0]}">${TS[p.text_status]?.[1]}</span></td><td>${gapCell(p.gaps)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">لم تُحدد صفحات مطلوبة.</td></tr>'}</table></div></div>
  <div class="card"><h3>تغطية المهارات (جدول المواصفات)</h3><div class="table-wrap"><table><tr><th>المهارة</th><th>الصفحة</th><th>شرح منشور</th><th>أسئلة تدريب</th><th>أسئلة تقويم</th><th>مسودات</th><th>التنبيهات</th></tr>
    ${d.skills.map(s => `<tr><td>${esc(s.name)}</td><td>${s.file_page ?? '—'}</td><td>${s.lessons}</td><td>${s.practice}</td><td>${s.assessment}</td><td>${s.drafts + s.lessons_draft}</td><td>${gapCell(s.gaps)}</td></tr>`).join('')}</table></div></div>`);
}

// ================= التقويمات =================
async function assessments() {
  const [list, cs] = await Promise.all([get('/api/admin/assessments'), get('/api/admin/courses')]);
  const SC = { best: 'أعلى محاولة', last: 'آخر محاولة', first: 'أول محاولة' };
  const el = render(`${tabs('assessments')}
  <div class="row between"><p class="muted small" style="margin:0">التقويم هو المصدر الرسمي للدرجات. تُسحب الأسئلة عشوائيًا من أسئلة «التقويم» المنشورة بتوزيع متوازن على المهارات، وتُحفظ نسخة ثابتة لكل محاولة.</p><button class="btn green" id="add">+ تقويم جديد</button></div>
  <div class="card" style="margin-top:12px"><div class="table-wrap"><table><tr><th>العنوان</th><th>المقرر</th><th>الأسئلة</th><th>المدة</th><th>الاجتياز</th><th>المحاولات</th><th>المعتمدة</th><th>الإتاحة</th><th>مجموعة المقارنة</th><th>الحالة</th><th></th></tr>
  ${list.map(a => `<tr><td><b>${esc(a.title)}</b><div class="small muted">${a.attempts} محاولة مكتملة</div></td><td>${esc(a.course_title)}</td><td>${a.num_questions}<div class="small ${a.pool < a.num_questions ? '' : 'muted'}" ${a.pool < a.num_questions ? 'style="color:var(--red)"' : ''}>البنك المنشور: ${a.pool}</div></td><td>${a.duration_min} د</td><td>${a.pass_score}</td><td>${a.max_attempts}</td><td>${SC[a.scoring]}</td>
    <td class="small">${a.available_from ? fmtDate(a.available_from, true) : 'فوري'} ← ${a.available_to ? fmtDate(a.available_to, true) : 'مفتوح'}</td><td>${esc(a.compare_group || '—')}</td><td>${badge(a.status)}</td>
    <td><div class="row" style="gap:4px"><button class="btn ghost sm" data-e="${a.id}">تعديل</button>${a.status !== 'published' ? `<button class="btn green sm" data-st="${a.id}:published">نشر</button>` : `<button class="btn ghost sm" data-st="${a.id}:closed">إغلاق</button>`}<a class="btn ghost sm" href="#/a/results?assessment=${a.id}">النتائج</a></div></td></tr>`).join('')}</table></div></div>`);
  const edit = (a) => {
    const m = modal(`<h2>${a ? 'تعديل التقويم' : 'تقويم جديد'}</h2><div id="err"></div><form id="f">
      <div class="grid g2" style="gap:12px"><div class="field"><label>العنوان</label><input name="title" value="${esc(a?.title || '')}" required></div>
      <div class="field"><label>المقرر</label><select name="course_id">${cs.map(c => `<option value="${c.id}" ${a?.course_id === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div>
      <div class="field"><label>عدد الأسئلة</label><input type="number" name="num_questions" min="1" value="${a?.num_questions ?? 20}"></div>
      <div class="field"><label>المدة (دقائق)</label><input type="number" name="duration_min" min="1" value="${a?.duration_min ?? 30}"></div>
      <div class="field"><label>درجة الاجتياز (من 100)</label><input type="number" name="pass_score" min="0" max="100" value="${a?.pass_score ?? 60}"></div>
      <div class="field"><label>عدد المحاولات</label><input type="number" name="max_attempts" min="1" value="${a?.max_attempts ?? 3}"></div>
      <div class="field"><label>المحاولة المعتمدة للدرجة والمقارنة</label><select name="scoring">${Object.entries(SC).map(([k, v]) => `<option value="${k}" ${a?.scoring === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>مجموعة النماذج المتكافئة (اختياري)</label><input name="compare_group" value="${esc(a?.compare_group || '')}"><div class="hint">التقويمات بنفس الاسم هنا تُقارن معًا.</div></div>
      <div class="field"><label>متاح من</label><input type="datetime-local" name="available_from" value="${toLocalInput(a?.available_from)}"></div>
      <div class="field"><label>متاح حتى</label><input type="datetime-local" name="available_to" value="${toLocalInput(a?.available_to)}"></div></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn green">حفظ</button></div></form>`, { wide: true });
    $('#f', m.el).onsubmit = async (e) => { e.preventDefault(); const b = form(e.target); for (const k of ['available_from', 'available_to']) b[k] = b[k] ? new Date(b[k]).toISOString() : ''; try { a ? await put(`/api/admin/assessments/${a.id}`, b) : await post('/api/admin/assessments', b); m.close(); toast('تم الحفظ.'); assessments(); } catch (er) { $('#err', m.el).innerHTML = errorBox(er); } };
  };
  $('#add', el).onclick = () => edit(null);
  $$('[data-e]', el).forEach(b => b.onclick = () => edit(list.find(a => a.id === +b.dataset.e)));
  $$('[data-st]', el).forEach(b => b.onclick = async () => { const [id, st] = b.dataset.st.split(':'); try { await post(`/api/admin/assessments/${id}/status`, { status: st }); assessments(); } catch (e) { toast(e.message, true); } });
}

// ================= النتائج =================
async function results(id, sub, q) {
  const aid = q?.get('assessment') || '';
  const [rows, list, ov] = await Promise.all([get(`/api/admin/results${aid ? `?assessment=${aid}` : ''}`), get('/api/admin/assessments'), get('/api/admin/overview')]);
  const done = rows.filter(r => r.status === 'submitted');
  const off = done.filter(r => r.official);
  const avg = off.length ? Math.round(off.reduce((s, r) => s + r.score, 0) / off.length * 10) / 10 : null;
  const el = render(`${tabs('results')}
  <div class="row no-print"><select id="fa" style="max-width:320px"><option value="">كل التقويمات</option>${list.map(a => `<option value="${a.id}" ${String(a.id) === aid ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select><button class="btn sm" id="print">🖨️ طباعة / PDF التقرير الجماعي</button></div>
  <div class="only-print report-head"><img src="logo.jpg" alt=""><div><h1 style="margin:0">التقرير الجماعي</h1><div class="small">منصة ابوسالم في القدرات — ${fmtDate(new Date().toISOString())}</div></div></div>
  <div class="grid g4" style="margin-top:12px"><div class="stat"><div class="v">${done.length}</div><div class="l">محاولات مكتملة</div></div><div class="stat"><div class="v">${new Set(off.map(r => r.user_id)).size}</div><div class="l">طلاب لديهم درجة معتمدة</div></div>
    <div class="stat"><div class="v">${avg ?? '—'}</div><div class="l">متوسط الدرجات المعتمدة</div></div><div class="stat"><div class="v">${rows.filter(r => r.needs_review).length}</div><div class="l">تحتاج مراجعة</div></div></div>
  <div class="card" style="margin-top:14px"><h2>المحاولات</h2><div class="table-wrap"><table><tr><th>الطالب</th><th>التقويم</th><th>المحاولة</th><th>الحالة</th><th>الدرجة</th><th>ص/خ/م/مستبعد</th><th>الزمن</th><th>التاريخ</th><th class="no-print"></th></tr>
  ${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.title)}</td><td>${r.attempt_no}${r.official ? ' <span class="badge green">معتمدة</span>' : ''}</td><td>${r.status === 'submitted' ? (r.submit_reason === 'timeout' ? 'سُلّمت بانتهاء الوقت' : 'مكتملة') : 'جارية'}${r.needs_review ? ' <span class="badge amber">مراجعة</span>' : ''}</td>
    <td><b>${r.status === 'submitted' ? fmtScore(r.score) : '—'}</b></td><td>${r.status === 'submitted' ? `${r.correct}/${r.wrong}/${r.blank}/${r.excluded}` : '—'}</td><td>${esc(r.duration)}</td><td class="small">${fmtDate(r.submitted_at || r.started_at, true)}</td>
    <td class="no-print"><div class="row" style="gap:4px">${r.status === 'submitted' ? `<a class="btn ghost sm" href="#/report/attempt/${r.id}">التقرير</a>` : ''}${r.needs_review ? `<button class="btn sm" data-rv="${r.id}">مراجعة</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="9" class="muted">لا توجد محاولات.</td></tr>'}</table></div></div>
  <div class="card"><h2>المهارات المشتركة التي تحتاج إلى دعم</h2>${ov.groupSkills.length ? `<div class="table-wrap"><table><tr><th>المهارة</th><th>النسبة</th><th>الأسئلة</th><th>الطلاب</th><th>التصنيف</th></tr>${ov.groupSkills.map(k => `<tr><td>${esc(k.name)}</td><td>${k.pct}%</td><td>${k.n}</td><td>${k.students}</td><td><span class="badge ${LEVEL_BADGE[k.level]}">${esc(k.label)}</span></td></tr>`).join('')}</table></div>` : '<p class="muted">لا توجد بيانات.</p>'}</div>
  <div class="card no-print"><h2>التقارير الفردية التراكمية</h2><div class="row">${ov.students.filter(s => s.status === 'active').map(s => `<a class="btn ghost sm" href="#/report/student/${s.id}">${esc(s.name)}</a>`).join('') || '<span class="muted">لا يوجد طلاب مفعّلون.</span>'}</div></div>`);
  $('#fa', el).onchange = (e) => { location.hash = `#/a/results${e.target.value ? `?assessment=${e.target.value}` : ''}`; };
  $('#print', el).onclick = () => window.print();
  $$('[data-rv]', el).forEach(b => b.onclick = () => {
    const r = rows.find(x => x.id === +b.dataset.rv);
    const m = modal(`<h2>مراجعة محاولة ${esc(r.name)}</h2><p>${r.excluded} سؤال لم يُسجَّل ظهوره للطالب (خلل تقني محتمل)، فاستُبعد من الحساب ولم يُعدّ خطأً. الدرجة الحالية: <b>${fmtScore(r.score)}</b>.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="k">إبقاؤها مستبعدة</button><button class="btn" id="b">احتسابها متروكة</button></div>`);
    $('#k', m.el).onclick = async () => { await post(`/api/admin/attempts/${r.id}/resolve`, { decision: 'keep_excluded' }); m.close(); results(id, sub, q); };
    $('#b', m.el).onclick = async () => { await post(`/api/admin/attempts/${r.id}/resolve`, { decision: 'count_as_blank' }); m.close(); results(id, sub, q); };
  });
}

// ================= التنبيهات =================
async function announcements() {
  const list = await get('/api/admin/announcements');
  const AUD = { all: 'الجميع', students: 'الطلاب', parents: 'أولياء الأمور' };
  const el = render(`${tabs('announcements')}<div class="card"><h2>نشر تنبيه</h2><div id="err"></div><form id="f">
    <div class="field"><label>العنوان</label><input name="title" required></div><div class="field"><label>النص</label><textarea name="body"></textarea></div>
    <div class="field" style="max-width:240px"><label>الفئة</label><select name="audience">${Object.entries(AUD).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><button class="btn green">نشر</button></form></div>
    <div class="card"><h2>التنبيهات المنشورة</h2>${list.map(a => `<div class="row between" style="border-bottom:1px solid var(--line);padding:8px 0"><div><b>${esc(a.title)}</b> <span class="badge">${AUD[a.audience]}</span><div class="small">${esc(a.body || '')}</div><div class="small muted">${fmtDate(a.created_at, true)}</div></div><button class="btn danger sm" data-d="${a.id}">حذف</button></div>`).join('') || '<p class="muted">لا توجد.</p>'}</div>`);
  $('#f', el).onsubmit = async (e) => { e.preventDefault(); try { await post('/api/admin/announcements', form(e.target)); toast('نُشر التنبيه.'); announcements(); } catch (er) { $('#err').innerHTML = errorBox(er); } };
  $$('[data-d]', el).forEach(b => b.onclick = async () => { await del(`/api/admin/announcements/${b.dataset.d}`); announcements(); });
}

// ================= الإعدادات =================
async function settings() {
  const s = await get('/api/admin/settings');
  const el = render(`${tabs('settings')}<div class="card" style="max-width:640px"><h2>معايير التصنيف والمقارنة</h2><div id="err"></div><form id="f">
    <div class="grid g2" style="gap:12px"><div class="field"><label>«متقن» من نسبة</label><input type="number" name="mastery_high" value="${s.mastery_high}" min="1" max="100"></div>
    <div class="field"><label>«قريب من الإتقان» من نسبة</label><input type="number" name="mastery_mid" value="${s.mastery_mid}" min="0" max="99"><div class="hint">أقل من ذلك: «يحتاج إلى دعم».</div></div>
    <div class="field"><label>أقل عدد أسئلة للحكم على مهارة</label><input type="number" name="min_skill_questions" value="${s.min_skill_questions}" min="1"><div class="hint">أقل من ذلك يظهر «بيانات غير كافية».</div></div>
    <div class="field"><label>أقل عدد مشاركين لعرض المقارنة</label><input type="number" name="min_comparison" value="${s.min_comparison}" min="2"></div></div>
    <label class="check"><input type="checkbox" name="leaderboard_enabled" ${s.leaderboard_enabled ? 'checked' : ''}> إظهار لوحة الترتيب للطلاب (بأسماء العرض)</label>
    <div style="margin-top:12px"><button class="btn green">حفظ</button></div></form></div>`);
  $('#f', el).onsubmit = async (e) => { e.preventDefault(); try { await put('/api/admin/settings', form(e.target)); toast('حُفظت الإعدادات.'); } catch (er) { $('#err').innerHTML = errorBox(er); } };
}

// ================= السجل =================
const ACT = { admin_setup: 'إعداد حساب المدير', page_deleted: 'حذف صفحة', seed: 'إدخال المحتوى الأولي', student_activated: 'تفعيل طالب', parent_activated: 'تفعيل ولي أمر', pin_reset: 'إعادة تعيين رمز طالب', invite_issued: 'إصدار رمز تفعيل', reset_issued: 'إصدار رمز إعادة تعيين', account_locked: 'قفل مؤقت للحساب', account_enabled: 'تفعيل حساب', account_disabled: 'تعطيل حساب', student_created: 'إضافة طالب', student_updated: 'تعديل طالب', parent_created: 'إضافة ولي أمر', parent_links_updated: 'تعديل ربط الأبناء', course_created: 'إضافة مقرر', course_updated: 'تعديل مقرر', course_published: 'نشر مقرر', course_draft: 'إخفاء مقرر', course_archived: 'أرشفة مقرر', file_uploaded: 'رفع ملف', file_deleted: 'حذف ملف', pages_set: 'تحديد الصفحات', lesson_created: 'إضافة شرح', lesson_updated: 'تعديل شرح', lesson_published: 'نشر شرح', lesson_unpublished: 'إخفاء شرح', lesson_deleted: 'حذف شرح', question_created: 'إضافة سؤال', question_updated: 'تعديل سؤال', question_published: 'نشر سؤال', question_draft: 'إخفاء سؤال', question_retired: 'استبعاد سؤال', question_deleted: 'حذف سؤال', bulk_publish_reviewed: 'نشر جماعي بعد المراجعة', assessment_created: 'إضافة تقويم', assessment_updated: 'تعديل تقويم', assessment_published: 'نشر تقويم', assessment_closed: 'إغلاق تقويم', assessment_draft: 'إخفاء تقويم', grade_changed: 'تعديل درجة', attempt_reviewed: 'مراجعة محاولة', announcement_created: 'نشر تنبيه', settings_updated: 'تعديل الإعدادات', password_changed: 'تغيير كلمة المرور', backup_created: 'نسخة احتياطية', backup_downloaded: 'تنزيل نسخة احتياطية', ai_generated_draft: 'توليد مسودة آليًا', skill_created: 'إضافة مهارة' };
async function audit() {
  const list = await get('/api/admin/audit');
  render(`${tabs('audit')}<div class="card"><h2>سجل التعديلات المهمة</h2><div class="table-wrap"><table><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>الهدف</th><th>تفاصيل</th></tr>
    ${list.map(a => `<tr><td class="small">${fmtDate(a.at, true)}</td><td>${esc(a.user_name || 'النظام')}</td><td>${esc(ACT[a.action] || a.action)}</td><td class="small ltr">${esc(a.target || '')}</td><td class="small" style="max-width:360px;word-break:break-word">${esc(a.details || '')}</td></tr>`).join('')}</table></div></div>`);
}

// ================= النسخ الاحتياطي =================
async function backup() {
  const el = render(`${tabs('backup')}<div class="card"><h2>النسخ الاحتياطي</h2>
    <p class="small muted">تُحفظ البيانات في قاعدة بيانات Supabase. نزّل نسخة احتياطية كاملة بصيغة JSON بشكل دوري (أسبوعيًا مثلًا) واحفظها في مكان آمن. تشمل النسخة الحسابات (دون كلمات المرور) والمقررات والشرح والأسئلة والمحاولات والدرجات وسجل التعديلات. صور الصفحات تبقى في قاعدة البيانات ويمكن إعادة رفعها من ملف المقرر.</p>
    <button class="btn green" id="now">تنزيل نسخة احتياطية الآن</button><div id="msg" style="margin-top:10px"></div></div>`);
  $('#now', el).onclick = async () => {
    try {
      const data = await get('/api/admin/export');
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `abusalem-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      $('#msg').innerHTML = '<div class="success">نُزّلت النسخة الاحتياطية.</div>';
    } catch (e) { $('#msg').innerHTML = errorBox(e); }
  };
}
