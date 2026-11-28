/* التقرير الأسبوعي الموحد لمتابعة تشغيل المدارس المركزية والبث للمدارس المستقبلة
   نموذج تفاعلي لمدير المدرسة والوكيل: تعبئة ← معاينة بصفحات A4 على ترويسة الوزارة ← طباعة / حفظ PDF.
   المسودات تُحفظ في هذا المتصفح (localStorage)، مع تصدير/استيراد نسخة احتياطية. */
window.WEEKLY = (function () {
  'use strict';
  var KEY = 'mk-weekly-v1', D, esc, toast, root;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var AR = function (v) { return String(v).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); };
  var WEEKS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر'];
  var GR = { 'الرابع': 4, 'الخامس': 5, 'السادس': 6 };

  /* ---------- storage ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

  function hijriToday() {
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()), o = {};
      p.forEach(function (x) { o[x.type] = x.value; });
      return o.year + '/' + o.month + '/' + o.day;
    } catch (e) { return ''; }
  }
  function plannedFor(a) { /* حصص الأسبوع المخططة للمدرسة حسب صفوفها من الجدول */
    if (!window.TT) return '';
    var n = 0, T = TT.T;
    Object.keys(GR).forEach(function (g) {
      if (a.grades.indexOf(g) < 0) return;
      var G = T.grades[GR[g]]; if (!G) return;
      G.days.forEach(function (d) { d.forEach(function (c) { if (c) n++; }); });
    });
    return n || '';
  }
  function specialties() {
    var m = {}, order = [];
    D.teachers.forEach(function (t) { var s = t.subject; if (!m[s]) { m[s] = 0; order.push(s); } m[s]++; });
    return order.map(function (s) { return s + ' (' + m[s] + ')'; }).join('، ');
  }
  function blank() {
    var annexed = D.annexed || [];
    return {
      id: 'r' + Date.now(), saved: null,
      ref: '', hdate: hijriToday(), attach: '',
      school: D.school.name, gender: 'بنين', supervisor: '',
      week: '', from: '', to: '', prep: hijriToday(),
      students: annexed.reduce(function (a, x) { return a + (+x.students || 0); }, 0), absent: 0,
      adminCount: (D.adminStaff || []).length - 1 > 0 ? (D.adminStaff || []).length - 1 : 0, adminAbsent: 0,
      teachCount: D.teachers.length + 1, teachAbsent: 0,
      specs: specialties(),
      visit: { field: false, remote: true },
      ind: annexed.map(function (a) { return { school: a.name, sector: 'حائل', total: a.students, benef: a.students, planned: plannedFor(a), done: '' }; }),
      status: '',
      fu: annexed.map(function (a) { return { school: a.name + ' / ' + a.students + ' طلاب', subj: '', flow: '', qual: '', notes: '' }; }),
      q: { sound: '', image: '', cont: '', benefit: '' },
      ch: [{ c: '', a: '', who: '', st: '' }, { c: '', a: '', who: '', st: '' }, { c: '', a: '', who: '', st: '' }],
      summary: '', achieved: '', priority: '',
      supName: '', prinName: 'أ. ' + D.school.principal
    };
  }

  /* ---------- form ---------- */
  var R; /* current report */
  function inp(path, ph, cls, type) { return '<input class="input ' + (cls || '') + '" data-k="' + path + '" ' + (type ? 'type="' + type + '" inputmode="numeric"' : '') + ' placeholder="' + esc(ph || '') + '" value="' + esc(get(path)) + '">'; }
  function area(path, ph, rows) { return '<textarea class="input" data-k="' + path + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph || '') + '">' + esc(get(path)) + '</textarea>'; }
  function radios(path, opts) {
    return '<div class="wk-radios">' + opts.map(function (o) { return '<label class="wk-chk"><input type="radio" name="' + path + '" data-k="' + path + '" value="' + esc(o) + '"' + (get(path) === o ? ' checked' : '') + '> ' + esc(o) + '</label>'; }).join('') + '</div>';
  }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? '' : o[k]; }, R); }
  function set(path, v) { var ks = path.split('.'), o = R; for (var i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
  function pct(r) { var p = +r.planned, d = +r.done; return p > 0 && r.done !== '' ? Math.round(d / p * 1000) / 10 : ''; }

  function form() {
    var ws = '<option value="">— اختر —</option>' + WEEKS.map(function (w, i) { return '<option value="' + (i + 1) + '"' + (+R.week === i + 1 ? ' selected' : '') + '>الأسبوع ' + w + '</option>'; }).join('');
    return '' +
      sec('ترويسة الخطاب', '<div class="grid g3 wk-g">' + fld('الرقم', inp('ref', 'رقم الخطاب')) + fld('التاريخ (هجري)', inp('hdate', '1448/06/18')) + fld('المرفقات', inp('attach', 'مثال: لا يوجد')) + '</div>') +
      sec('بيانات التقرير',
        '<div class="grid g3 wk-g">' + fld('المدرسة المركزية', inp('school')) + fld('بنين / بنات', '<select class="input" data-k="gender"><option' + (R.gender === 'بنين' ? ' selected' : '') + '>بنين</option><option' + (R.gender === 'بنات' ? ' selected' : '') + '>بنات</option></select>') + fld('اسم المشرف أو المشرفة', inp('supervisor', 'اسم مشرف الإدارة المدرسية')) + '</div>' +
        '<div class="grid g4 wk-g">' + fld('الأسبوع', '<select class="input" data-k="week">' + ws + '</select>') + fld('فترة التقرير: من', inp('from', '1448/06/12')) + fld('إلى', inp('to', '1448/06/16')) + fld('تاريخ الإعداد', inp('prep', '1448/06/18')) + '</div>' +
        '<div class="grid g3 wk-g">' + fld('عدد الطلاب الإجمالي', inp('students', '', '', 'number')) + fld('عدد الهيئة الإدارية', inp('adminCount', '', '', 'number')) + fld('عدد غياب الهيئة الإدارية', inp('adminAbsent', '', '', 'number')) +
        fld('عدد الغياب الإجمالي (الطلاب)', inp('absent', '', '', 'number')) + fld('عدد الهيئة التعليمية مع مدير المدرسة', inp('teachCount', '', '', 'number')) + fld('عدد غياب الهيئة التعليمية', inp('teachAbsent', '', '', 'number')) + '</div>' +
        fld('تخصصات المعلمين في المدرسة وعدد معلمي كل تخصص', area('specs', '', 2)) +
        fld('نوع الزيارة', '<div class="wk-radios"><label class="wk-chk"><input type="checkbox" data-k="visit.field"' + (R.visit.field ? ' checked' : '') + '> زيارة ميدانية</label><label class="wk-chk"><input type="checkbox" data-k="visit.remote"' + (R.visit.remote ? ' checked' : '') + '> متابعة عن بُعد</label></div>')) +
      sec('مؤشرات التشغيل', '<div class="table-wrap"><table class="wk-t"><thead><tr><th>المدرسة المستقبلة</th><th>القطاع</th><th>إجمالي الطلاب</th><th>الطلاب المستفيدون</th><th>الحصص المخططة</th><th>الحصص المنفذة</th><th>نسبة التنفيذ</th><th></th></tr></thead><tbody>' +
        R.ind.map(function (r, i) { var b = 'ind.' + i + '.'; return '<tr><td>' + inp(b + 'school') + '</td><td>' + inp(b + 'sector') + '</td><td>' + inp(b + 'total', '', 'num', 'number') + '</td><td>' + inp(b + 'benef', '', 'num', 'number') + '</td><td>' + inp(b + 'planned', '', 'num', 'number') + '</td><td>' + inp(b + 'done', '', 'num', 'number') + '</td><td class="wk-pct" data-pct="' + i + '">' + (pct(r) === '' ? '—' : pct(r) + '٪') + '</td><td>' + delBtn('ind', i) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' + addBtn('ind', 'إضافة مدرسة') +
        '<p class="muted wk-note">نسبة التنفيذ = الحصص المنفذة ÷ الحصص المخططة × ١٠٠ (تُحسب تلقائيًا). الحصص المخططة معبأة مسبقًا من جدول الحصص الأسبوعي لصفوف كل مدرسة.</p>' +
        fld('حالة التشغيل', radios('status', ['مستقر', 'مع ملاحظات', 'يحتاج تدخلًا عاجلًا']))) +
      sec('متابعة المدارس المستقبلة', '<p class="muted wk-note">تُكرر الصفوف بحسب عدد المدارس، وتُذكر أسباب الحصص غير المنفذة في خانة الملاحظات.</p><div class="wk-rows">' +
        R.fu.map(function (r, i) { var b = 'fu.' + i + '.'; return '<div class="wk-row"><div class="grid g2 wk-g">' + fld('المدرسة المستقبلة / وعدد الطلاب', inp(b + 'school')) + fld('المادة / والمعلم', inp(b + 'subj', 'مثال: المهارات الرقمية / أ. محمد هليل الشمري')) + '</div>' +
          '<div class="grid g2 wk-g">' + fld('البث', radios(b + 'flow', ['مستمر', 'متقطع', 'متوقف'])) + fld('جودة البث', radios(b + 'qual', ['جيد', 'متوسط', 'ضعيف'])) + '</div>' + fld('الملاحظات', area(b + 'notes', 'أسباب الحصص غير المنفذة وأي ملاحظة', 2)) + '<div style="text-align:left">' + delBtn('fu', i) + '</div></div>'; }).join('') +
        '</div>' + addBtn('fu', 'إضافة صف متابعة')) +
      sec('التحقق من جودة البث في المدارس المستقبلة', '<div class="grid g2 wk-g">' + fld('الصوت', radios('q.sound', ['واضح', 'يحتاج معالجة'])) + fld('الصورة', radios('q.image', ['واضحة', 'تحتاج معالجة'])) + fld('الاستمرارية', radios('q.cont', ['منتظمة', 'متقطعة'])) + fld('استفادة الطلاب', radios('q.benefit', ['جيدة', 'متوسطة', 'ضعيفة'])) + '</div>') +
      sec('التحديات والإجراءات', '<div class="wk-rows">' + R.ch.map(function (r, i) { var b = 'ch.' + i + '.'; return '<div class="wk-row"><div class="grid g2 wk-g">' + fld('التحدي وأثره على الحصص', area(b + 'c', '', 2)) + fld('الإجراء المنفذ فعليًا', area(b + 'a', '', 2)) + '</div><div class="grid g2 wk-g">' + fld('المسؤول / والموعد', inp(b + 'who')) + fld('الحالة', radios(b + 'st', ['مغلق', 'جارٍ', 'متعثر'])) + '</div><div style="text-align:left">' + delBtn('ch', i) + '</div></div>'; }).join('') + '</div>' + addBtn('ch', 'إضافة تحدٍّ') +
        '<p class="muted wk-note">يُعد التحدي مغلقًا بعد تنفيذ الإجراء والتحقق من أثره في المدرسة المستقبلة.</p>') +
      sec('الخلاصة والتوصيات', fld('الخلاصة والتوصيات', area('summary', '', 4)) + fld('أبرز ما تحقق', area('achieved', '', 3)) + fld('أولوية المتابعة للأسبوع القادم', area('priority', '', 3)) +
        '<div class="grid g2 wk-g">' + fld('اسم مشرف/ة الإدارة المدرسية', inp('supName')) + fld('اسم مدير/ة المدرسة المركزية', inp('prinName')) + '</div>');
  }
  function sec(t, body) { return '<section class="card wk-sec"><h3>' + t + '</h3>' + body + '</section>'; }
  function fld(l, c) { return '<div class="form-row"><label>' + l + '</label>' + c + '</div>'; }
  function addBtn(list, t) { return '<button type="button" class="btn ghost sm" data-add="' + list + '">＋ ' + t + '</button>'; }
  function delBtn(list, i) { return '<button type="button" class="btn danger sm" data-del="' + list + '" data-i="' + i + '" title="حذف">حذف</button>'; }

  /* ---------- printable pages ---------- */
  function box(on) { return on ? '☑' : '☐'; }
  function opt(v, opts) { return opts.map(function (o) { return box(v === o) + ' ' + o; }).join('  '); }
  function t(v) { return esc(v == null || v === '' ? '' : String(v)); }
  function multiline(v) { return t(v).replace(/\n/g, '<br>'); }
  function head(on) {
    return '<div class="lh-ref">' + t(R.ref) + '</div><div class="lh-date">' + (R.hdate ? t(R.hdate) + ' هـ' : '') + '</div><div class="lh-att">' + t(R.attach) + '</div>';
  }
  function page(inner, n, N) {
    return '<div class="wk-page"><img class="wk-bg" src="assets/img/letterhead.jpg" alt="">' + head() + '<div class="wk-in">' + inner + '</div><div class="wk-pn">الصفحة ' + n + ' من ' + N + '</div></div>';
  }
  function chunk(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o.length ? o : [[]]; }
  function pages() {
    var weekTxt = R.week ? 'الأسبوع ' + WEEKS[R.week - 1] : '';
    var p1 = '<h1 class="wk-title">التقرير الأسبوعي الموحد لمتابعة تشغيل المدارس المركزية والبث للمدارس المستقبلة</h1>' +
      '<h2 class="wk-h">بيانات التقرير</h2><table class="wk-pt"><thead><tr><th style="width:36%">عنصر التقرير</th><th>التفاصيل</th></tr></thead><tbody>' +
      '<tr><td>المدرسة المركزية</td><td>' + t(R.school) + '</td></tr>' +
      '<tr><td>بنين / بنات / اسم المشرف أو المشرفة</td><td>' + t(R.gender) + ' / ' + t(R.supervisor) + '</td></tr>' +
      '<tr><td>الأسبوع / فترة التقرير / تاريخ الإعداد</td><td>' + t(weekTxt) + ' &nbsp; من ' + t(R.from || '........') + ' إلى ' + t(R.to || '........') + ' &nbsp; تاريخ الإعداد ' + t(R.prep || '..../..../....') + '</td></tr>' +
      '<tr><td>عدد الطلاب الإجمالي / ' + t(R.students) + '<br>عدد الغياب الإجمالي / ' + t(R.absent) + '</td><td><div class="wk-two"><span>عدد الهيئة الإدارية / ' + t(R.adminCount) + '<br>عدد الهيئة التعليمية مع مدير/ة المدرسة / ' + t(R.teachCount) + '</span><span>عدد غياب الهيئة الإدارية / ' + t(R.adminAbsent) + '<br>عدد غياب الهيئة التعليمية / ' + t(R.teachAbsent) + '</span></div></td></tr>' +
      '<tr><td>تخصصات المعلمين/ات في المدرسة وعدد معلمي كل تخصص</td><td>' + t(R.specs) + '</td></tr>' +
      '<tr><td>نوع الزيارة</td><td>' + box(R.visit.field) + ' زيارة ميدانية &nbsp;&nbsp; ' + box(R.visit.remote) + ' متابعة عن بُعد</td></tr></tbody></table>' +
      '<h2 class="wk-h">مؤشرات التشغيل</h2><table class="wk-pt c"><thead><tr><th>المدرسة المستقبلة</th><th>القطاع</th><th>إجمالي الطلاب</th><th>الطلاب المستفيدون</th><th>الحصص المخططة</th><th>الحصص المنفذة</th><th>نسبة التنفيذ</th></tr></thead><tbody>' +
      R.ind.map(function (r) { var p = pct(r); return '<tr><td>' + t(r.school) + '</td><td>' + t(r.sector) + '</td><td>' + t(r.total) + '</td><td>' + t(r.benef) + '</td><td>' + t(r.planned) + '</td><td>' + t(r.done) + '</td><td>' + (p === '' ? '' : p + '٪') + '</td></tr>'; }).join('') +
      totalRow() + '</tbody></table><p class="wk-small">نسبة التنفيذ = الحصص المنفذة ÷ الحصص المخططة × ١٠٠</p>' +
      '<p class="wk-line">حالة التشغيل: ' + opt(R.status, ['مستقر', 'مع ملاحظات', 'يحتاج تدخلًا عاجلًا']) + '</p>' +
      '<h2 class="wk-h">متابعة المدارس المستقبلة</h2><p class="wk-small">تُكرر الصفوف بحسب عدد المدارس، وتُذكر أسباب الحصص غير المنفذة في خانة الملاحظات</p>';
    var fuRows = function (rows) {
      return '<table class="wk-pt"><thead><tr><th style="width:22%">المدرسة المستقبلة / وعدد الطلاب</th><th style="width:24%">المادة / والمعلم</th><th style="width:22%">البث وجودته</th><th>الملاحظات</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + t(r.school) + '</td><td>' + t(r.subj) + '</td><td class="wk-opts">' + opt(r.flow, ['مستمر', 'متقطع', 'متوقف']) + '<br>' + opt(r.qual, ['جيد', 'متوسط', 'ضعيف']) + '</td><td>' + multiline(r.notes) + '</td></tr>'; }).join('') + '</tbody></table>';
    };
    var quality = '<h2 class="wk-h">التحقق من جودة البث في المدارس المستقبلة</h2><p class="wk-line">الصوت: ' + opt(R.q.sound, ['واضح', 'يحتاج معالجة']) + ' / الصورة: ' + opt(R.q.image, ['واضحة', 'تحتاج معالجة']) + ' / الاستمرارية: ' + opt(R.q.cont, ['منتظمة', 'متقطعة']) + ' / استفادة الطلاب: ' + opt(R.q.benefit, ['جيدة', 'متوسطة', 'ضعيفة']) + '.</p>';
    var chRows = function (rows) {
      return '<table class="wk-pt"><thead><tr><th style="width:30%">التحدي وأثره على الحصص</th><th style="width:30%">الإجراء المنفذ فعليًا</th><th>المسؤول / والموعد</th><th style="width:13%">الحالة</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + multiline(r.c) + '</td><td>' + multiline(r.a) + '</td><td>' + t(r.who) + '</td><td class="wk-opts">' + ['مغلق', 'جارٍ', 'متعثر'].map(function (o) { return box(r.st === o) + ' ' + o; }).join('<br>') + '</td></tr>'; }).join('') + '</tbody></table>';
    };
    var chHead = '<h2 class="wk-h">التحديات والإجراءات</h2>', chNote = '<p class="wk-small">يُعد التحدي مغلقًا بعد تنفيذ الإجراء والتحقق من أثره في المدرسة المستقبلة.</p>';
    var p3 = '<h2 class="wk-h">الخلاصة والتوصيات</h2><div class="wk-text">' + multiline(R.summary) + '</div>' +
      '<h3 class="wk-h3">أبرز ما تحقق</h3><div class="wk-text">' + multiline(R.achieved) + '</div>' +
      '<h3 class="wk-h3">أولوية المتابعة للأسبوع القادم</h3><div class="wk-text">' + multiline(R.priority) + '</div>' +
      '<table class="wk-pt wk-sign"><thead><tr><th>مشرف أو مشرفة الإدارة المدرسية</th><th>مدير أو مديرة المدرسة المركزية</th></tr></thead><tbody><tr><td>الاسم: ' + t(R.supName) + '</td><td>الاسم: ' + t(R.prinName) + '</td></tr><tr><td>التوقيع:</td><td>التوقيع:</td></tr></tbody></table>' +
      '<ul class="wk-bul"><li>يُعبأ تقرير واحد للمدرسة المركزية مع إدراج جميع المدارس المستقبلة للبث خلال فترة التقرير. تُثبت الملاحظات والإجراءات بناءً على التحقق من المدرسة المركزية والمدارس المستقبلة.</li></ul>';
    /* page 2 layout: like the original when rows fit; otherwise continue on extra pages */
    var mid = [];
    if (R.fu.length <= 3 && R.ch.length <= 3) mid.push(fuRows(R.fu) + quality + chHead + chRows(R.ch) + chNote);
    else {
      var fc = chunk(R.fu, 6); fc.forEach(function (c, i) { mid.push(fuRows(c) + (i === fc.length - 1 && c.length <= 4 ? quality : '')); });
      if (fc[fc.length - 1].length > 4) mid.push(quality + chHead + chRows(R.ch.slice(0, 4)) + (R.ch.length <= 4 ? chNote : ''));
      var rest = fc[fc.length - 1].length > 4 ? R.ch.slice(4) : R.ch;
      chunk(rest, 5).forEach(function (c, i, all) { if (!c.length) return; mid.push((i === 0 && rest === R.ch ? chHead : '') + chRows(c) + (i === all.length - 1 ? chNote : '')); });
    }
    var all = [p1].concat(mid, [p3]), N = all.length;
    return all.map(function (h, i) { return page(h, i + 1, N); }).join('');
  }
  function totalRow() {
    if (R.ind.length < 2) return '';
    var s = function (k) { return R.ind.reduce(function (a, r) { return a + (+r[k] || 0); }, 0); };
    var p = s('planned') ? Math.round(s('done') / s('planned') * 1000) / 10 : '';
    return '<tr class="wk-tot"><td>الإجمالي</td><td></td><td>' + s('total') + '</td><td>' + s('benef') + '</td><td>' + s('planned') + '</td><td>' + s('done') + '</td><td>' + (p === '' ? '' : p + '٪') + '</td></tr>';
  }

  /* ---------- shell ---------- */
  function listHTML() {
    var L = load();
    if (!L.length) return '<p class="muted" style="margin:0">لا توجد تقارير محفوظة في هذا المتصفح بعد.</p>';
    return '<div class="wk-list">' + L.slice().reverse().map(function (r) {
      return '<div class="wk-item' + (R && r.id === R.id ? ' on' : '') + '"><div><b>' + (r.week ? 'الأسبوع ' + WEEKS[r.week - 1] : 'تقرير بلا أسبوع') + '</b><small>' + (r.from ? 'من ' + esc(r.from) + ' إلى ' + esc(r.to) : '') + (r.saved ? ' · حُفظ ' + new Date(r.saved).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn') : '') + '</small></div>' +
        '<div style="display:flex;gap:.3rem"><button class="btn sm ghost" data-open="' + r.id + '">فتح</button><button class="btn sm ghost" data-pv="' + r.id + '">معاينة</button><button class="btn sm danger" data-rm="' + r.id + '">حذف</button></div></div>';
    }).join('') + '</div>';
  }
  function draw() {
    root.innerHTML = '<div class="grid wk-top"><div class="card"><h3>التقارير المحفوظة</h3><div id="wkList">' + listHTML() + '</div>' +
      '<div class="wk-actions" style="margin-top:.8rem"><button class="btn sm" id="wkNew">تقرير جديد</button><button class="btn sm ghost" id="wkExp">تصدير نسخة احتياطية</button><label class="btn sm ghost" style="cursor:pointer">استيراد<input type="file" id="wkImp" accept=".json" hidden></label></div></div>' +
      '<div class="card wk-help"><h3>طريقة الاستخدام</h3><ol><li>عبّئ أقسام النموذج (بعض الحقول معبأة مسبقًا من بيانات المدرسة).</li><li>اضغط «حفظ المسودة» في أي وقت.</li><li>اضغط «معاينة التقرير» لعرضه بصفحات A4 على ترويسة الوزارة.</li><li>من المعاينة اضغط «طباعة / حفظ PDF» واختر «حفظ كملف PDF».</li></ol><p class="muted" style="font-size:.82rem;margin:0">التقارير تُحفظ في هذا المتصفح فقط؛ استخدم «تصدير نسخة احتياطية» لنقلها إلى جهاز آخر.</p></div></div>' +
      '<form id="wkForm" autocomplete="off">' + form() + '</form>' +
      '<div class="wk-bar"><button class="btn primary" id="wkSave" type="button">💾 حفظ المسودة</button><button class="btn gold" id="wkPrev" type="button">👁 معاينة التقرير</button><span class="muted" id="wkState" style="font-size:.85rem"></span></div>';
    bind();
  }
  function bind() {
    var f = $('#wkForm');
    f.addEventListener('input', onInput); f.addEventListener('change', onInput);
    f.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), d = e.target.closest('[data-del]');
      if (a) { var k = a.dataset.add; R[k].push(k === 'ind' ? { school: '', sector: '', total: '', benef: '', planned: '', done: '' } : k === 'fu' ? { school: '', subj: '', flow: '', qual: '', notes: '' } : { c: '', a: '', who: '', st: '' }); redraw(); }
      if (d) { R[d.dataset.del].splice(+d.dataset.i, 1); redraw(); }
    });
    $('#wkSave').onclick = save;
    $('#wkPrev').onclick = function () { preview(); };
    $('#wkNew').onclick = function () { R = blank(); draw(); toast('تقرير جديد'); };
    $('#wkExp').onclick = function () {
      var blob = new Blob([JSON.stringify(load(), null, 1)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'التقارير-الأسبوعية-' + hijriToday().replace(/\//g, '-') + '.json'; document.body.appendChild(a); a.click(); a.remove();
    };
    $('#wkImp').onchange = function () {
      var file = this.files[0]; if (!file) return; var rd = new FileReader();
      rd.onload = function () { try { var x = JSON.parse(rd.result), L = load(); (Array.isArray(x) ? x : [x]).forEach(function (r) { if (r && r.id) { L = L.filter(function (y) { return y.id !== r.id; }); L.push(r); } }); store(L); $('#wkList').innerHTML = listHTML(); toast('تم الاستيراد'); } catch (e) { toast('ملف غير صالح'); } };
      rd.readAsText(file);
    };
    $('#wkList').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), p = e.target.closest('[data-pv]'), r = e.target.closest('[data-rm]');
      var find = function (id) { return load().filter(function (x) { return x.id === id; })[0]; };
      if (o) { R = find(o.dataset.open); draw(); window.scrollTo(0, 0); }
      if (p) { R = find(p.dataset.pv); draw(); preview(); }
      if (r) {
        if (r.dataset.sure) { store(load().filter(function (x) { return x.id !== r.dataset.rm; })); if (R.id === r.dataset.rm) R = blank(); draw(); toast('حُذف التقرير'); }
        else { r.dataset.sure = 1; r.textContent = 'تأكيد الحذف؟'; }
      }
    });
  }
  function redraw() { var y = window.scrollY; $('#wkForm').innerHTML = form(); window.scrollTo(0, y); state(true); }
  function state(dirty) { var s = $('#wkState'); if (s) s.textContent = dirty ? 'تغييرات غير محفوظة' : (R.saved ? 'محفوظ' : ''); }
  function onInput(e) {
    var el = e.target, k = el.dataset && el.dataset.k; if (!k) return;
    var v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'radio' && !el.checked) return;
    set(k, v);
    var m = k.match(/^ind\.(\d+)\./);
    if (m) { var c = $('[data-pct="' + m[1] + '"]'), p = pct(R.ind[+m[1]]); if (c) c.textContent = p === '' ? '—' : p + '٪'; }
    state(true);
    clearTimeout(onInput.t); onInput.t = setTimeout(function () { save(true); }, 1500); /* حفظ تلقائي */
  }
  function save(silent) {
    R.saved = Date.now();
    var L = load().filter(function (x) { return x.id !== R.id; }); L.push(JSON.parse(JSON.stringify(R)));
    if (!store(L)) { toast('تعذر الحفظ في هذا المتصفح'); return; }
    var l = $('#wkList'); if (l) l.innerHTML = listHTML();
    state(false); if (silent !== true) toast('حُفظت المسودة');
  }
  function preview() {
    save(true);
    var ov = document.createElement('div'); ov.id = 'wkPrint';
    ov.innerHTML = '<div class="wk-pbar"><b>معاينة التقرير</b><span class="muted">' + (R.week ? 'الأسبوع ' + WEEKS[R.week - 1] : '') + '</span><span style="flex:1"></span><button class="btn gold" id="wkDoPrint">🖨 طباعة / حفظ PDF</button><button class="btn ghost" id="wkClose">إغلاق</button></div><div class="wk-pages">' + pages() + '</div>';
    document.body.appendChild(ov); document.body.classList.add('wk-printing');
    $('#wkClose').onclick = close; $('#wkDoPrint').onclick = function () { window.print(); };
    document.addEventListener('keydown', esc1);
    function esc1(e) { if (e.key === 'Escape') close(); }
    function close() { ov.remove(); document.body.classList.remove('wk-printing'); document.removeEventListener('keydown', esc1); }
  }

  return {
    mount: function (el, ctx) {
      root = el; D = ctx.D; esc = ctx.esc; toast = ctx.toast;
      var L = load(); R = L.length ? L[L.length - 1] : blank();
      if (!R.q) R = blank();
      draw();
    }
  };
})();
