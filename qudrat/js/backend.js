// طبقة الاتصال بقاعدة البيانات (Supabase): كل طلب يمر عبر الدالة الآمنة api() في الخادم
import { attemptReport, cumulative, groupSkills, fmtDur } from './analysis.js';

const CFG = window.ABUSALEM_CONFIG || {};
const TOKEN_KEY = 'abusalem_session';
let memToken = null;
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || memToken; } catch { return memToken; } };
const setToken = (t) => { memToken = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* */ } };

export const configured = () => !!CFG.SUPABASE_URL && !/YOUR-PROJECT/.test(CFG.SUPABASE_URL) && !!CFG.SUPABASE_ANON_KEY && !/YOUR-ANON/.test(CFG.SUPABASE_ANON_KEY);

export async function rpc(action, args = {}) {
  if (!configured()) throw Object.assign(new Error('لم يُربط الموقع بقاعدة البيانات بعد (config.js).'), { status: 503 });
  let res;
  try {
    res = await fetch(`${CFG.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY, ...(CFG.SUPABASE_ANON_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}` } : {}) },
      body: JSON.stringify({ p_action: action, p_args: args, p_token: getToken() }),
    });
  } catch { throw Object.assign(new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.'), { network: true }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = Number(data.hint) || res.status;
    throw Object.assign(new Error(data.hint && /^\d+$/.test(data.hint) ? data.message : (data.message ? 'حدث خطأ في الخادم.' : 'حدث خطأ.')), { status: code, detail: data.message });
  }
  if (data && data.__error) throw Object.assign(new Error(data.__error.message), { status: Number(data.__error.code) });
  return data;
}

const AI_OFF = { enabled: false, requirement: 'التوليد بمساعدة الذكاء الاصطناعي غير متاح في هذا الإصدار المجاني؛ الإعداد اليدوي يعمل كاملًا.' };
const routes = [];
const on = (method, pattern, fn) => routes.push([method, new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>\\d+)') + '$'), fn]);

// ---- الدخول ----
on('GET', '/api/me', async () => { if (!getToken()) return { user: null }; try { return await rpc('u_me'); } catch (e) { if (e.status === 401) { setToken(null); return { user: null }; } throw e; } });
on('GET', '/api/public/students', () => rpc('pub_students'));
on('GET', '/api/public/setup', () => rpc('pub_setup_status'));
on('POST', '/api/public/setup', (p, b) => rpc('pub_setup_admin', b));
on('POST', '/api/auth/student-login', async (p, b) => { const r = await rpc('pub_student_login', b); setToken(r.token); return r; });
on('POST', '/api/auth/login', async (p, b) => { const r = await rpc('pub_login', b); setToken(r.token); return r; });
on('POST', '/api/auth/activate', (p, b) => rpc('pub_activate', b));
on('POST', '/api/auth/reset-pin', (p, b) => rpc('pub_reset_pin', b));
on('POST', '/api/auth/parent-activate', (p, b) => rpc('pub_parent_activate', b));
on('POST', '/api/auth/logout', async () => { try { await rpc('u_logout'); } catch { /* */ } setToken(null); return { ok: true }; });
on('POST', '/api/me/password', (p, b) => rpc('u_password', b));
on('POST', '/api/notifications/read', () => rpc('u_notif_read'));

// ---- الطالب ----
on('GET', '/api/student/dashboard', () => rpc('s_dashboard'));
on('PUT', '/api/student/profile', (p, b) => rpc('s_profile', b));
on('GET', '/api/courses/:id', (p) => rpc('x_course', { id: +p.id }));
on('GET', '/api/pages/:id', (p) => rpc('x_page_image', { page_id: +p.id }));
on('POST', '/api/lessons/:id/done', (p, b) => rpc('s_lesson_done', { id: +p.id, done: b.done !== false }));
on('GET', '/api/practice/:id/stats', (p) => rpc('s_practice_stats', { course_id: +p.id }));
on('GET', '/api/practice/:id', (p, b, q) => rpc('s_practice', { course_id: +p.id, mode: q.get('mode') || 'all', skill: q.get('skill') || '' }));
on('POST', '/api/practice/answer', (p, b) => rpc('s_practice_answer', b));
on('GET', '/api/student/assessments/:id', (p) => rpc('s_assessments', { course_id: +p.id }));
on('POST', '/api/assessments/:id/start', (p) => rpc('s_start', { id: +p.id }));
on('GET', '/api/attempts/:id', (p) => rpc('s_attempt', { id: +p.id }));
on('PUT', '/api/attempts/:id/answer', (p, b) => rpc('s_answer', { id: +p.id, ...b }));
on('POST', '/api/attempts/:id/seen', (p, b) => rpc('s_seen', { id: +p.id, ...b }));
on('POST', '/api/attempts/:id/submit', (p, b) => rpc('s_submit', { id: +p.id, ...b }));

// ---- التقارير ----
on('GET', '/api/reports/attempt/:id', async (p) => attemptReport(await rpc('x_attempt_report', { id: +p.id })));
on('GET', '/api/reports/student/:id', async (p) => cumulative(await rpc('x_student_report', { id: +p.id })));
on('GET', '/api/compare/:id', (p, b, q) => rpc('x_compare', { id: +p.id, student: q.get('student') || '' }));
on('GET', '/api/parent/children', () => rpc('p_children'));

// ---- المدير ----
on('GET', '/api/admin/overview', async () => {
  const [o, atts] = await Promise.all([rpc('a_overview'), rpc('a_all_attempts')]);
  return { ...o, groupSkills: groupSkills(atts, o.settings), ai: AI_OFF };
});
on('GET', '/api/admin/students', () => rpc('a_students'));
on('POST', '/api/admin/students', (p, b) => rpc('a_student_create', b));
on('PUT', '/api/admin/students/:id', (p, b) => rpc('a_student_update', { ...b, id: +p.id }));
on('POST', '/api/admin/students/:id/status', (p, b) => rpc('a_user_status', { ...b, id: +p.id }));
on('POST', '/api/admin/users/:id/invite', (p) => rpc('a_invite', { id: +p.id }));
on('GET', '/api/admin/parents', () => rpc('a_parents'));
on('POST', '/api/admin/parents', (p, b) => rpc('a_parent_create', b));
on('PUT', '/api/admin/parents/:id', (p, b) => rpc('a_parent_update', { ...b, id: +p.id }));
on('GET', '/api/admin/courses', () => rpc('a_courses'));
on('POST', '/api/admin/courses', (p, b) => rpc('a_course_save', b));
on('PUT', '/api/admin/courses/:id', (p, b) => rpc('a_course_save', { ...b, id: +p.id }));
on('POST', '/api/admin/courses/:id/status', (p, b) => rpc('a_course_status', { ...b, id: +p.id }));
on('POST', '/api/admin/courses/:id/files', (p, b) => rpc('a_file_add', { ...b, course_id: +p.id }));
on('POST', '/api/admin/pages', (p, b) => rpc('a_page_put', b));
on('PUT', '/api/admin/pages/:id', (p, b) => rpc('a_page_meta', { ...b, page_id: +p.id }));
on('DELETE', '/api/admin/pages/:id', (p) => rpc('a_page_delete', { page_id: +p.id }));
on('DELETE', '/api/admin/files/:id', (p) => rpc('a_file_delete', { id: +p.id }));
on('GET', '/api/admin/courses/:id/skills', (p) => rpc('a_skills', { course_id: +p.id }));
on('POST', '/api/admin/courses/:id/skills', (p, b) => rpc('a_skill_save', { ...b, course_id: +p.id }));
on('PUT', '/api/admin/skills/:id', (p, b) => rpc('a_skill_save', { ...b, id: +p.id }));
on('GET', '/api/admin/courses/:id/lessons', (p) => rpc('a_lessons', { course_id: +p.id }));
on('POST', '/api/admin/courses/:id/lessons', (p, b) => rpc('a_lesson_save', { ...b, course_id: +p.id }));
on('PUT', '/api/admin/lessons/:id', (p, b) => rpc('a_lesson_save', { ...b, id: +p.id }));
on('POST', '/api/admin/lessons/:id/status', (p, b) => rpc('a_lesson_status', { ...b, id: +p.id }));
on('DELETE', '/api/admin/lessons/:id', (p) => rpc('a_lesson_delete', { id: +p.id }));
on('GET', '/api/admin/courses/:id/questions', (p) => rpc('a_questions', { course_id: +p.id }));
on('POST', '/api/admin/courses/:id/questions', (p, b) => rpc('a_question_save', { ...b, course_id: +p.id }));
on('PUT', '/api/admin/questions/:id', (p, b) => rpc('a_question_save', { ...b, id: +p.id }));
on('POST', '/api/admin/questions/:id/status', (p, b) => rpc('a_question_status', { ...b, id: +p.id }));
on('DELETE', '/api/admin/questions/:id', (p) => rpc('a_question_delete', { id: +p.id }));
on('POST', '/api/admin/courses/:id/publish-reviewed', (p, b) => rpc('a_publish_reviewed', { ...b, course_id: +p.id }));
on('GET', '/api/admin/courses/:id/coverage', (p) => rpc('a_coverage', { course_id: +p.id }));
on('GET', '/api/admin/assessments', () => rpc('a_assessments'));
on('POST', '/api/admin/assessments', (p, b) => rpc('a_assessment_save', b));
on('PUT', '/api/admin/assessments/:id', (p, b) => rpc('a_assessment_save', { ...b, id: +p.id }));
on('POST', '/api/admin/assessments/:id/status', (p, b) => rpc('a_assessment_status', { ...b, id: +p.id }));
on('GET', '/api/admin/results', async (p, b, q) => (await rpc('a_results', { assessment: q.get('assessment') || '' })).map(r => ({ ...r, duration: fmtDur(r.duration_sec) })));
on('POST', '/api/admin/attempts/:id/resolve', (p, b) => rpc('a_attempt_resolve', { ...b, id: +p.id }));
on('GET', '/api/admin/announcements', () => rpc('a_announcements'));
on('POST', '/api/admin/announcements', (p, b) => rpc('a_announcement_create', b));
on('DELETE', '/api/admin/announcements/:id', (p) => rpc('a_announcement_delete', { id: +p.id }));
on('GET', '/api/admin/settings', () => rpc('a_settings'));
on('PUT', '/api/admin/settings', (p, b) => rpc('a_settings_put', b));
on('GET', '/api/admin/audit', async () => (await rpc('a_audit')).map(a => ({ ...a, details: a.details ? JSON.stringify(a.details) : '' })));
on('GET', '/api/admin/export', () => rpc('a_export'));

export async function request(method, url, body) {
  const [path, qs] = url.split('?');
  const q = new URLSearchParams(qs || '');
  for (const [m, re, fn] of routes) {
    if (m !== method) continue;
    const match = path.match(re);
    if (match) return fn(match.groups || {}, body || {}, q);
  }
  throw Object.assign(new Error('غير موجود.'), { status: 404 });
}
