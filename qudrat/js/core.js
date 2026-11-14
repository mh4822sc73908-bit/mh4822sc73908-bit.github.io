import { request as backendRequest } from './backend.js';
// أدوات مشتركة للواجهة
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const app = () => document.getElementById('app');

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const state = { user: null };

export async function api(method, url, body, opts = {}) {
  try { return await backendRequest(method, url, body); }
  catch (e) {
    if (e.status === 401 && !opts.allow401) { state.user = null; location.hash = '#/'; }
    if (e.detail) console.error(e.detail);
    throw e;
  }
}
export const get = (u, o) => api('GET', u, undefined, o);
export const post = (u, b) => api('POST', u, b ?? {});
export const put = (u, b) => api('PUT', u, b ?? {});
export const del = (u) => api('DELETE', u, {});

let toastTimer;
export function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

export function render(html) { const el = app(); el.innerHTML = html; el.focus({ preventScroll: true }); window.scrollTo(0, 0); return el; }
export function errorBox(e) { return `<div class="error">${esc(e.message || e)}</div>`; }

export function modal(html, { wide = false, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(back);
  const first = back.querySelector('input, select, textarea, button');
  first && first.focus();
  return { el: back.querySelector('.modal'), close };
}
export function confirmBox(message, { okText = 'تأكيد', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = modal(`<p>${esc(message)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>إلغاء</button><button class="btn ${danger ? 'danger' : 'green'}" id="cfm-ok">${esc(okText)}</button></div>`, { onClose: () => resolve(false) });
    m.el.querySelector('#cfm-ok').onclick = () => { resolve(true); m.close(); };
  });
}

// أرقام وتواريخ
export const normDigits = (s) => String(s ?? '').replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x0660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x06F0);
const asDate = (s) => { if (!s) return null; const d = new Date(String(s).includes('T') || String(s).length <= 10 ? s : String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? null : d; };
export function fmtDate(s, withTime = false) {
  const d = asDate(s); if (!d) return '—';
  const opts = { year: 'numeric', month: 'long', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) };
  try { return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', opts).format(d); } catch { return d.toLocaleDateString(); }
}
export const fmtScore = (n) => (n == null ? '—' : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 })}`);
export const DIFF = { 1: 'سهل', 2: 'متوسط', 3: 'صعب' };
export const LEVEL_BADGE = { mastered: 'green', near: 'amber', support: 'red', insufficient: 'gray' };

export function form(el) {
  const o = {};
  for (const i of $$('input, select, textarea', el)) {
    if (!i.name) continue;
    if (i.type === 'checkbox') { if (i.dataset.multi) { (o[i.name] ||= []); if (i.checked) o[i.name].push(i.value); } else o[i.name] = i.checked; }
    else if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; }
    else o[i.name] = i.value;
  }
  return o;
}

// رسوم بيانية بسيطة (SVG)
export function lineChart(points, { height = 220, max = 100, label = 'الدرجة' } = {}) {
  if (!points.length) return '<p class="muted">لا توجد بيانات بعد.</p>';
  const W = 480, H = height, pl = 40, pr = 16, pt = 16, pb = 40;
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = (i) => pl + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const y = (v) => pt + ih - (v / max) * ih;
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e6ebf2"/><text x="${pl - 8}" y="${y(v) + 4}" font-size="13" fill="#5d6b80" text-anchor="end">${v}</text>`).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="5" fill="#1f8a5b" stroke="#fff" stroke-width="2"><title>${esc(p.l)}: ${p.v}</title></circle><text x="${x(i)}" y="${y(p.v) - 10}" font-size="15" font-weight="700" fill="#14284b" text-anchor="middle">${p.v}</text><text x="${x(i)}" y="${H - 14}" font-size="13" fill="#5d6b80" text-anchor="middle">${esc(p.l)}</text>`).join('');
  return `<div class="chart" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 ${W} ${H}" direction="ltr">${grid}<path d="${path}" fill="none" stroke="#1f8a5b" stroke-width="3" stroke-linejoin="round"/>${dots}</svg></div>`;
}
export function barChart(rows) {
  if (!rows.length) return '<p class="muted">لا توجد بيانات بعد.</p>';
  const color = { mastered: '#1f8a5b', near: '#d69e2e', support: '#c0392b', insufficient: '#9aa5b5' };
  return `<div class="stack">${rows.map(r => `<div><div class="row between small"><span>${esc(r.name)}</span><span><b>${r.pct}%</b> <span class="muted">(${r.correct}/${r.n})</span></span></div>
    <div class="bar" title="${esc(r.label)}"><span style="width:${Math.max(2, r.pct)}%;background:${color[r.level] || '#1f8a5b'}"></span></div></div>`).join('')}</div>
    <div class="legend" style="margin-top:10px"><span><i style="background:#1f8a5b"></i>متقن</span><span><i style="background:#d69e2e"></i>قريب من الإتقان</span><span><i style="background:#c0392b"></i>يحتاج إلى دعم</span><span><i style="background:#9aa5b5"></i>بيانات غير كافية</span></div>`;
}
export function donut(parts) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  let acc = 0; const R = 60, C = 2 * Math.PI * R;
  const segs = parts.map(p => { const len = (p.v / total) * C; const s = `<circle r="${R}" cx="80" cy="80" fill="none" stroke="${p.c}" stroke-width="26" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 80 80)"/>`; acc += len; return s; }).join('');
  return `<div class="row" style="gap:18px"><svg viewBox="0 0 160 160" width="140" height="140" role="img" aria-label="توزيع الإجابات">${segs}</svg>
    <div class="stack small">${parts.map(p => `<div><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${p.c};margin-inline-end:6px"></i>${esc(p.l)}: <b>${p.v}</b></div>`).join('')}</div></div>`;
}

// pdf.js محلي: يُستخدم في لوحة المدير لتحويل صفحات PDF إلى صور
let pdfjsPromise;
export async function pdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('../vendor/pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.mjs', import.meta.url).href; return m; });
  return pdfjsPromise;
}
export async function pdfFromBlob(buf) { const lib = await pdfjs(); return lib.getDocument({ data: buf }).promise; }

// عرض صور صفحات المقرر (محمية: تُجلب من الخادم بعد التحقق من الصلاحية)
const imgCache = new Map();
export function openPage({ pages, page }) {
  const list = pages.filter(p => p.has_image !== false);
  let idx = Math.max(0, list.findIndex(p => p.file_page === page));
  const m = modal(`<div class="modal-head"><h3 id="pv-title"></h3><div class="row"><button class="btn ghost sm" id="pv-prev">السابقة</button><button class="btn ghost sm" id="pv-next">التالية</button><button class="btn sm" data-close>إغلاق</button></div></div><div class="pdfview" id="pv"></div>`, { wide: true });
  const draw = async () => {
    const p = list[idx];
    const box = m.el.querySelector('#pv');
    m.el.querySelector('#pv-prev').disabled = idx <= 0;
    m.el.querySelector('#pv-next').disabled = idx >= list.length - 1;
    if (!p) { m.el.querySelector('#pv-title').textContent = 'الصفحة الأصلية'; box.innerHTML = '<div class="note">لم يرفع مدير المنصة صورة هذه الصفحة بعد.</div>'; return; }
    m.el.querySelector('#pv-title').textContent = `صفحة الملف ${p.file_page}${p.printed_page ? ` — الرقم المطبوع ${p.printed_page}` : ''}`;
    box.innerHTML = '<p class="muted">جارٍ تحميل الصفحة…</p>';
    try {
      if (!imgCache.has(p.id)) imgCache.set(p.id, get(`/api/pages/${p.id}`));
      const r = await imgCache.get(p.id);
      box.innerHTML = `<img alt="صفحة الملف ${p.file_page}" src="data:${r.mime};base64,${r.data}">`;
    } catch (e) { imgCache.delete(p.id); box.innerHTML = `<div class="note">${esc(e.message)}</div>`; }
  };
  m.el.querySelector('#pv-prev').onclick = () => { if (idx > 0) { idx--; draw(); } };
  m.el.querySelector('#pv-next').onclick = () => { if (idx < list.length - 1) { idx++; draw(); } };
  draw();
}

export function countdown(dateStr) {
  if (!dateStr) return '';
  const target = new Date(dateStr + 'T08:00:00');
  const diff = target - Date.now();
  if (diff <= 0) return '<div class="info">حلّ موعد الاختبار أو مضى. حدّث موعد اختبارك القادم من بياناتك الدراسية.</div>';
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000);
  return `<div class="countdown"><div><b>${d}</b><span>يوم</span></div><div><b>${h}</b><span>ساعة</span></div></div>`;
}
