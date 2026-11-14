import { $, esc, state, get, post, render, errorBox, toast, normDigits, form } from './core.js';
import * as S from './student.js';
import * as R from './report.js';
import * as P from './parent.js';
import * as A from './admin.js';
import { configured } from './backend.js';

const GRADES = ['ثاني ثانوي', 'ثالث ثانوي'];
export const gradeOptions = (cur) => GRADES.map(g => `<option ${g === cur ? 'selected' : ''}>${g}</option>`).join('');

async function loadMe() { state.user = (await get('/api/me', { allow401: true })).user; }

function nav() {
  const u = state.user;
  const n = $('#nav');
  if (!u) { n.innerHTML = `<a href="#/">الرئيسية</a>`; return; }
  const links = u.role === 'student'
    ? `<a href="#/s">صفحتي</a><a href="#/s/path">مسار القدرات</a><a href="#/report/student/${u.id}">تقريري</a>`
    : u.role === 'parent' ? `<a href="#/p">أبنائي</a><a href="#/account">حسابي</a>` : `<a href="#/a">لوحة الإدارة</a><a href="#/account">حسابي</a>`;
  n.innerHTML = `<span class="who">${esc(u.name)}</span>${links}<button id="logout">تسجيل الخروج</button>`;
  $('#logout').onclick = async () => { await post('/api/auth/logout'); state.user = null; location.hash = '#/'; toast('تم تسجيل الخروج بأمان.'); };
}

async function home() {
  if (state.user) return go(roleHome());
  if (!configured()) return render(`<div class="card"><h2>المنصة لم تُربط بقاعدة البيانات بعد</h2><p>أضف رابط مشروع Supabase والمفتاح العام في ملف <b class="ltr">config.js</b>.</p></div>`);
  let needsSetup = false; try { needsSetup = (await get('/api/public/setup')).needs_setup; } catch { /* */ }
  render(`${needsSetup ? '<div class="note">لم يُنشأ حساب المدير بعد. <a href="#/setup">إعداد المدير لأول مرة</a></div>' : ''}<section class="hero">
    <img src="logo.jpg" alt="شعار منصة ابوسالم في القدرات">
    <h1>منصة ابوسالم في القدرات</h1>
    <p class="tag">«نتعلّم معًا… ونصل إلى هدفنا»</p>
    <p class="muted">منصة عائلية خاصة لمتابعة الاستعداد لاختبار القدرات: شرح، وتدريب، وتقويم.</p>
  </section>
  <div class="entries">
    <a class="entry" href="#/student/login"><span class="ic">🎓</span><strong>دخول الطالب</strong><span class="muted small">باسمك وكلمة مرورك ذات الأربعة أرقام</span></a>
    <a class="entry" href="#/parent/login"><span class="ic">👨‍👧</span><strong>دخول ولي الأمر</strong><span class="muted small">متابعة نتائج الأبناء المرتبطين بحسابك</span></a>
    <a class="entry" href="#/admin/login"><span class="ic">🛠️</span><strong>دخول مدير المنصة</strong><span class="muted small">إدارة الطلاب والمقررات والتقويم</span></a>
  </div>`);
}
const roleHome = () => ({ student: '#/s', parent: '#/p', admin: '#/a' }[state.user?.role] || '#/');
const go = (h) => { if (location.hash !== h) location.hash = h; else route(); };

async function studentOptions(selected) {
  const list = await get('/api/public/students');
  return `<option value="">— اختر اسمك —</option>` + list.map(s => `<option value="${s.id}" ${String(s.id) === String(selected) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}

async function studentLogin(params) {
  const el = render(`<div class="auth card">
    <h1>دخول الطالب</h1>
    ${params.get('ok') ? `<div class="success">${esc(params.get('ok'))}</div>` : ''}
    <div id="err"></div>
    <form id="f" autocomplete="off">
      <div class="field"><label for="sid">الاسم</label><select id="sid" name="student_id" required>${await studentOptions(params.get('sid'))}</select></div>
      <div class="field"><label for="pin">كلمة المرور (أربعة أرقام)</label><input id="pin" name="pin" class="pin" inputmode="numeric" maxlength="4" autocomplete="current-password" required></div>
      <button class="btn green block">دخول</button>
    </form>
    <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
    <div class="row between"><a href="#/student/register" class="btn ghost">التسجيل لأول مرة</a><a href="#/student/reset" class="small">لدي رمز إعادة تعيين</a></div>
    <p class="hint">نسيت كلمة المرور؟ اطلب من مدير المنصة رمز إعادة تعيين.</p>
  </div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const b = form(e.target);
    if (!b.student_id) return ($('#err').innerHTML = errorBox('اختر اسمك من القائمة.'));
    b.pin = normDigits(b.pin);
    try { await post('/api/auth/student-login', b); await loadMe(); go('#/s'); }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

async function studentRegister() {
  const el = render(`<div class="auth card" style="max-width:560px">
    <h1>التسجيل لأول مرة</h1>
    <p class="muted small">اختر اسمك، وأدخل رمز الدعوة الذي أعطاك إياه مدير المنصة، ثم أكمل بياناتك وأنشئ كلمة مرور من أربعة أرقام.</p>
    <div id="err"></div>
    <form id="f" autocomplete="off">
      <div class="field"><label for="sid">الاسم</label><select id="sid" name="student_id" required>${await studentOptions()}</select><div class="hint">سيكون اسمك هو اسم المستخدم.</div></div>
      <div class="field"><label for="code">رمز الدعوة</label><input id="code" name="invite_code" placeholder="مثال: AB7K-9QXP" required class="ltr" style="display:block"></div>
      <div class="field"><label for="grade">الصف الدراسي</label><select id="grade" name="grade" required><option value="">— اختر —</option>${gradeOptions()}</select></div>
      <div class="grid g2" style="gap:12px">
        <div class="field"><label for="pt">عدد الاختبارات الورقية السابقة</label><input id="pt" name="paper_tests" type="number" min="0" step="1" value="0" inputmode="numeric" required></div>
        <div class="field"><label for="ct">عدد الاختبارات المحوسبة السابقة</label><input id="ct" name="computer_tests" type="number" min="0" step="1" value="0" inputmode="numeric" required></div>
      </div>
      <div class="field"><label for="nd">تاريخ الاختبار القادم</label><input id="nd" name="next_test_date" type="date"><label class="check" style="margin-top:6px"><input type="checkbox" id="nd-none"> لم يُحدد بعد</label></div>
      <div class="field"><label for="cc">الدورة المسجل فيها حاليًا واسم المركز</label><input id="cc" name="course_center" placeholder="اكتب «غير مسجل» إن لم تكن مسجلًا"></div>
      <div class="grid g2" style="gap:12px">
        <div class="field"><label for="pin">كلمة المرور (4 أرقام)</label><input id="pin" name="pin" class="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div>
        <div class="field"><label for="pin2">تأكيد كلمة المرور</label><input id="pin2" name="pin2" class="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div>
      </div>
      <button class="btn green block">حفظ وتفعيل الحساب</button>
    </form>
    <p class="center small" style="margin-top:12px"><a href="#/student/login">لدي حساب مفعّل — تسجيل الدخول</a></p>
  </div>`);
  const nd = $('#nd'), none = $('#nd-none');
  none.onchange = () => { nd.disabled = none.checked; if (none.checked) nd.value = ''; };
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const b = form(e.target);
    if (!b.student_id) return ($('#err').innerHTML = errorBox('اختر اسمك من القائمة.'));
    if (!none.checked && !b.next_test_date) return ($('#err').innerHTML = errorBox('أدخل تاريخ الاختبار القادم أو اختر «لم يُحدد بعد».'));
    b.pin = normDigits(b.pin); b.pin2 = normDigits(b.pin2);
    b.paper_tests = normDigits(b.paper_tests); b.computer_tests = normDigits(b.computer_tests);
    if (!/^\d{4}$/.test(b.pin)) return ($('#err').innerHTML = errorBox('كلمة المرور يجب أن تكون أربعة أرقام فقط.'));
    if (b.pin !== b.pin2) return ($('#err').innerHTML = errorBox('تأكيد كلمة المرور لا يطابق.'));
    if (none.checked) b.next_test_date = null;
    try {
      const r = await post('/api/auth/activate', b);
      location.hash = `#/student/login?ok=${encodeURIComponent(r.message)}&sid=${b.student_id}`;
    } catch (er) { $('#err').innerHTML = errorBox(er); window.scrollTo(0, 0); }
  };
}

async function studentReset() {
  const el = render(`<div class="auth card">
    <h1>إعادة تعيين كلمة المرور</h1>
    <p class="muted small">استخدم رمز إعادة التعيين الذي أعطاك إياه مدير المنصة.</p>
    <div id="err"></div>
    <form id="f" autocomplete="off">
      <div class="field"><label for="sid">الاسم</label><select id="sid" name="student_id" required>${await studentOptions()}</select></div>
      <div class="field"><label for="code">رمز إعادة التعيين</label><input id="code" name="code" required class="ltr" style="display:block"></div>
      <div class="grid g2" style="gap:12px">
        <div class="field"><label for="pin">كلمة المرور الجديدة</label><input id="pin" name="pin" class="pin" inputmode="numeric" maxlength="4" required></div>
        <div class="field"><label for="pin2">تأكيدها</label><input id="pin2" name="pin2" class="pin" inputmode="numeric" maxlength="4" required></div>
      </div>
      <button class="btn green block">حفظ</button>
    </form>
  </div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    const b = form(e.target); b.pin = normDigits(b.pin); b.pin2 = normDigits(b.pin2);
    try { const r = await post('/api/auth/reset-pin', b); location.hash = `#/student/login?ok=${encodeURIComponent(r.message)}&sid=${b.student_id}`; }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

function staffLogin(role) {
  const title = role === 'admin' ? 'دخول مدير المنصة' : 'دخول ولي الأمر';
  const el = render(`<div class="auth card">
    <h1>${title}</h1>
    <div id="err"></div>
    <form id="f">
      <div class="field"><label for="u">اسم المستخدم</label><input id="u" name="username" autocomplete="username" class="ltr" style="display:block" required></div>
      <div class="field"><label for="p">كلمة المرور</label><input id="p" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn green block">دخول</button>
    </form>
    ${role === 'parent' ? `<p class="center small" style="margin-top:12px"><a href="#/parent/activate">تفعيل حساب ولي الأمر لأول مرة</a></p><p class="hint center">يُنشئ مدير المنصة حساب ولي الأمر ويربطه بالأبناء.</p>` : ''}
  </div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    try { await post('/api/auth/login', { ...form(e.target), expect: role }); await loadMe(); go(roleHome()); }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

function parentActivate() {
  const el = render(`<div class="auth card">
    <h1>تفعيل حساب ولي الأمر</h1>
    <div id="err"></div>
    <form id="f" autocomplete="off">
      <div class="field"><label>اسم المستخدم</label><input name="username" class="ltr" style="display:block" required></div>
      <div class="field"><label>رمز التفعيل</label><input name="code" class="ltr" style="display:block" required></div>
      <div class="field"><label>كلمة المرور الجديدة</label><input name="password" type="password" autocomplete="new-password" required><div class="hint">8 خانات على الأقل تجمع بين أحرف وأرقام.</div></div>
      <div class="field"><label>تأكيد كلمة المرور</label><input name="password2" type="password" autocomplete="new-password" required></div>
      <button class="btn green block">تفعيل</button>
    </form></div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await post('/api/auth/parent-activate', form(e.target)); render(`<div class="auth card"><div class="success">${esc(r.message)}</div><a class="btn green block" href="#/parent/login">تسجيل الدخول</a></div>`); }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

function setup() {
  const el = render(`<div class="auth card"><h1>إعداد مدير المنصة لأول مرة</h1>
    <p class="muted small">أدخل رمز الإعداد الذي حصلت عليه مع ملف قاعدة البيانات، ثم اختر اسم مستخدم وكلمة مرور قوية للمدير.</p><div id="err"></div>
    <form id="f" autocomplete="off"><div class="field"><label>رمز الإعداد</label><input name="code" class="ltr" style="display:block" required></div>
    <div class="field"><label>اسم المستخدم (بالإنجليزية)</label><input name="username" class="ltr" style="display:block" value="admin" required></div>
    <div class="field"><label>كلمة المرور</label><input name="password" type="password" autocomplete="new-password" required><div class="hint">8 خانات على الأقل تجمع بين أحرف وأرقام.</div></div>
    <div class="field"><label>تأكيد كلمة المرور</label><input name="password2" type="password" autocomplete="new-password" required></div>
    <button class="btn green block">إنشاء حساب المدير</button></form></div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    try { await post('/api/public/setup', form(e.target)); render(`<div class="auth card"><div class="success">تم إنشاء حساب المدير.</div><a class="btn green block" href="#/admin/login">دخول المدير</a></div>`); }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

function account() {
  const el = render(`<div class="auth card"><h1>تغيير كلمة المرور</h1>
    ${state.user.must_change ? '<div class="note">يُرجى تغيير كلمة المرور المؤقتة.</div>' : ''}
    <div id="err"></div>
    <form id="f"><div class="field"><label>كلمة المرور الحالية</label><input type="password" name="current" required></div>
    <div class="field"><label>الجديدة</label><input type="password" name="password" autocomplete="new-password" required><div class="hint">8 خانات على الأقل تجمع بين أحرف وأرقام.</div></div>
    <div class="field"><label>تأكيد الجديدة</label><input type="password" name="password2" required></div>
    <button class="btn green block">حفظ</button></form></div>`);
  $('#f', el).onsubmit = async (e) => {
    e.preventDefault();
    try { await post('/api/me/password', form(e.target)); await loadMe(); toast('تم تغيير كلمة المرور.'); go(roleHome()); }
    catch (er) { $('#err').innerHTML = errorBox(er); }
  };
}

// ======== الموجّه ========
const routes = [
  [/^#?\/?$/, home],
  [/^#\/student\/login$/, (m, q) => studentLogin(q)],
  [/^#\/student\/register$/, studentRegister],
  [/^#\/student\/reset$/, studentReset],
  [/^#\/parent\/login$/, () => staffLogin('parent')],
  [/^#\/parent\/activate$/, parentActivate],
  [/^#\/admin\/login$/, () => staffLogin('admin')],
  [/^#\/setup$/, setup],
  [/^#\/account$/, account, ['parent', 'admin']],
  [/^#\/s$/, S.dashboard, ['student']],
  [/^#\/s\/profile$/, S.profile, ['student']],
  [/^#\/s\/path$/, S.pathView, ['student']],
  [/^#\/s\/course\/(\d+)$/, (m) => S.course(+m[1]), ['student']],
  [/^#\/s\/course\/(\d+)\/learn(?:\/(\d+))?$/, (m) => S.learn(+m[1], m[2] ? +m[2] : null), ['student']],
  [/^#\/s\/course\/(\d+)\/practice$/, (m, q) => S.practice(+m[1], q), ['student']],
  [/^#\/s\/course\/(\d+)\/assess$/, (m) => S.assessList(+m[1]), ['student']],
  [/^#\/s\/attempt\/(\d+)$/, (m) => S.takeAttempt(+m[1]), ['student']],
  [/^#\/report\/attempt\/(\d+)$/, (m) => R.attemptReport(+m[1]), ['student', 'parent', 'admin']],
  [/^#\/report\/student\/(\d+)$/, (m) => R.studentReport(+m[1]), ['student', 'parent', 'admin']],
  [/^#\/p$/, P.dashboard, ['parent']],
  [/^#\/a(?:\/([a-z]+))?(?:\/(\d+))?(?:\/([a-z]+))?$/, (m, q) => A.view(m[1] || 'overview', m[2] ? +m[2] : null, m[3] || null, q), ['admin']],
];

let leaveGuard = null;
export function setLeaveGuard(fn) { leaveGuard = fn; }

async function route() {
  if (leaveGuard) { const g = leaveGuard; leaveGuard = null; g(); }
  const [path, qs] = location.hash.split('?');
  const q = new URLSearchParams(qs || '');
  nav();
  for (const [re, fn, roles] of routes) {
    const m = path.match(re);
    if (!m) continue;
    if (roles) {
      if (!state.user) { return go(roles.includes('admin') && roles.length === 1 ? '#/admin/login' : roles.includes('parent') && roles.length === 1 ? '#/parent/login' : roles[0] === 'student' ? '#/student/login' : '#/'); }
      if (!roles.includes(state.user.role)) return go(roleHome());
    }
    if (state.user && state.user.must_change && path !== '#/account') return go('#/account');
    try { await fn(m, q); } catch (e) { render(`<div class="card">${errorBox(e)}<a class="btn ghost" href="${roleHome()}">العودة</a></div>`); }
    return;
  }
  render(`<div class="card"><h2>الصفحة غير موجودة</h2><a class="btn" href="#/">الرئيسية</a></div>`);
}
export { route, go };

window.addEventListener('hashchange', route);
loadMe().then(route).catch(() => route());
