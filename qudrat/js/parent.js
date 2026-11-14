import { esc, get, render, fmtDate, fmtScore, lineChart, countdown } from './core.js';

export async function dashboard() {
  const d = await get('/api/parent/children');
  render(`<h1>أبنائي</h1>
  <p class="muted small">صلاحيتك للاطلاع فقط. تظهر هنا بيانات الأبناء الذين ربطهم مدير المنصة بحسابك.</p>
  ${d.children.length ? `<div class="grid g2">${d.children.map(c => {
    const s = c.student;
    return `<div class="card">
      <div class="row between"><h2>${esc(s.name)}</h2>${c.started ? '<span class="badge green">بدأ</span>' : '<span class="badge gray">لم يبدأ بعد</span>'}</div>
      <div class="kv"><div><span>الصف</span><b>${esc(s.grade || '—')}</b></div>
        <div><span>آخر درجة تقويم</span><b>${c.lastScore ? fmtScore(c.lastScore.score) + '/100' : '—'}</b></div>
        <div><span>آخر نشاط</span><b class="small">${c.activity ? `${esc(c.activity.text)}<br><span class="muted">${fmtDate(c.activity.at, true)}</span>` : '—'}</b></div>
        <div><span>الاختبار القادم</span><b>${s.next_test_date ? fmtDate(s.next_test_date) : 'لم يُحدد'}</b></div></div>
      ${s.next_test_date ? `<div style="margin-top:8px">${countdown(s.next_test_date)}</div>` : ''}
      <h3 style="margin-top:12px">المقررات المطلوبة</h3>
      ${c.courses.length ? c.courses.map(co => `<div style="margin-bottom:8px"><div class="row between small"><span>${esc(co.title)} <span class="muted">(${esc(co.pages_label || '')}${co.due_date ? ` · قبل ${fmtDate(co.due_date)}` : ''})</span></span><b>${co.progress.pct}%</b></div><div class="bar"><span style="width:${co.progress.pct}%"></span></div></div>`).join('') : '<p class="muted small">لا توجد مقررات منشورة.</p>'}
      <h3 style="margin-top:12px">تطور المستوى</h3>
      ${lineChart(c.scores.map((x, i) => ({ v: x.score, l: `م${i + 1}` })), { height: 170 })}
      ${c.scores.length ? `<div class="table-wrap"><table><tr><th>التقويم</th><th>الدرجة</th><th>التاريخ</th><th></th></tr>${c.scores.slice().reverse().map(x => `<tr><td>${esc(x.title)} (م${x.attempt_no})</td><td>${fmtScore(x.score)}</td><td>${fmtDate(x.submitted_at)}</td><td><a href="#/report/attempt/${x.id}">التقرير</a></td></tr>`).join('')}</table></div>` : ''}
      <div class="row" style="margin-top:12px"><a class="btn" href="#/report/student/${s.id}">التقرير التراكمي ونقاط القوة والضعف وخطة التحسين</a></div>
    </div>`;
  }).join('')}</div>` : '<div class="card"><p class="muted">لم يُربط بحسابك أي طالب بعد. تواصل مع مدير المنصة.</p></div>'}
  ${d.announcements.length ? `<div class="card"><h2>التنبيهات</h2>${d.announcements.map(a => `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b>${esc(a.title)}</b><div class="small">${esc(a.body || '')}</div><div class="small muted">${fmtDate(a.created_at, true)}</div></div>`).join('')}</div>` : ''}`);
}
