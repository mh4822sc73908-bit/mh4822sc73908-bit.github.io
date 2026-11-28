/* ==========================================================
   موقع المدرسة المركزية للبنين بحائل — منطق الصفحات
   ========================================================== */
(function () {
  'use strict';
  var D = window.SITE_DATA;
  var app = document.getElementById('app');
  var LS_KEY = 'mk-evidence-v1';
  var EMBED = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  if (EMBED) document.documentElement.classList.add('embed');

  /* ---------- Auth (GitHub version only: active when users.js is present) ---------- */
  var AUTH = window.MK_AUTH || null, SES = null;
  try { SES = JSON.parse(sessionStorage.getItem('mk-session')); } catch (e) { SES = null; }
  var STAFF = ['teacher', 'supervisor', 'principal', 'admin'];
  function role() { return AUTH ? (SES && SES.role) || null : 'admin'; }
  function isStaff() { return STAFF.indexOf(role()) > -1; }
  var ACCESS = { circulars: STAFF, reports: STAFF, development: STAFF, evidence: STAFF, notifications: STAFF, me: ['student'], adminfiles: ['principal', 'admin'] };
  function allowed(key) { if (!AUTH) return key !== 'me' && key !== 'adminfiles' || false; var a = ACCESS[key]; return !a || a.indexOf(role()) > -1; }
  function myTeacher() { return AUTH ? SES && SES.teacherId : null; }
  function canEditTeacher(tid) { if (!AUTH) return true; return role() === 'admin' || (role() === 'teacher' && SES.teacherId === tid); }
  function u8(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function pbkdf2(pass, salt, bytes) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: AUTH.iter }, k, bytes * 8);
    });
  }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function aesDecrypt(keyBytes, data) {
    return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, k, data.slice(12));
    });
  }
  function login(id, pw) {
    id = String(id || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).trim();
    pw = String(pw || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).trim();
    if (!/^\d{10}$/.test(id)) return Promise.reject('أدخل رقم السجل المدني (10 أرقام)');
    if (!window.crypto || !crypto.subtle) return Promise.reject('افتح الموقع عبر رابط https');
    return pbkdf2(id, AUTH.tagSalt, 32).then(function (tag) {
      var rec = AUTH.users[hex(tag)];
      if (!rec || pw !== id) throw 'بيانات الدخول غير صحيحة';
      return pbkdf2(id, AUTH.keySalt, 32).then(function (k) { return aesDecrypt(new Uint8Array(k), u8(rec)); });
    }).then(function (buf) {
      SES = JSON.parse(new TextDecoder().decode(buf));
      try { sessionStorage.setItem('mk-session', JSON.stringify(SES)); } catch (e) { }
      return SES;
    });
  }
  function logout() { try { sessionStorage.removeItem('mk-session'); } catch (e) { } SES = null; location.hash = ''; showLogin(); }
  function openSecure(title, item) {
    toast('جارٍ فتح الملف…');
    fetch(item.path).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (buf) { return aesDecrypt(u8(item.key), new Uint8Array(buf)); })
      .then(function (plain) { var url = URL.createObjectURL(new Blob([plain], { type: item.type || 'application/pdf' })); openModal(title, url); $('#mDl').setAttribute('download', title + '.pdf'); })
      .catch(function () { toast('تعذّر فتح الملف'); });
  }
  function showLogin() {
    var el = $('#login'); if (!el) { el = document.createElement('div'); el.id = 'login'; document.body.appendChild(el); }
    el.innerHTML = '<div class="lg-box fade"><img src="assets/img/logo.jpg" alt="" class="lg-logo"><h1>المدرسة المركزية للبنين بحائل</h1><p class="muted">تسجيل الدخول حسب الصفة</p>' +
      '<form id="lgForm"><div class="form-row"><label for="lgId">السجل المدني (اسم المستخدم)</label><input class="input" id="lgId" inputmode="numeric" autocomplete="username" maxlength="10" required></div>' +
      '<div class="form-row"><label for="lgPw">كلمة المرور</label><input class="input" id="lgPw" type="password" inputmode="numeric" autocomplete="current-password" required></div>' +
      '<div id="lgErr" class="lg-err"></div><button class="btn primary" style="width:100%;justify-content:center" type="submit" id="lgBtn">دخول</button></form>' +
      '<button class="btn ghost" style="width:100%;justify-content:center;margin-top:.6rem" id="lgVisit" type="button">الدخول كزائر</button>' +
      '<p class="muted" style="font-size:.78rem;margin:.9rem 0 0">الصفات: مدير المدرسة · المعلم · المشرف التربوي · الطالب · الزائر</p></div>';
    el.style.display = 'flex'; document.body.style.overflow = 'hidden';
    $('#lgVisit').onclick = function () { SES = { role: 'visitor', roleAr: 'زائر', name: 'زائر' }; try { sessionStorage.setItem('mk-session', JSON.stringify(SES)); } catch (e) { } hideLogin(); };
    $('#lgForm').onsubmit = function (e) {
      e.preventDefault(); $('#lgErr').textContent = ''; $('#lgBtn').disabled = true; $('#lgBtn').textContent = 'جارٍ التحقق…';
      login($('#lgId').value, $('#lgPw').value).then(function () { hideLogin(); }, function (m) { $('#lgErr').textContent = typeof m === 'string' ? m : 'تعذّر الدخول'; $('#lgBtn').disabled = false; $('#lgBtn').textContent = 'دخول'; });
    };
    setTimeout(function () { $('#lgId').focus(); }, 50);
  }
  function hideLogin() { var el = $('#login'); if (el) el.style.display = 'none'; document.body.style.overflow = ''; applyRole(); route(); }
  function applyRole() {
    if (!AUTH) return;
    $$('nav.main a[data-r]').forEach(function (a) { var r = a.dataset.r; a.style.display = (r === '' || allowed(r)) ? '' : 'none'; });
    $$('footer.site a[href^="#"]').forEach(function (a) { var r = a.getAttribute('href').slice(1); a.parentNode.style.display = allowed(r) ? '' : 'none'; });
    var nav = $('#nav');
    $$('.role-link').forEach(function (x) { x.remove(); });
    if (role() === 'student') nav.insertAdjacentHTML('afterbegin', '<a href="#me" data-r="me" class="role-link">صفحتي</a>');
    if (role() === 'principal' || role() === 'admin') $('#more .menu').insertAdjacentHTML('afterbegin', '<a href="#adminfiles" data-r="adminfiles" class="role-link">الملفات الإدارية</a>');
    var chip = $('#userChip'); if (!chip) { chip = document.createElement('div'); chip.id = 'userChip'; $('.govbar .tools').prepend(chip); }
    chip.innerHTML = '<span>' + esc(SES.name) + ' · ' + esc(SES.roleAr) + '</span><button type="button" id="logoutBtn">خروج</button>';
    $('#logoutBtn').onclick = logout;
  }


  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function ar(n) { return Number(n).toLocaleString('ar-SA'); }
  function isImg(f) { return /\.(jpe?g|png|webp|gif)$/i.test(f || '') || /^data:image/.test(f || ''); }
  function size(b) { if (!b) return ''; return b > 1048576 ? (b / 1048576).toFixed(1) + ' م.ب' : Math.round(b / 1024) + ' ك.ب'; }
  function fdate(d) {
    if (!d) return '';
    try { var x = new Date(d + 'T12:00:00'); return x.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }) + ' (' + x.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ')'; } catch (e) { return d; }
  }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function initials(n) { var w = n.split(' '); return (w[0][0] || '') + (w[1] ? w[1][0] : ''); }
  var ICONS = {
    school: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2 .8 3.5 3 3.5 6"/>',
    teacher: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    spark: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M5 19l3.5-3.5M15.5 8.5L19 5"/>',
    book: '<path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3v13a2 2 0 012-2h7z"/>'
  };
  function icon(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[k] || '') + '</svg>'; }

  function pageHead(title, sub, crumb) {
    return '<div class="page-head"><div class="container fade"><div class="crumbs"><a href="#home">الرئيسية</a> › ' + esc(crumb || title) + '</div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>';
  }
  function docCard(d, opts) {
    opts = opts || {};
    var img = isImg(d.file);
    return '<div class="card doc fade">' +
      '<div class="ico ' + (img ? 'img' : '') + '">' + (img ? 'صورة' : 'PDF') + '</div>' +
      '<div class="body"><h3>' + esc(d.title) + '</h3>' +
      (d.desc ? '<div class="muted" style="font-size:.9rem">' + esc(d.desc) + '</div>' : '') +
      '<div class="meta">' + [d.source, d.cat && !opts.noCat ? d.cat : '', size(d.size)].filter(Boolean).map(esc).join(' · ') + '</div>' +
      '<div class="actions"><button class="btn sm primary" data-view="' + esc(d.file) + '" data-title="' + esc(d.title) + '">عرض</button>' +
      '<a class="btn sm ghost" href="' + esc(d.file) + '" download>تحميل</a></div></div></div>';
  }
  function fileChip(d) {
    return '<button class="btn sm ghost" data-view="' + esc(d.file) + '" data-title="' + esc(d.title) + '">' + (isImg(d.file) ? '🖼 ' : '📄 ') + esc(d.title) + '</button>';
  }
  function bars(list, max, unit) {
    max = max || Math.max.apply(null, list.map(function (x) { return x[1]; }));
    return '<div class="bars">' + list.map(function (x) {
      var p = max ? Math.round(x[1] / max * 100) : 0;
      return '<div class="bar"><span>' + esc(x[0]) + '</span><div class="track"><div class="fill" data-w="' + p + '"></div></div><b>' + ar(x[1]) + (unit || '') + '</b></div>';
    }).join('') + '</div>';
  }
  function donut(list) {
    var colors = ['#0F5C4E', '#13877A', '#B8975A', '#7FB8A8'];
    var total = list.reduce(function (a, x) { return a + x[1]; }, 0), acc = 0, r = 54, c = 2 * Math.PI * r;
    var segs = list.map(function (x, i) {
      var len = x[1] / total * c, s = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + colors[i % 4] + '" stroke-width="22" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 70 70)"/>';
      acc += len; return s;
    }).join('');
    return '<div class="donut"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="رسم دائري">' + segs +
      '<text x="70" y="66" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor">' + ar(total) + '</text><text x="70" y="88" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">طالبًا</text></svg>' +
      '<div class="legend">' + list.map(function (x, i) { return '<span><i style="background:' + colors[i % 4] + '"></i>' + esc(x[0]) + ': <b>' + ar(x[1]) + '</b></span>'; }).join('') + '</div></div>';
  }
  function animate() {
    requestAnimationFrame(function () { $$('.fill[data-w]').forEach(function (f) { f.style.width = f.dataset.w + '%'; }); });
    $$('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, t0 = null;
      function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 900); el.textContent = ar(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }

  /* ---------- pages ---------- */
  var P = {};

  P[''] = function () {
    var s = D.school, st = D.stats;
    var latestCirc = D.circulars.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 4);
    return '<section class="hero"><div class="container">' +
      '<div class="fade"><span class="eyebrow">' + esc(s.region) + ' · ' + esc(s.year) + '</span>' +
      '<h1>' + esc(s.name) + '</h1><div class="goldline"></div><p>' + esc(s.about) + '</p>' +
      '<div class="btns"><a class="btn gold" href="#guides">الأدلة والأنظمة</a><a class="btn light" href="#evidence">توثيق الشواهد</a><a class="btn light" href="#stats">لوحة المؤشرات</a></div></div>' +
      '<div class="logo-card"><img src="assets/img/logo.jpg" alt="شعار المدرسة"></div>' +
      '</div></section>' +
      '<div class="container"><div class="kpis">' + st.kpis.map(function (k) {
        return '<div class="kpi">' + icon(k.icon) + '<div class="n" data-count="' + k.value + '">0</div><div class="l">' + esc(k.label) + '</div></div>';
      }).join('') + '</div></div>' +

      '<section class="block"><div class="container grid g3">' +
      '<div class="card"><h3>توزيع الطلاب على المدارس الملحقة</h3>' + donut(st.bySchool) + '</div>' +
      '<div class="card"><h3>الطلاب حسب الصف</h3>' + bars(st.byGrade) + '<p class="muted" style="font-size:.85rem;margin-top:.8rem">فصل واحد لكل صف: رابع-1، خامس-1، سادس-1</p></div>' +
      '<div class="card"><h3>' + esc(st.week11.label) + '</h3><div style="display:flex;gap:1.2rem;align-items:center;margin:.6rem 0"><div class="ring" style="--p:' + st.week11.attendance + '"><span>' + ar(st.week11.attendance) + '٪</span></div><div><b>نسبة الحضور</b><p class="muted" style="font-size:.85rem;margin:.2rem 0 0">' + esc(st.week11.attendanceNote) + '</p></div></div><a href="#stats">عرض جميع المؤشرات ←</a></div>' +
      '</div></section>' +

      '<section class="block" style="padding-top:0"><div class="container">' +
      '<div class="sec-head"><div><h2>المبادرات والمنصات</h2><p>مبادرات نوعية تخدم طلاب المدارس الملحقة</p></div><a class="btn ghost sm" href="#initiatives">كل المبادرات</a></div>' +
      '<div class="grid g4">' + D.initiatives.slice(0, 4).map(initCard).join('') + '</div></div></section>' +

      (AUTH && !isStaff() ? '' : '<section class="block" style="padding-top:0"><div class="container"><div class="card" style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;border-inline-start:4px solid var(--accent)"><div style="flex:1;min-width:240px"><h3 style="font-size:1.2rem">إشعارات الطلاب وأولياء الأمور</h3><p class="muted" style="margin:0">' + ar(D.notifications.rounds.length) + ' جولات إشعار و' + ar(D.notifications.rounds.reduce(function (a, r) { return a + sumCount(r); }, 0)) + ' إشعارًا فرديًا صدرت هذا الفصل، آخرها: ' + esc(D.notifications.rounds[D.notifications.rounds.length - 1].title) + '.</p></div><a class="btn primary" href="#notifications">سجل الإشعارات</a></div></div></section>') +
      '<section class="block" style="padding-top:0"><div class="container grid g2">' +
      '<div><div class="sec-head"><div><h2>آخر الأنشطة</h2></div><a class="btn ghost sm" href="#activities">المزيد</a></div><div class="grid g2">' + D.activities.slice(0, 4).map(actCard).join('') + '</div></div>' +
      (AUTH && !isStaff() ? '<div><div class="sec-head"><div><h2>المبادرات والمنصات</h2></div></div><div class="grid g2">' + D.initiatives.slice(4, 6).map(initCard).join('') + '</div></div>' : '<div><div class="sec-head"><div><h2>آخر التعاميم</h2></div><a class="btn ghost sm" href="#circulars">كل التعاميم</a></div>' +
      '<div class="card" style="padding:.4rem 1rem">' + latestCirc.map(function (c) {
        return '<div style="display:flex;gap:.6rem;align-items:center;padding:.65rem 0;border-bottom:1px solid var(--line)"><span class="pill">' + esc(c.cat) + '</span><a href="javascript:void 0" data-view="' + esc(c.file) + '" data-title="' + esc(c.title) + '" style="flex:1">' + esc(c.title) + '</a></div>';
      }).join('') + '</div>' +
      '<div class="sec-head" style="margin-top:1.6rem"><div><h2>آخر التقارير الأسبوعية</h2></div><a class="btn ghost sm" href="#reports">كل التقارير</a></div>' +
      D.reports.slice(-2).reverse().map(function (r) { return '<div class="card" style="margin-bottom:.7rem"><span class="pill gold">' + esc(r.week) + '</span><h3 style="margin-top:.4rem">' + esc(r.title) + '</h3><p class="muted" style="margin:0;font-size:.9rem">' + esc(r.summary) + '</p></div>'; }).join('') +
      '</div>') + '</div></section>';
  };

  function initCard(i) {
    return '<a class="card media link fade" href="#initiatives" style="text-decoration:none;color:inherit"><div class="thumb ' + (i.cover ? 'contain' : '') + '" style="' + (i.cover ? 'background-image:url(\'' + esc(i.cover) + '\')' : '') + '">' + (i.cover ? '' : esc(i.title)) + '</div><div class="in"><h3>' + esc(i.title) + '</h3><div class="meta">' + esc(i.sub) + '</div></div></a>';
  }
  function actCard(a) {
    return '<a class="card media link fade" href="#activities" style="text-decoration:none;color:inherit"><div class="thumb" style="' + (a.cover ? 'background-image:url(\'' + esc(a.cover) + '\')' : '') + '">' + (a.cover ? '' : esc(a.title)) + '</div><div class="in"><span class="pill">' + esc(a.type) + '</span><h3 style="margin-top:.35rem">' + esc(a.title) + '</h3><div class="meta">' + esc(a.date) + '</div></div></a>';
  }

  P.about = function () {
    var s = D.school;
    return pageHead('عن المدرسة', 'نموذج «المعلم المركزي والمعلم الميسّر» لتعليم طلاب المناطق النائية') +
      '<section class="block"><div class="container grid g3">' +
      '<div class="card" style="grid-column:span 2"><h3>نبذة</h3><p>' + esc(s.about) + '</p>' +
      '<div class="grid g2"><div><h3>الرؤية</h3><p>' + esc(s.vision) + '</p></div><div><h3>الرسالة</h3><p>' + esc(s.mission) + '</p></div></div>' +
      '<h3>القيم</h3><div style="display:flex;gap:.4rem;flex-wrap:wrap">' + s.values.map(function (v) { return '<span class="pill">' + esc(v) + '</span>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>بطاقة المدرسة</h3><table><tbody>' +
      [['المرحلة', 'الابتدائية (4–6)'], ['نمط التعليم', 'إلكتروني عن بُعد'], ['المنصة', 'مدرستي'], ['المدارس الملحقة', '3'], ['الطلاب', '21'], ['المعلمون', '9'], ['قائد المدرسة', s.principal], ['الوكيل', s.deputy]]
        .map(function (r) { return '<tr><th style="cursor:default">' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '</div></section>' +
      '<section class="block" style="padding-top:0"><div class="container"><div class="sec-head"><div><h2>المدارس الملحقة</h2><p>تستفيد من خدمات التعليم عن بُعد للمدرسة المركزية</p></div></div><div class="grid g3">' +
      D.annexed.map(function (a) { return '<div class="card"><div class="person"><div class="avatar">' + icon('school') + '</div><div><h3>' + esc(a.name) + '</h3><div class="meta">الصفوف: ' + esc(a.grades) + '</div></div><div style="margin-inline-start:auto;text-align:center"><div class="big-stat" style="font-size:1.8rem">' + ar(a.students) + '</div><small class="muted">طالبًا</small></div></div></div>'; }).join('') +
      '</div></div></section>' +
      '<section class="block" style="padding-top:0"><div class="container"><div class="sec-head"><div><h2>المواد المقدّمة لكل مدرسة ملحقة</h2><p>' + esc(D.subjectsBySchool.note) + '</p></div></div><div class="table-wrap"><table><thead><tr><th style="cursor:default">المدرسة</th>' + D.subjectsBySchool.subjects.map(function (x) { return '<th style="cursor:default;text-align:center;white-space:normal">' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + D.subjectsBySchool.rows.map(function (r) { return '<tr><td><b>' + esc(r[0]) + '</b></td>' + r[1].map(function (v) { return '<td style="text-align:center">' + (v ? '<span class="ok">✓</span>' : '<span class="no">—</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div></section>' +
      '<section class="block" style="padding-top:0"><div class="container"><div class="sec-head"><div><h2>الهيكل التنظيمي</h2></div></div><div class="card"><div class="org">' +
      '<div class="lvl"><div class="node top"><small class="muted">قائد المدرسة</small><b>' + esc(s.principal) + '</b></div></div><div class="arrow"></div>' +
      '<div class="lvl"><div class="node top"><small class="muted">وكيل المدرسة</small><b>' + esc(s.deputy) + '</b></div></div><div class="arrow"></div>' +
      '<div class="lvl">' + D.teachers.filter(function (t) { return t.id !== 'hulail'; }).map(function (t) { return '<div class="node"><small class="muted">' + esc(t.role) + '</small><b>' + esc(t.name) + '</b></div>'; }).join('') + '</div><div class="arrow"></div>' +
      '<div class="lvl">' + D.annexed.map(function (a) { return '<div class="node" style="border-top-color:var(--accent)"><small class="muted">مدرسة ملحقة + معلم ميسّر</small><b>' + esc(a.name) + '</b></div>'; }).join('') + '</div>' +
      '</div></div></div></section>' +
      '<section class="block" style="padding-top:0"><div class="container"><div class="sec-head"><div><h2>فريق العمل</h2></div></div><div class="grid g3">' +
      D.adminStaff.map(function (t) { return '<div class="card"><div class="person"><div class="avatar" style="background:#F5EDDD;color:#7A5F2C">' + esc(initials(t.name)) + '</div><div><h3>' + esc(t.name) + '</h3><span class="pill gold">' + esc(t.role) + '</span></div></div></div>'; }).join('') +
      D.teachers.map(function (t) { return '<div class="card"><div class="person"><div class="avatar">' + esc(initials(t.name)) + '</div><div><h3>' + esc(t.name) + '</h3><div class="meta">' + esc(t.subject) + '</div><span class="pill" style="margin-top:.3rem">' + esc(t.role) + '</span></div></div></div>'; }).join('') +
      '</div></div></section>';
  };

  function libraryPage(title, sub, list, key) {
    if (AUTH && !isStaff() && list === D.guides) list = list.filter(function (d) { return d.cat === 'أدلة الطالب والأسرة' || d.cat === 'أدلة الموجهين'; });
    var cats = ['الكل'].concat(list.map(function (d) { return d.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    setTimeout(function () {
      var state = { cat: 'الكل', q: '' };
      function draw() {
        var out = list.filter(function (d) { return (state.cat === 'الكل' || d.cat === state.cat) && (!state.q || (d.title + d.desc + d.source).indexOf(state.q) > -1); });
        $('#lib').innerHTML = out.length ? out.map(function (d) { return docCard(d); }).join('') : '<div class="empty">لا توجد نتائج مطابقة</div>';
      }
      $$('#chips .chip').forEach(function (c) { c.onclick = function () { $$('#chips .chip').forEach(function (x) { x.classList.remove('on'); }); c.classList.add('on'); state.cat = c.dataset.c; draw(); }; });
      $('#libq').oninput = function (e) { state.q = e.target.value.trim(); draw(); };
      draw();
    });
    return pageHead(title, sub) + '<section class="block"><div class="container"><div class="toolbar" id="chips">' +
      cats.map(function (c, i) { return '<button class="chip ' + (i ? '' : 'on') + '" data-c="' + esc(c) + '">' + esc(c) + ' <small>(' + ar(c === 'الكل' ? list.length : list.filter(function (d) { return d.cat === c; }).length) + ')</small></button>'; }).join('') +
      '<input class="input" id="libq" placeholder="بحث في ' + esc(title) + '…" style="margin-inline-start:auto"></div><div class="grid g2" id="lib"></div></div></section>';
  }
  P.guides = function () { return libraryPage('الأدلة والأنظمة', 'المرجع الموحد للأدلة التشغيلية وأدلة الطالب والأسرة وأدلة الموجهين', D.guides) + '<section class="block" style="padding-top:0"><div class="container"><div class="sec-head"><div><h2>توزيع درجات المواد – المرحلة الابتدائية</h2><p>دليل توزيع درجات المواد الدراسية 2025م</p></div></div>' + gradeTable() + '</div></section>'; };

  P.circulars = function () {
    setTimeout(function () {
      var st = { sort: 'date', dir: -1, cat: 'الكل', q: '' };
      function draw() {
        var rows = D.circulars.filter(function (c) { return (st.cat === 'الكل' || c.cat === st.cat) && (!st.q || c.title.indexOf(st.q) > -1); })
          .sort(function (a, b) { return (a[st.sort] || '').localeCompare(b[st.sort] || '', 'ar') * st.dir; });
        $('#ctb').innerHTML = rows.map(function (c, i) {
          return '<tr><td>' + ar(i + 1) + '</td><td><a href="javascript:void 0" data-view="' + esc(c.file) + '" data-title="' + esc(c.title) + '">' + esc(c.title) + '</a></td><td><span class="pill">' + esc(c.cat) + '</span></td><td>' + esc(fdate(c.date)) + '</td><td><a class="btn sm ghost" href="' + esc(c.file) + '" download>تحميل</a></td></tr>';
        }).join('') || '<tr><td colspan="5" class="muted">لا توجد نتائج</td></tr>';
      }
      $$('th[data-s]').forEach(function (th) { th.onclick = function () { st.dir = st.sort === th.dataset.s ? -st.dir : 1; st.sort = th.dataset.s; draw(); }; });
      $('#ccat').onchange = function (e) { st.cat = e.target.value; draw(); };
      $('#cq').oninput = function (e) { st.q = e.target.value.trim(); draw(); };
      draw();
    });
    var cats = ['الكل'].concat(D.circulars.map(function (c) { return c.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    return pageHead('التعاميم', 'التعاميم الواردة للمدرسة خلال العام الدراسي 1448هـ — اضغط على العنوان لعرض التعميم') +
      '<section class="block"><div class="container"><div class="toolbar"><select class="input" id="ccat" style="min-width:180px">' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select><input class="input" id="cq" placeholder="ابحث في عناوين التعاميم…"></div>' +
      '<div class="table-wrap"><table><thead><tr><th>م</th><th data-s="title">العنوان ⇅</th><th data-s="cat">التصنيف ⇅</th><th data-s="date">تاريخ الإضافة ⇅</th><th>الملف</th></tr></thead><tbody id="ctb"></tbody></table></div>' +
      '<p class="muted" style="font-size:.85rem;margin-top:.6rem">تاريخ الإضافة هو تاريخ حفظ التعميم في أرشيف المدرسة.</p></div></section>';
  };

  P.reports = function () {
    return pageHead('التقارير الأسبوعية والفصلية', 'خط زمني لمنجزات المدرسة أسبوعًا بأسبوع مع الشواهد') +
      '<section class="block"><div class="container grid" style="grid-template-columns:1.6fr 1fr;align-items:start">' +
      '<div class="timeline">' + D.reports.slice().reverse().map(function (r) {
        return '<div class="tl fade"><div class="card"><span class="pill gold">' + esc(r.week) + '</span><h3 style="margin-top:.4rem">' + esc(r.title) + '</h3><p class="muted" style="margin:0">' + esc(r.summary) + '</p><div class="files">' + r.files.map(fileChip).join('') + '</div></div></div>';
      }).join('') + '</div>' +
      '<div><div class="card" style="margin-bottom:1rem"><h3>تحليل نتائج الفترة الأولى</h3><div class="grid" style="gap:.5rem">' + D.analysis.map(function (d) { return '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center;border-bottom:1px solid var(--line);padding:.35rem 0"><span style="font-size:.9rem">' + esc(d.title.replace('تحليل اختبار الفترة الأولى – ', '')) + '<br><small class="muted">' + esc(d.source) + '</small></span>' + '<button class="btn sm ghost" data-view="' + esc(d.file) + '" data-title="' + esc(d.title) + '">عرض</button></div>'; }).join('') + '</div></div>' +
      '<div class="card"><h3>محاضر ولجان</h3><div class="grid" style="gap:.5rem">' + D.adminDocs.map(function (d) { return '<div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center;border-bottom:1px solid var(--line);padding:.35rem 0"><span style="font-size:.9rem">' + esc(d.title) + '</span><button class="btn sm ghost" data-view="' + esc(d.file) + '" data-title="' + esc(d.title) + '">عرض</button></div>'; }).join('') + '</div></div></div>' +
      '</div></section>';
  };

  P.stats = function () {
    var st = D.stats, w = st.week11;
    return pageHead('لوحة المؤشرات', 'إحصائيات مجمّعة من منصة مدرستي وسجلات المدرسة — آخر تحديث: ' + fdate(st.updated)) +
      '<section class="block"><div class="container"><div class="kpis" style="margin-top:0">' + st.kpis.map(function (k) { return '<div class="kpi">' + icon(k.icon) + '<div class="n" data-count="' + k.value + '">0</div><div class="l">' + esc(k.label) + '</div></div>'; }).join('') + '</div></div></section>' +
      '<section class="block" style="padding-top:0"><div class="container grid g2">' +
      '<div class="card"><h3>الطلاب حسب المدرسة الملحقة</h3>' + donut(st.bySchool) + '</div>' +
      '<div class="card"><h3>الطلاب حسب الصف</h3>' + bars(st.byGrade) + '</div>' +
      '<div class="card"><h3>' + esc(w.label) + '</h3><div class="grid g2" style="margin-top:.6rem"><div style="text-align:center"><div class="ring" style="--p:' + w.attendance + ';margin:auto"><span>' + ar(w.attendance) + '٪</span></div><b>الحضور</b><p class="muted" style="font-size:.82rem">' + esc(w.attendanceNote) + '</p></div>' +
      '<div style="text-align:center"><div class="ring" style="--p:' + w.homework + ';margin:auto"><span>' + ar(w.homework) + '٪</span></div><b>حل الواجبات</b><p class="muted" style="font-size:.82rem">' + esc(w.homeworkNote) + '</p></div></div></div>' +
      '<div class="card"><h3>نسبة حل الواجبات حسب المدرسة – الأسبوع الحادي عشر</h3>' + bars(w.homeworkBySchool, 100, '٪') + '<div class="note" style="margin-top:1rem">مؤشر يحتاج متابعة: يُوصى بالتنسيق مع المعلم الميسّر وأولياء الأمور في المدارس ذات النسب المنخفضة.</div></div>' +
      '<div class="card"><h3>نسبة حل الواجبات حسب المادة – الأسبوع الحادي عشر</h3>' + bars(w.homeworkBySubject, 100, '٪') + '</div>' +
      '<div class="card"><h3>' + esc(st.semester.label) + '</h3>' + bars(st.semester.items, 100, '٪') + '<p class="muted" style="font-size:.82rem;margin-top:.8rem">النسب تراكمية كما تعرضها صفحة «إحصائيات الطالب» في منصة مدرستي.</p></div>' +
      '</div></section>';
  };

  P.activities = function () {
    setTimeout(function () {
      $$('#achips .chip').forEach(function (c) { c.onclick = function () { $$('#achips .chip').forEach(function (x) { x.classList.remove('on'); }); c.classList.add('on'); $$('[data-type]').forEach(function (el) { el.style.display = (c.dataset.c === 'الكل' || el.dataset.type === c.dataset.c) ? '' : 'none'; }); }; });
    });
    var types = ['الكل'].concat(D.activities.map(function (a) { return a.type; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    return pageHead('الأنشطة والفعاليات', 'فعاليات وطنية وتعليمية وتوعوية نُفّذت لطلاب المدارس الملحقة عن بُعد') +
      '<section class="block"><div class="container"><div class="toolbar" id="achips">' + types.map(function (t, i) { return '<button class="chip ' + (i ? '' : 'on') + '" data-c="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div><div class="grid g3">' +
      D.activities.map(function (a) {
        return '<div class="card media fade" data-type="' + esc(a.type) + '"><div class="thumb" style="' + (a.cover ? 'background-image:url(\'' + esc(a.cover) + '\');cursor:pointer" data-view="' + esc(a.cover) + '" data-title="' + esc(a.title) : '') + '">' + (a.cover ? '' : esc(a.title)) + '</div><div class="in"><span class="pill">' + esc(a.type) + '</span> <small class="muted">' + esc(a.date) + '</small><h3 style="margin-top:.35rem">' + esc(a.title) + '</h3><p class="muted" style="font-size:.9rem;margin:0">' + esc(a.desc) + '</p>' +
          (a.gallery && a.gallery.length > 1 ? '<div class="gallery">' + a.gallery.map(function (g) { return '<img loading="lazy" src="' + esc(g) + '" alt="" data-view="' + esc(g) + '" data-title="' + esc(a.title) + '">'; }).join('') + '</div>' : '') +
          '<div class="files" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem">' + (a.files || []).map(fileChip).join('') + (a.link ? '<a class="btn sm primary" href="' + esc(a.link) + '" target="_blank" rel="noopener">زيارة المنصة ↗</a>' : '') + '</div></div></div>';
      }).join('') + '</div></div></section>';
  };

  P.initiatives = function () {
    return pageHead('المبادرات والمنصات', 'مبادرات نوعية لتحسين التعلّم وتعزيز القيم وتوظيف التقنية') +
      '<section class="block"><div class="container grid g2">' + D.initiatives.map(function (i) {
        return '<div class="card fade" style="display:grid;grid-template-columns:' + (i.cover ? '150px 1fr' : '1fr') + ';gap:1rem;align-items:start">' +
          (i.cover ? '<img src="' + esc(i.cover) + '" alt="" loading="lazy" style="border-radius:10px;border:1px solid var(--line);cursor:pointer;background:#fff" data-view="' + esc(i.cover) + '" data-title="' + esc(i.title) + '">' : '') +
          '<div><h3>' + esc(i.title) + '</h3><div class="meta">' + esc(i.sub) + '</div><p style="font-size:.93rem;margin:.5rem 0">' + esc(i.desc) + '</p>' +
          '<table style="font-size:.85rem"><tbody><tr><td class="muted">المنفّذ</td><td>' + esc(i.owner) + '</td></tr><tr><td class="muted">المستهدفون</td><td>' + esc(i.target) + '</td></tr>' + (i.result ? '<tr><td class="muted">المخرج</td><td>' + esc(i.result) + '</td></tr>' : '') + '</tbody></table>' +
          '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem">' + i.files.map(fileChip).join('') + (i.link ? '<a class="btn sm primary" href="' + esc(i.link) + '" target="_blank" rel="noopener">زيارة المنصة ↗</a>' : '') + '</div></div></div>';
      }).join('') + '</div></section>';
  };

  P.achievements = function () {
    return pageHead('الإنجازات والجوائز', 'أبرز ما حققته المدرسة ومنسوبوها وطلابها خلال الفصل الدراسي الأول') +
      '<section class="block"><div class="container grid g3">' + D.achievements.map(function (a, n) {
        return '<div class="card media fade"><div class="thumb ' + (a.img ? 'contain' : '') + '" style="' + (a.img ? 'background-image:url(\'' + esc(a.img) + '\')' : 'background:linear-gradient(135deg,#0F5C4E,#13877A);color:#fff') + '">' + (a.img ? '' : '<span style="font-size:2.4rem">🏅</span>') + '</div><div class="in"><span class="pill gold">إنجاز ' + ar(n + 1) + '</span><h3 style="margin-top:.35rem">' + esc(a.title) + '</h3><p class="muted" style="font-size:.9rem;margin:0">' + esc(a.desc) + '</p>' + (a.file ? '<button class="btn sm ghost" style="margin-top:.6rem" data-view="' + esc(a.file) + '" data-title="' + esc(a.title) + '">عرض الشاهد</button>' : '') + '</div></div>';
      }).join('') + '</div></section>';
  };

  P.me = function () {
    if (!SES || !SES.me) return '';
    var m = SES.me;
    setTimeout(function () { $$('[data-mynote]').forEach(function (b) { b.onclick = function () { var n = SES.notes[+b.dataset.mynote]; openSecure(n.title, n); }; }); });
    return pageHead('صفحتي', m.name + ' — ' + m.cls + ' · ابتدائية ' + m.school) +
      '<section class="block"><div class="container">' +
      '<div class="kpis" style="margin:0 0 1.2rem;grid-template-columns:repeat(4,1fr)">' +
      '<div class="kpi"><div class="n">' + ar(m.absentDays) + '</div><div class="l">أيام غياب – الأسبوع الحادي عشر</div></div>' +
      '<div class="kpi"><div class="n">' + ar(m.hwDone) + '/' + ar(m.hwTotal) + '</div><div class="l">واجبات محلولة – الأسبوع الحادي عشر</div></div>' +
      '<div class="kpi"><div class="n">' + ar(m.semHw) + '٪</div><div class="l">إنجاز الواجبات – الفصل</div></div>' +
      '<div class="kpi"><div class="n">' + ar(m.semAct) + '٪</div><div class="l">إنجاز الأنشطة – الفصل</div></div></div>' +
      '<div class="card" style="margin-bottom:1.2rem"><h3>مؤشراتي في منصة مدرستي</h3>' + bars([['الواجبات', m.semHw], ['الأنشطة والمهام', m.semAct], ['الاختبارات القصيرة', m.semTest]], 100, '٪') + '</div>' +
      '<div class="sec-head"><div><h2>إشعاراتي</h2><p>إشعارات النتائج الصادرة لك من المدرسة المركزية</p></div></div><div class="grid g3">' +
      SES.notes.map(function (n, i) { var r = D.notifications.rounds.filter(function (x) { return x.id === n.round; })[0] || {}; return '<div class="card"><span class="pill gold">' + esc(r.when || '') + '</span><h3 style="margin-top:.4rem">' + esc(n.title) + '</h3><div class="meta">' + esc(fdate(r.date)) + '</div><button class="btn primary sm" style="margin-top:.6rem" data-mynote="' + i + '">عرض الإشعار</button></div>'; }).join('') +
      '</div><div class="sec-head" style="margin-top:2rem"><div><h2>روابط تهمك</h2></div></div><div class="grid g3">' +
      D.guides.filter(function (g) { return g.cat === 'أدلة الطالب والأسرة'; }).map(function (d) { return docCard(d); }).join('') + '</div></div></section>';
  };
  P.adminfiles = function () {
    if (!SES || !SES.adminFiles) return '';
    setTimeout(function () { $$('[data-adf]').forEach(function (b) { b.onclick = function () { var f = SES.adminFiles[+b.dataset.adf]; openSecure(f.title, f); }; }); });
    return pageHead('الملفات الإدارية', 'ملفات تحتوي بيانات شخصية (أرقام هوية أو تواصل) — متاحة لمدير المدرسة ومدير الموقع فقط') +
      '<section class="block"><div class="container grid g3">' + SES.adminFiles.map(function (f, i) { return '<div class="card doc"><div class="ico">PDF</div><div class="body"><h3>' + esc(f.title) + '</h3><div class="meta">ملف مشفّر</div><div class="actions"><button class="btn sm primary" data-adf="' + i + '">عرض</button></div></div></div>'; }).join('') + '</div></section>';
  };

  /* ---------- Student notifications ---------- */
  var SCHOOLS = { jubbah: 'ابتدائية جبلة', jubaili: 'ابتدائية الجبيلي', hadaq: 'ابتدائية الحدق' };
  function sumCount(r) { var t = 0; for (var k in r.count) t += r.count[k]; return t; }
  P.notifications = function () {
    var N = D.notifications, total = N.rounds.reduce(function (a, r) { return a + sumCount(r); }, 0);
    var hasFiles = N.rounds.some(function (r) { return r.files; });
    return pageHead('إشعارات الطلاب وأولياء الأمور', 'سجل جولات الإشعارات الأسبوعية والفترية التي تصدرها المدرسة المركزية لكل طالب في المدارس الملحقة') +
      '<section class="block"><div class="container">' +
      '<div class="kpis" style="margin:0 0 1.2rem;grid-template-columns:repeat(4,1fr)">' +
      '<div class="kpi"><div class="n" data-count="' + N.rounds.length + '">0</div><div class="l">جولات إشعار</div></div>' +
      '<div class="kpi"><div class="n" data-count="' + total + '">0</div><div class="l">إشعارًا فرديًا</div></div>' +
      '<div class="kpi"><div class="n" data-count="3">0</div><div class="l">مدارس ملحقة</div></div>' +
      '<div class="kpi"><div class="n" data-count="' + N.messages.length + '">0</div><div class="l">مراسلة لمديري المدارس</div></div></div>' +
      '<div class="card" style="margin-bottom:1.4rem"><h3>آلية إصدار الإشعار</h3><div class="steps">' + N.process.map(function (p, i) { return '<div class="step"><span class="num">' + ar(i + 1) + '</span><span>' + esc(p) + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="sec-head"><div><h2>جولات الإشعارات</h2><p>النماذج المعروضة مأخوذة من إشعارات فعلية مع إخفاء اسم الطالب</p></div></div>' +
      '<div class="timeline">' + N.rounds.slice().reverse().map(function (r) {
        return '<div class="tl fade"><div class="card" style="display:grid;grid-template-columns:150px 1fr;gap:1rem;align-items:start">' +
          '<img src="' + esc(r.sample) + '" alt="نموذج ' + esc(r.title) + '" loading="lazy" style="border:1px solid var(--line);border-radius:8px;cursor:pointer" data-view="' + esc(r.sample) + '" data-title="نموذج: ' + esc(r.title) + ' (الاسم مخفي)">' +
          '<div><span class="pill gold">' + esc(r.when) + '</span> <small class="muted">' + esc(fdate(r.date)) + '</small><h3 style="margin-top:.4rem">' + esc(r.title) + '</h3>' +
          '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0 .6rem">' + r.contents.map(function (c) { return '<span class="pill">' + esc(c) + '</span>'; }).join('') + '</div>' +
          '<table style="font-size:.88rem"><thead><tr><th style="cursor:default">المدرسة</th><th style="cursor:default">عدد الإشعارات</th>' + (r.files ? '<th style="cursor:default">الملف (داخلي)</th>' : '') + '</tr></thead><tbody>' +
          Object.keys(SCHOOLS).map(function (k) { return '<tr><td>' + SCHOOLS[k] + '</td><td>' + ar(r.count[k] || 0) + '</td>' + (r.files ? '<td><button class="btn sm ghost" data-view="' + esc(r.files[k]) + '" data-title="' + esc(r.title + ' – ' + SCHOOLS[k]) + '">عرض</button></td>' : '') + '</tr>'; }).join('') +
          '<tr><td><b>الإجمالي</b></td><td><b>' + ar(sumCount(r)) + '</b></td>' + (r.files ? '<td></td>' : '') + '</tr></tbody></table></div></div></div>';
      }).join('') + '</div>' +
      (hasFiles ? '<div class="note" style="margin:.6rem 0 0">ملفات الإشعارات الكاملة تحتوي أسماء الطلاب ودرجاتهم، وهي للاستخدام الداخلي فقط ولا تُنشر خارج المدرسة.</div>' : '<div class="note" style="margin:.6rem 0 0">الإشعارات الفردية الكاملة محفوظة في سجلات المدرسة ولا تُعرض هنا حفاظًا على خصوصية الطلاب.</div>') +
      myStudentsBlock() +
      '<div class="sec-head" style="margin-top:2rem"><div><h2>سجل المراسلات مع المدارس الملحقة</h2></div></div><div class="table-wrap"><table><thead><tr><th style="cursor:default">التاريخ</th><th style="cursor:default">المرسل إليهم</th><th style="cursor:default">القناة</th><th style="cursor:default">مضمون الرسالة</th></tr></thead><tbody>' +
      N.messages.map(function (m) { return '<tr><td style="white-space:nowrap">' + esc(m.date) + '</td><td>' + esc(m.to) + '</td><td>' + esc(m.channel) + '</td><td>' + esc(m.text) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="sec-head" style="margin-top:2rem"><div><h2>توزيع درجات المواد – المرحلة الابتدائية</h2><p>المرجع المعتمد في إشعارات الفترة، وفق دليل توزيع درجات المواد الدراسية 2025م</p></div></div>' + gradeTable() +
      '</div></section>';
  };
  function myStudentsBlock() {
    if (!AUTH || !SES || !SES.students || !SES.students.length) return '';
    setTimeout(function () { $$('[data-sec]').forEach(function (b) { b.onclick = function () { var p = b.dataset.sec.split('|'), st = SES.students[+p[0]], n = st.notes[+p[1]]; openSecure(n.title + ' – ' + st.name, n); }; }); });
    var R = ['initial', 'week06', 'period1', 'extra', 'week11'], short = { initial: 'التقييم الأولي', week06: 'الأسبوع السادس', period1: 'الفترة الأولى', extra: 'المواد الإضافية', week11: 'الأسبوع 11' };
    return '<div class="sec-head" style="margin-top:2rem"><div><h2>' + (role() === 'teacher' ? 'إشعارات طلابي' : 'إشعارات الطلاب الفردية') + '</h2><p>' + ar(SES.students.length) + ' طالبًا — تُفتح الإشعارات مشفّرة ولا يراها إلا صاحب الصلاحية</p></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th style="cursor:default">الطالب</th><th style="cursor:default">المدرسة</th><th style="cursor:default">الصف</th>' + R.map(function (r) { return '<th style="cursor:default;text-align:center">' + short[r] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      SES.students.map(function (st, i) { return '<tr><td>' + esc(st.name) + '</td><td>' + esc(st.school) + '</td><td>' + esc(st.cls) + '</td>' + R.map(function (r) { var j = -1; st.notes.forEach(function (n, k) { if (n.round === r) j = k; }); return '<td style="text-align:center">' + (j > -1 ? '<button class="btn sm ghost" data-sec="' + i + '|' + j + '">عرض</button>' : '<span class="no">—</span>') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function gradeTable() {
    return '<div class="table-wrap"><table><thead><tr>' + ['المادة', 'نوع التقويم', 'المهام الأدائية والمشاركة', 'التقويمات خلال الفترة', 'نوعها', 'اختبار نهاية الفترة', 'المجموع', 'صفحة الدليل'].map(function (h) { return '<th style="cursor:default;white-space:normal">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      D.gradeScheme.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (i > 1 && i !== 4 ? ' style="text-align:center"' : '') + '>' + esc(typeof c === 'number' ? ar(c) : c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="muted" style="font-size:.82rem">العلامة «—» تعني أن النموذج لا يخصص اختبارًا لنهاية الفترة، وليست صفرًا.</p>';
  }

  /* ---------- Mandatory courses ---------- */
  var CKEY = 'mk-courses-v1';
  var SHORT = { media: 'الوسائط المتعددة', design: 'التصميم التعليمي', ai: 'الذكاء الاصطناعي', strategies: 'استراتيجيات التعليم الإلكتروني', elearning: 'التدريس الإلكتروني', citizenship: 'المواطنة الرقمية', critical: 'التفكير الناقد' };
  function loadCourses() { try { return JSON.parse(localStorage.getItem(CKEY)) || []; } catch (e) { return []; } }
  function saveCourses(a) { try { localStorage.setItem(CKEY, JSON.stringify(a)); return true; } catch (e) { toast('تعذّر الحفظ: مساحة المتصفح ممتلئة'); return false; } }
  function allCourses() { return D.courses.map(function (c) { return Object.assign({ builtin: true }, c); }).concat(loadCourses()); }
  function teacherCourses(tid) { return allCourses().filter(function (c) { return c.teacher === tid; }); }
  function doneKeys(tid) { var k = {}; teacherCourses(tid).forEach(function (c) { if (c.key) k[c.key] = c; }); return k; }
  function tname(id) { var t = D.teachers.filter(function (x) { return x.id === id; })[0]; return t ? t.name : id; }

  P.development = function () {
    setTimeout(function () {
      $$('[data-crs]').forEach(function (b) { b.onclick = function () { showTeacherCourses(b.dataset.crs); }; });
      if ($('#addCourse')) $('#addCourse').onclick = function () { openAddCourse(myTeacher()); };
    });
    var M = D.mandatory, total = D.teachers.length * M.length, done = 0, full = 0, pts = 0;
    var rows = D.teachers.map(function (t) {
      var k = doneKeys(t.id), n = 0;
      var cells = M.map(function (m) { if (k[m.key]) { n++; pts += m.points; return '<td style="text-align:center" title="' + esc(m.title) + '"><span class="ok">✓</span></td>'; } return '<td style="text-align:center"><span class="no">—</span></td>'; }).join('');
      done += n; if (n === M.length) full++;
      var p = Math.round(n / M.length * 100);
      return '<tr><td><button class="linkbtn" data-crs="' + t.id + '">' + esc(t.name) + '</button></td>' + cells +
        '<td style="min-width:150px"><div class="bar" style="grid-template-columns:1fr 46px"><div class="track"><div class="fill" data-w="' + p + '"></div></div><b>' + ar(p) + '٪</b></div></td></tr>';
    }).join('');
    var others = allCourses().filter(function (c) { return !c.key; });
    return pageHead('التطوير المهني ومجتمعات التعلم', 'الدورات الإلزامية لمعلمي المركزية، والدورات واللقاءات التربوية، وجلسات مجتمعات التعلم المهنية') +
      '<section class="block"><div class="container">' +
      '<div class="sec-head"><div><h2>الدورات الإلزامية لمعلمي المركزية</h2><p>سبع دورات من المعهد الوطني للتطوير المهني التعليمي مطلوبة من كل معلم مركزي (' + ar(M.reduce(function (a, m) { return a + m.points; }, 0)) + ' نقطة تطوير مهني)</p></div>' + (role() === 'teacher' || role() === 'admin' ? '<button class="btn primary" id="addCourse">＋ إضافة دورة بشهادتها</button>' : '') + '</div>' +
      '<div class="kpis" style="margin:0 0 1rem;grid-template-columns:repeat(4,1fr)">' +
      '<div class="kpi"><div class="n" data-count="' + Math.round(done / total * 100) + '">0</div><div class="l">٪ نسبة الإنجاز الكلية</div></div>' +
      '<div class="kpi"><div class="n" data-count="' + done + '">0</div><div class="l">دورة منجزة من ' + ar(total) + '</div></div>' +
      '<div class="kpi"><div class="n" data-count="' + full + '">0</div><div class="l">معلم أكمل جميع الدورات</div></div>' +
      '<div class="kpi"><div class="n" data-count="' + pts + '">0</div><div class="l">نقطة تطوير مهني منجزة</div></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">' + M.map(function (m, i) { return '<span class="pill">' + ar(i + 1) + '. ' + esc(m.title) + ' · ' + ar(m.points) + ' ن</span>'; }).join('') + '</div>' +
      '<div class="table-wrap"><table class="matrix"><thead><tr><th>المعلم</th>' + M.map(function (m) { return '<th style="text-align:center;white-space:normal;min-width:84px;font-size:.8rem;cursor:default">' + esc(SHORT[m.key]) + '</th>'; }).join('') + '<th style="cursor:default">نسبة الانتهاء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="muted" style="font-size:.85rem">اضغط اسم المعلم لعرض شهاداته. أُخفيت أرقام الهوية من صور الشهادات المنشورة.</p>' +
      '<div id="crsDetail"></div>' +
      '<div class="sec-head" style="margin-top:2rem"><div><h2>دورات ولقاءات تربوية أخرى</h2></div></div><div class="table-wrap"><table><thead><tr><th>م</th><th>البرنامج</th><th>النوع</th><th>المعلم</th><th>المدة</th><th>الشهادة</th></tr></thead><tbody>' +
      others.map(function (c, i) { return '<tr><td>' + ar(i + 1) + '</td><td>' + esc(c.title) + '<br><small class="muted">' + esc(c.issuer) + '</small></td><td><span class="pill">' + esc(c.kind || 'دورة') + '</span></td><td>' + esc(tname(c.teacher)) + '</td><td>' + esc(c.credit) + '</td><td>' + (c.file ? '<button class="btn sm ghost" data-view="' + esc(c.file) + '" data-title="' + esc(c.title) + '">عرض</button>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<div class="sec-head" style="margin-top:2rem"><div><h2>مجتمعات التعلم المهنية</h2></div></div><div class="grid g3">' +
      [{ title: 'جلسة مجتمع التعلم للمدرسة', file: 'docs/reports/week-06-plc-session.jpg', cat: 'جلسة' }, { title: 'مجتمع تعلم مهني – أ. فريح', file: 'docs/reports/week-06-plc-fraih.pdf', cat: 'محضر' }, { title: 'محضر مجتمع التعلم المهني', file: 'docs/reports/plc-minutes.pdf', cat: 'محضر' }].map(function (d) { return docCard(d); }).join('') +
      '</div></div></section>';
  };

  function showTeacherCourses(tid) {
    var list = teacherCourses(tid), k = doneKeys(tid);
    var miss = D.mandatory.filter(function (m) { return !k[m.key]; });
    $('#crsDetail').innerHTML = '<div class="card fade" style="margin-top:1rem"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem"><h3 style="margin:0">شهادات ' + esc(tname(tid)) + '</h3>' + (canEditTeacher(tid) ? '<button class="btn sm primary" id="addForT">＋ إضافة دورة لهذا المعلم</button>' : '') + '</div>' +
      (list.length ? '<div class="grid g3" style="margin-top:.8rem">' + list.map(function (c) {
        return '<div class="card media"><div class="thumb contain" style="background-image:url(\'' + esc(c.file) + '\');cursor:pointer" data-view="' + esc(c.file) + '" data-title="' + esc(c.title) + '"></div><div class="in"><span class="pill ' + (c.key ? '' : 'gold') + '">' + (c.key ? 'إلزامية' : esc(c.kind || 'دورة')) + '</span><h3 style="margin-top:.35rem;font-size:.95rem">' + esc(c.title) + '</h3><div class="meta">' + esc([c.credit, c.date ? fdate(c.date) : ''].filter(Boolean).join(' · ')) + '</div><div class="meta" style="color:var(--primary-2)">✔ ' + esc(c.verified) + '</div>' +
          (c.builtin || !canEditTeacher(c.teacher) ? '' : '<button class="btn sm danger" style="margin-top:.4rem" data-delc="' + esc(c.id) + '">حذف</button>') + '</div></div>';
      }).join('') + '</div>' : '<div class="empty" style="margin-top:.8rem">لا توجد شهادات مسجلة بعد</div>') +
      (miss.length ? '<div class="note" style="margin-top:1rem">الدورات الإلزامية المتبقية: ' + miss.map(function (m) { return esc(m.title); }).join('، ') + '</div>' : '<div class="note" style="margin-top:1rem;background:#E8F5EE;border-color:#BFE3CF;color:#155D3B">أكمل جميع الدورات الإلزامية ✔</div>') + '</div>';
    if ($('#addForT')) $('#addForT').onclick = function () { openAddCourse(tid); };
    $$('[data-delc]').forEach(function (b) { b.onclick = function () { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'تأكيد الحذف؟'; return; } saveCourses(loadCourses().filter(function (c) { return c.id !== b.dataset.delc; })); route(); setTimeout(function () { showTeacherCourses(tid); }, 50); toast('تم الحذف'); }; });
    $('#crsDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ----- certificate verification ----- */
  function norm(s) {
    return String(s || '').normalize('NFKC').replace(/[ً-ٟـ‏‎‪-‮]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[^؀-ۿa-zA-Z0-9\/\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function tokens(s) { return norm(s).split(' ').filter(function (w) { return w.length > 1 && ['بن', 'في', 'من', 'ال'].indexOf(w) < 0; }).map(function (w) { return w.replace(/^ال/, ''); }); }
  function coverage(title, text) {
    var tt = tokens(title), tx = ' ' + tokens(text).join(' ') + ' ';
    var hit = tt.filter(function (w) { return tx.indexOf(' ' + w + ' ') > -1 || tx.indexOf(w) > -1; }).length;
    return tt.length ? hit / tt.length : 0;
  }
  function fnv(bytes) { var h = 0x811c9dc5; for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  var pdfReady = null;
  function loadPdfJs() {
    if (pdfReady) return pdfReady;
    pdfReady = new Promise(function (res, rej) {
      if (window.pdfjsLib) return res(window.pdfjsLib);
      var base = EMBED ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/' : 'assets/vendor/';
      var sc = document.createElement('script'); sc.src = base + 'pdf.min.js';
      sc.onload = function () { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; } catch (e) { } res(window.pdfjsLib); };
      sc.onerror = function () { pdfReady = null; rej(new Error('pdfjs')); };
      document.head.appendChild(sc);
    });
    return pdfReady;
  }
  function canvasThumb(c) {
    var mx = 1100, sc = Math.min(1, mx / c.width), o = document.createElement('canvas');
    o.width = Math.round(c.width * sc); o.height = Math.round(c.height * sc); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', .72);
  }
  function readPdf(buf) {
    return loadPdfJs().then(function (lib) { return lib.getDocument({ data: buf }).promise; }).then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
      var vp = page.getViewport({ scale: 1.6 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      var ctx = c.getContext('2d');
      return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return page.getTextContent(); }).then(function (tc) {
        var text = rebuild(tc.items), masked = 0;
        tc.items.forEach(function (i) {
          if (/\d{10}/.test(i.str.replace(/\s/g, ''))) {
            var tr = lib2(vp.transform, i.transform), h = Math.hypot(tr[2], tr[3]) || 14, w = i.width * vp.scale;
            ctx.fillStyle = '#EEF1F0'; ctx.fillRect(Math.min(tr[4], tr[4] + w) - 6, tr[5] - h - 4, Math.abs(w) + 12, h + 10); masked++;
          }
        });
        return { text: text, thumb: canvasThumb(c), masked: masked };
      });
    });
  }
  function rebuild(items) {
    var lines = {};
    items.forEach(function (i) { if (!i.str) return; var y = Math.round(i.transform[5] / 3); (lines[y] = lines[y] || []).push(i); });
    return Object.keys(lines).sort(function (a, b) { return b - a; }).map(function (y) {
      var its = lines[y].sort(function (a, b) { return b.transform[4] - a.transform[4]; }), out = '', prev = null;
      its.forEach(function (i) {
        var fs = Math.hypot(i.transform[2], i.transform[3]) || 10;
        if (prev) { var gap = prev.transform[4] - (i.transform[4] + i.width); if (gap > fs * .2) out += ' '; }
        out += i.str; prev = i;
      });
      return out;
    }).join(' \n ');
  }
  function lib2(m1, m2) { return [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]]; }
  function readImage(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { var im = new Image(); im.onload = function () { var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); res({ text: '', thumb: canvasThumb(c), masked: 0 }); }; im.onerror = rej; im.src = r.result; }; r.onerror = rej; r.readAsDataURL(file);
    });
  }

  function verifyCert(tid, text, hash) {
    var t = D.teachers.filter(function (x) { return x.id === tid; })[0], N = norm(text), checks = [], ok = true;
    var all = allCourses();
    var dupHash = all.filter(function (c) { return c.hash === hash; })[0];
    checks.push(dupHash ? { s: 'bad', m: 'هذه الشهادة مسجلة مسبقًا (' + tname(dupHash.teacher) + ' – ' + dupHash.title + ')' } : { s: 'ok', m: 'الشهادة غير مكررة' });
    if (dupHash) ok = false;
    var readable = tokens(text).length > 8 && /[؀-ۿ]/.test(N);
    if (!readable) return { readable: false, ok: ok, checks: checks };
    var nameTok = tokens(t.name), nameHit = nameTok.filter(function (w) { return N.indexOf(w) > -1; }).length;
    if (nameHit === nameTok.length) checks.push({ s: 'ok', m: 'اسم المعلم مطابق: ' + t.name });
    else { checks.push({ s: 'bad', m: 'اسم المعلم «' + t.name + '» غير موجود في الشهادة' }); ok = false; }
    var niepd = N.indexOf(norm('المعهد الوطني للتطوير المهني')) > -1;
    checks.push(niepd ? { s: 'ok', m: 'الجهة المانحة: المعهد الوطني للتطوير المهني التعليمي' } : { s: 'warn', m: 'الجهة المانحة ليست المعهد الوطني — تُسجّل دورة غير إلزامية' });
    var kind = /شهاده (اتمام|حضور|اكمال)/.test(N);
    checks.push(kind ? { s: 'ok', m: 'نوع الوثيقة: شهادة إتمام/حضور' } : { s: 'warn', m: 'لم يُعثر على عبارة «شهادة إتمام»' });
    var best = null, bestScore = 0;
    D.mandatory.forEach(function (m) { var sc = coverage(m.title, text); if (sc > bestScore) { bestScore = sc; best = m; } });
    var match = niepd && bestScore >= .85 ? best : null;
    if (match) {
      var prev = doneKeys(tid)[match.key];
      if (prev) { checks.push({ s: 'bad', m: 'دورة «' + match.title + '» مسجلة مسبقًا لهذا المعلم' }); ok = false; }
      else checks.push({ s: 'ok', m: 'الدورة الإلزامية: ' + match.title });
    } else checks.push({ s: 'warn', m: 'لم تطابق أيًّا من الدورات الإلزامية السبع' });
    var dm = text.match(/(20\d\d)\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/), pm = N.match(/(\d+)\s*(نقاط|نقطه|ساعه|ساعات)/);
    var date = dm ? dm[1] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[3]).slice(-2) : '';
    if (date) checks.push({ s: 'ok', m: 'تاريخ الشهادة: ' + date });
    if (pm) checks.push({ s: 'ok', m: 'المدة المعتمدة: ' + pm[1] + ' ' + pm[2].replace('نقطه', 'نقطة').replace('ساعه', 'ساعة') });
    var tm = N.match(/بعنوان\s*(.{4,80}?)\s*(المقدم|المنعقد|بواقع|بعدد|في تاريخ)/);
    return { readable: true, ok: ok, checks: checks, match: match, date: date, credit: pm ? pm[1] + ' ' + pm[2].replace('نقطه', 'نقطة').replace('ساعه', 'ساعة') : '', title: match ? match.title : (tm ? tm[1] : ''), issuer: niepd ? 'المعهد الوطني للتطوير المهني التعليمي' : '' };
  }

  function openAddCourse(tid) {
    openModal('إضافة دورة بشهادتها', null, true);
    $('#mBody').innerHTML = '<form id="cForm">' +
      '<div class="form-row"><label for="cT">المعلم *</label><select class="input" id="cT">' + D.teachers.filter(function (t) { return canEditTeacher(t.id); }).map(function (t) { return '<option value="' + t.id + '"' + (t.id === tid ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-row"><label for="cF">شهادة الدورة (PDF أو صورة) *</label><input class="input" type="file" id="cF" accept=".pdf,image/*" required></div>' +
      '<div id="cRes"></div>' +
      '<div style="display:flex;gap:.5rem;margin-top:.6rem"><button class="btn primary" type="submit" id="cSave" disabled>حفظ الدورة</button><button class="btn ghost" type="button" id="cCancel">إلغاء</button></div></form>';
    var state = null;
    $('#cCancel').onclick = closeModal;
    function run() {
      var f = $('#cF').files[0]; if (!f) return;
      var t = $('#cT').value; $('#cSave').disabled = true;
      $('#cRes').innerHTML = '<div class="muted">جارٍ قراءة الشهادة والتحقق منها…</div>';
      f.arrayBuffer().then(function (buf) {
        var hash = fnv(new Uint8Array(buf));
        var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
        return (isPdf ? readPdf(buf.slice(0)) : readImage(f)).then(function (r) { r.hash = hash; return r; });
      }).then(function (r) {
        var v = verifyCert(t, r.text, r.hash); state = { r: r, v: v, t: t };
        var icon = { ok: '✔', warn: '⚠', bad: '✖' }, col = { ok: '#1B8354', warn: '#9A6B12', bad: '#B3261E' };
        var html = '<div class="card" style="padding:.8rem;margin:.4rem 0"><img src="' + r.thumb + '" alt="" style="max-height:170px;margin:auto;border:1px solid var(--line);border-radius:6px">' + (r.masked ? '<p class="muted" style="font-size:.8rem;text-align:center;margin:.3rem 0 0">أُخفي رقم الهوية من الصورة المحفوظة</p>' : '') + '</div>';
        html += '<div style="display:grid;gap:.3rem;margin:.5rem 0">' + v.checks.map(function (c) { return '<div style="color:' + col[c.s] + ';font-size:.9rem">' + icon[c.s] + ' ' + esc(c.m) + '</div>'; }).join('') + '</div>';
        if (!v.readable) {
          html += '<div class="note">تعذّر قراءة نص الشهادة آليًا (صورة أو خط محمي). أكمل التحقق اليدوي بمطابقة الصورة أعلاه:</div>' +
            ['اسم المعلم في الشهادة يطابق «' + tname(t) + '»', 'الجهة المانحة جهة رسمية معتمدة', 'عنوان الدورة مطابق لما سأختاره أدناه', 'الشهادة مكتملة (تاريخ ومدة ومعرّف/ختم)'].map(function (m, i) { return '<label style="display:flex;gap:.5rem;align-items:center;margin:.35rem 0"><input type="checkbox" class="mchk"> ' + esc(m) + '</label>'; }).join('');
        }
        if (v.ok) {
          html += '<div class="form-row" style="margin-top:.6rem"><label for="cK">الدورة</label><select class="input" id="cK">' + D.mandatory.map(function (m) { return '<option value="' + m.key + '"' + (v.match && v.match.key === m.key ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('') + '<option value=""' + (v.readable && !v.match ? ' selected' : '') + '>دورة/لقاء آخر (غير إلزامي)</option></select></div>' +
            '<div class="form-row" id="cOtherRow"><label for="cTitle">عنوان الدورة</label><input class="input" id="cTitle" value="' + esc(v.title || '') + '"></div>' +
            '<div class="grid g2"><div class="form-row"><label for="cDate">التاريخ</label><input class="input" type="date" id="cDate" value="' + esc(v.date || '') + '"></div><div class="form-row"><label for="cCredit">النقاط/الساعات</label><input class="input" id="cCredit" value="' + esc(v.credit || '') + '" placeholder="مثال: 12 نقطة"></div></div>';
        } else html += '<div class="note" style="background:#FDECEA;border-color:#F3C2BD;color:#8C1D18">لا يمكن إضافة هذه الشهادة. راجع الملاحظات أعلاه.</div>';
        $('#cRes').innerHTML = html;
        function gate() {
          var manualOk = v.readable || $$('.mchk').every(function (x) { return x.checked; });
          var k = $('#cK') ? $('#cK').value : '';
          if ($('#cOtherRow')) $('#cOtherRow').style.display = k ? 'none' : '';
          var dupKey = k && doneKeys(t)[k];
          $('#cSave').disabled = !(v.ok && manualOk && !dupKey && (k || ($('#cTitle') && $('#cTitle').value.trim())));
          if (dupKey) toast('هذه الدورة مسجلة مسبقًا لهذا المعلم');
          if (v.readable && v.match && k && k !== v.match.key) { $('#cSave').disabled = true; toast('الدورة المختارة لا تطابق عنوان الشهادة'); }
        }
        $$('.mchk').forEach(function (x) { x.onchange = gate; });
        if ($('#cK')) { $('#cK').onchange = gate; $('#cTitle').oninput = gate; }
        gate();
      }).catch(function (e) {
        $('#cRes').innerHTML = '<div class="note">تعذّر فتح الملف. تأكد أنه PDF أو صورة سليمة.</div>';
      });
    }
    $('#cF').onchange = run; $('#cT').onchange = function () { if ($('#cF').files[0]) run(); };
    $('#cForm').onsubmit = function (e) {
      e.preventDefault(); if (!state || $('#cSave').disabled) return;
      var k = $('#cK').value, m = D.mandatory.filter(function (x) { return x.key === k; })[0];
      var rec = { id: 'c' + Date.now(), teacher: state.t, key: k, title: m ? m.title : $('#cTitle').value.trim(), credit: $('#cCredit').value.trim(), date: $('#cDate').value, issuer: state.v.issuer || '', kind: 'دورة', file: state.r.thumb, hash: state.r.hash, verified: state.v.readable ? 'تحقق آلي: مطابقة الاسم والجهة والعنوان' : 'تحقق يدوي بمطابقة صورة الشهادة' };
      var arr = loadCourses(); arr.push(rec);
      if (saveCourses(arr)) { closeModal(); toast('تمت إضافة الدورة بعد التحقق'); if ((location.hash || '') === '#development') { route(); setTimeout(function () { showTeacherCourses(rec.teacher); }, 60); } }
    };
  }

  P.schedules = function () {
    return libraryPage('الجداول والاختبارات', 'جداول الحصص الأسبوعية وجداول اختبارات المدارس الملحقة', D.schedules);
  };

  P.contact = function () {
    return pageHead('تواصل معنا') + '<section class="block"><div class="container grid g2">' +
      '<div class="card"><h3>بيانات المدرسة</h3><table><tbody>' +
      [['الاسم', D.school.name], ['الجهة', D.school.region], ['قائد المدرسة', 'أ. ' + D.school.principal], ['وكيل المدرسة', 'أ. ' + D.school.deputy], ['منصة التعلم', 'منصة مدرستي']].map(function (r) { return '<tr><td class="muted">' + r[0] + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') +
      '</tbody></table><a class="btn primary" style="margin-top:1rem" href="https://madrasati.sa" target="_blank" rel="noopener">الدخول إلى منصة مدرستي ↗</a></div>' +
      '<div class="card"><h3>استفسار</h3><p class="muted">يُكتب الاستفسار هنا ثم يُنسخ لإرساله عبر قنوات المدرسة الرسمية.</p><div class="form-row"><label for="cn">الاسم</label><input class="input" id="cn"></div><div class="form-row"><label for="cm">الاستفسار</label><textarea class="input" id="cm"></textarea></div><button class="btn primary" id="copyMsg">نسخ الرسالة</button></div>' +
      '</div></section>';
  };

  P.search = function (q) {
    q = (q || '').trim();
    var pool = [];
    if (AUTH && !isStaff()) { D.guides.filter(function (d) { return d.cat === 'أدلة الطالب والأسرة' || d.cat === 'أدلة الموجهين'; }).forEach(function (d) { pool.push({ t: d.title, s: 'الأدلة', d: d }); }); D.schedules.forEach(function (d) { pool.push({ t: d.title, s: 'الجداول', d: d }); }); D.initiatives.forEach(function (i) { pool.push({ t: i.title + ' ' + i.desc, s: 'المبادرات', href: '#initiatives', title: i.title }); }); D.activities.forEach(function (a) { pool.push({ t: a.title + ' ' + a.desc, s: 'الأنشطة', href: '#activities', title: a.title }); }); }
    else {
    D.guides.forEach(function (d) { pool.push({ t: d.title, s: 'الأدلة', d: d }); });
    D.circulars.forEach(function (d) { pool.push({ t: d.title, s: 'التعاميم', d: d }); });
    D.reports.forEach(function (r) { r.files.forEach(function (d) { pool.push({ t: d.title, s: 'التقارير – ' + r.week, d: d }); }); });
    D.analysis.concat(D.adminDocs, D.schedules, D.development).forEach(function (d) { pool.push({ t: d.title + ' ' + (d.source || ''), s: d.cat, d: d }); });
    D.initiatives.forEach(function (i) { pool.push({ t: i.title + ' ' + i.desc, s: 'المبادرات', href: '#initiatives', title: i.title }); });
    D.activities.forEach(function (a) { pool.push({ t: a.title + ' ' + a.desc, s: 'الأنشطة', href: '#activities', title: a.title }); });
    }
    var words = q.split(/\s+/).filter(Boolean);
    var res = words.length ? pool.filter(function (p) { return words.every(function (w) { return p.t.indexOf(w) > -1; }); }) : [];
    return pageHead('نتائج البحث', q ? 'عن: «' + q + '» — ' + ar(res.length) + ' نتيجة' : 'اكتب كلمة في مربع البحث') +
      '<section class="block"><div class="container grid g2">' + (res.length ? res.map(function (r) {
        return r.d ? '<div>' + docCard(r.d) + '<small class="muted">القسم: ' + esc(r.s) + '</small></div>' : '<a class="card link" href="' + r.href + '"><h3>' + esc(r.title) + '</h3><span class="pill">' + esc(r.s) + '</span></a>';
      }).join('') : '<div class="empty">لا توجد نتائج</div>') + '</div></section>';
  };

  /* ---------- Evidence center ---------- */
  function loadUser() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch (e) { return []; } }
  function saveUser(a) { try { localStorage.setItem(LS_KEY, JSON.stringify(a)); return true; } catch (e) { toast('تعذّر الحفظ: المساحة ممتلئة. استخدم روابط بدل الصور الكبيرة.'); return false; } }
  var TARGET = 3;
  var evTeacher = null;

  function allEvidence(tid) {
    var base = D.evidence.filter(function (e) { return e.teacher === tid; }).map(function (e) { return Object.assign({ builtin: true }, e); });
    var user = loadUser().filter(function (e) { return e.teacher === tid; });
    var uc = loadCourses().filter(function (c) { return c.teacher === tid; }).map(function (c) { return { builtin: true, teacher: tid, std: D.standards[1], title: 'دورة ' + c.title, file: c.file, date: c.date }; });
    return base.concat(uc, user);
  }

  P.evidence = function (tid) {
    evTeacher = tid || evTeacher || myTeacher() || D.teachers[0].id;
    setTimeout(drawEvidence);
    return pageHead('مركز توثيق الشواهد', 'ملف إنجاز رقمي لكل معلم مصنّف وفق عناصر تقويم الأداء الوظيفي، مع إضافة الشواهد وتصدير ملف الإنجاز للطباعة') +
      '<section class="block"><div class="container ev-layout">' +
      '<aside class="card"><h3>المعلمون</h3><div class="tlist" id="tlist"></div>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:1rem 0"><div style="display:grid;gap:.4rem">' +
      '<button class="btn ghost sm" id="evExport">⬇ نسخة احتياطية (JSON)</button><label class="btn ghost sm" style="justify-content:center">⬆ استيراد نسخة<input type="file" id="evImport" accept=".json" hidden></label></div>' +
      '<p class="muted" style="font-size:.78rem;margin-top:.8rem">الشواهد التي تضيفها تُحفظ في هذا المتصفح فقط. خذ نسخة احتياطية دوريًا، واستوردها على أي جهاز آخر.</p></aside>' +
      '<div id="evMain"></div></div></section>';
  };

  function drawEvidence() {
    var tl = $('#tlist'); if (!tl) return;
    tl.innerHTML = D.teachers.map(function (t) {
      var n = allEvidence(t.id).length;
      return '<button data-t="' + t.id + '" class="' + (t.id === evTeacher ? 'on' : '') + '"><span class="avatar">' + esc(initials(t.name)) + '</span><span style="flex:1"><b style="display:block;font-size:.92rem">' + esc(t.name) + '</b><small class="muted">' + esc(t.subject) + '</small></span><span class="pill">' + ar(n) + '</span></button>';
    }).join('');
    $$('#tlist button').forEach(function (b) { b.onclick = function () { evTeacher = b.dataset.t; history.replaceState(null, '', '#evidence-' + evTeacher); drawEvidence(); }; });

    var t = D.teachers.filter(function (x) { return x.id === evTeacher; })[0];
    var items = allEvidence(t.id);
    var covered = D.standards.filter(function (s) { return items.some(function (e) { return e.std === s; }); }).length;
    var pct = Math.round(covered / D.standards.length * 100);
    $('#evMain').innerHTML =
      '<div class="card fade" style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem"><div class="ring" style="--p:' + pct + '"><span>' + ar(pct) + '٪</span></div>' +
      '<div style="flex:1;min-width:220px"><h2 style="margin:0;font-size:1.3rem">' + esc(t.name) + '</h2><div class="muted">' + esc(t.subject) + ' · ' + esc(t.role) + '</div><div style="margin-top:.4rem">' + ar(items.length) + ' شاهدًا · ' + ar(covered) + ' من ' + ar(D.standards.length) + ' عنصرًا مغطّى</div></div>' +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' + (canEditTeacher(t.id) ? '<button class="btn primary" id="evAdd">＋ إضافة شاهد</button>' : '<span class="pill">عرض فقط</span>') + '<button class="btn gold" id="evPrint">🖨 تصدير ملف الإنجاز</button></div></div>' +
      D.standards.map(function (s, i) {
        var its = items.filter(function (e) { return e.std === s; });
        var p = Math.min(100, Math.round(its.length / TARGET * 100));
        return '<details class="std" ' + (its.length ? 'open' : '') + '><summary><span class="num">' + ar(i + 1) + '</span><b>' + esc(s) + '</b><span class="prog ' + (its.length >= TARGET ? 'done' : '') + '"><span class="track"><span class="fill" style="display:block;width:' + p + '%"></span></span>' + ar(its.length) + '/' + ar(TARGET) + '</span></summary><div class="items">' +
          (its.length ? its.map(function (e) {
            return '<div class="ev-item"><span>' + (isImg(e.file) ? '🖼' : (e.file ? '📄' : '📝')) + '</span><div class="t"><b style="font-size:.92rem">' + esc(e.title) + '</b>' + (e.desc ? '<div class="muted" style="font-size:.83rem">' + esc(e.desc) + '</div>' : '') + '<div class="muted" style="font-size:.78rem">' + esc(fdate(e.date)) + ' <span class="pill tag ' + (e.builtin ? '' : 'gold') + '">' + (e.builtin ? 'من أرشيف المدرسة' : 'مُضاف') + '</span></div></div>' +
              (e.file ? '<button class="btn sm ghost" data-view="' + esc(e.file) + '" data-title="' + esc(e.title) + '">عرض</button>' : '') +
              (e.builtin || !canEditTeacher(t.id) ? '' : '<button class="btn sm danger" data-del="' + esc(e.id) + '" aria-label="حذف">حذف</button>') + '</div>';
          }).join('') : '<div class="muted" style="font-size:.88rem;padding:.3rem 0">لا توجد شواهد بعد' + (canEditTeacher(t.id) ? ' — <a href="javascript:void 0" data-addstd="' + esc(s) + '">أضف شاهدًا</a>' : '') + '</div>') +
          '</div></details>';
      }).join('');
    if ($('#evAdd')) $('#evAdd').onclick = function () { openAdd(); };
    $$('[data-addstd]').forEach(function (a) { a.onclick = function () { openAdd(a.dataset.addstd); }; });
    $$('[data-del]').forEach(function (b) { b.onclick = function () { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'تأكيد الحذف؟'; return; } saveUser(loadUser().filter(function (e) { return e.id !== b.dataset.del; })); drawEvidence(); toast('تم الحذف'); }; });
    $('#evPrint').onclick = function () { printPortfolio(t, items); };
    $('#evExport').onclick = function () {
      var blob = new Blob([JSON.stringify(loadUser(), null, 1)], { type: 'application/json' });
      if (EMBED) { var txt = JSON.stringify(loadUser()); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('نُسخت النسخة الاحتياطية — الصقها في ملف نصي واحفظه'); }, function () { toast('تعذّر النسخ'); }); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shawahid-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    };
    $('#evImport').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { var arr = JSON.parse(r.result); if (!Array.isArray(arr)) throw 0; var cur = loadUser(), ids = cur.map(function (x) { return x.id; }); arr.forEach(function (x) { if (ids.indexOf(x.id) < 0) cur.push(x); }); if (saveUser(cur)) { drawEvidence(); toast('تم استيراد ' + arr.length + ' شاهدًا'); } } catch (er) { toast('ملف غير صالح'); } };
      r.readAsText(f);
    };
  }

  function openAdd(std) {
    var t = D.teachers.filter(function (x) { return x.id === evTeacher; })[0];
    openModal('إضافة شاهد — ' + t.name, null, true);
    $('#mBody').innerHTML = '<form id="addForm">' +
      '<div class="form-row"><label for="fTitle">عنوان الشاهد *</label><input class="input" id="fTitle" required placeholder="مثال: تنفيذ استراتيجية التعلم التعاوني"></div>' +
      '<div class="form-row"><label for="fStd">عنصر التقويم *</label><select class="input" id="fStd">' + D.standards.map(function (s, i) { return '<option ' + (s === std ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-row"><label for="fDate">التاريخ</label><input class="input" type="date" id="fDate" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
      '<div class="form-row"><label for="fDesc">الوصف</label><textarea class="input" id="fDesc" placeholder="وصف مختصر لما تم تنفيذه وأثره"></textarea></div>' +
      '<div class="form-row"><label for="fLink">رابط الشاهد (اختياري)</label><input class="input" id="fLink" type="url" placeholder="https://… رابط ملف في OneDrive أو Google Drive"></div>' +
      '<div class="form-row"><label for="fImg">أو صورة الشاهد (اختياري، تُضغط تلقائيًا)</label><input class="input" id="fImg" type="file" accept="image/*"><img id="fPrev" alt="" style="max-height:140px;margin-top:.4rem;display:none;border-radius:8px"></div>' +
      '<div style="display:flex;gap:.5rem"><button class="btn primary" type="submit">حفظ الشاهد</button><button class="btn ghost" type="button" id="fCancel">إلغاء</button></div></form>';
    var imgData = '';
    $('#fImg').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        var im = new Image(); im.onload = function () {
          var mx = 1000, sc = Math.min(1, mx / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = im.width * sc; c.height = im.height * sc; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          imgData = c.toDataURL('image/jpeg', .72); $('#fPrev').src = imgData; $('#fPrev').style.display = 'block';
        }; im.src = r.result;
      }; r.readAsDataURL(f);
    };
    $('#fCancel').onclick = closeModal;
    $('#addForm').onsubmit = function (e) {
      e.preventDefault();
      var item = { id: 'u' + Date.now(), teacher: evTeacher, std: $('#fStd').value, title: $('#fTitle').value.trim(), date: $('#fDate').value, desc: $('#fDesc').value.trim(), file: imgData || $('#fLink').value.trim() };
      if (!item.title) return;
      var arr = loadUser(); arr.push(item);
      if (saveUser(arr)) { closeModal(); drawEvidence(); toast('تم حفظ الشاهد'); }
    };
  }

  function printPortfolio(t, items) {
    var base = location.href.replace(/#.*$/, '').replace(/[^\/]*$/, '');
    var w = EMBED ? null : window.open('', '_blank');
    var hd = '<div class="hd"><div><b>المملكة العربية السعودية</b><br>وزارة التعليم<br>' + esc(D.school.region) + '<br>' + esc(D.school.name) + '</div><img src="assets/img/logo.jpg"><div style="text-align:left">العام الدراسي ' + esc(D.school.year) + '<br>' + esc(D.school.term) + '</div></div>';
    var body = '<section class="cover">' + hd + '<div class="ct"><h1>ملف الإنجاز الوظيفي</h1><h2>' + esc(t.name) + '</h2><p>' + esc(t.subject) + ' — ' + esc(t.role) + '</p><p>عدد الشواهد: ' + items.length + '</p></div></section>';
    body += '<section>' + hd + '<h2>فهرس عناصر التقويم</h2><table><tr><th>م</th><th>العنصر</th><th>عدد الشواهد</th></tr>' + D.standards.map(function (s, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(s) + '</td><td>' + items.filter(function (e) { return e.std === s; }).length + '</td></tr>'; }).join('') + '</table></section>';
    D.standards.forEach(function (s, i) {
      var its = items.filter(function (e) { return e.std === s; }); if (!its.length) return;
      its.forEach(function (e) {
        body += '<section>' + hd + '<div class="std">العنصر ' + (i + 1) + ': ' + esc(s) + '</div><h3>' + esc(e.title) + '</h3><p class="m">' + esc(fdate(e.date)) + '</p>' + (e.desc ? '<p>' + esc(e.desc) + '</p>' : '') +
          (isImg(e.file) ? '<img class="ev" src="' + esc(e.file) + '">' : (e.file ? '<p>الشاهد (ملف): <a href="' + esc(/^https?:|^data:/.test(e.file) ? e.file : base + e.file) + '">' + esc(/^https?:/.test(e.file) ? e.file : base + e.file) + '</a></p>' : '')) +
          '<div class="sig"><div>المعلم<br><b>' + esc(t.name) + '</b></div><div>قائد المدرسة<br><b>' + esc(D.school.principal) + '</b><br><img src="assets/img/signature.png" style="height:50px"></div><div><img src="assets/img/stamp.png" style="height:90px"></div></div></section>';
      });
    });
    var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="' + base + '"><title>ملف إنجاز – ' + esc(t.name) + '</title><style>' +
      '@page{size:A4;margin:14mm}body{font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;color:#1F2A2E;margin:0}section{page-break-after:always;min-height:260mm;position:relative}' +
      '.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0F5C4E;padding-bottom:8px;margin-bottom:18px;font-size:12px}.hd img{height:64px}' +
      '.cover .ct{text-align:center;margin-top:60mm}.cover h1{color:#0F5C4E;font-size:34px;margin:0}.cover h2{font-size:26px;margin:14px 0 6px}.cover .ct::after{content:"";display:block;width:120px;height:4px;background:#B8975A;margin:18px auto}' +
      'table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd8d5;padding:8px;font-size:13px}th{background:#EAF3F0;color:#0F5C4E}' +
      '.std{background:#0F5C4E;color:#fff;padding:6px 12px;border-radius:6px;display:inline-block;font-size:13px}.m{color:#5E6B73;font-size:12px}img.ev{max-width:100%;max-height:150mm;display:block;margin:10px auto;border:1px solid #ddd}' +
      '.sig{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;align-items:end;font-size:13px;text-align:center}</style></head><body>' + body +
      (w ? '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>' : '') + '</body></html>';
    if (w) { w.document.write(html); w.document.close(); return; }
    openModal('ملف الإنجاز — ' + t.name, null, false);
    $('#mBody').innerHTML = '<div class="note" style="margin:.6rem">للطباعة أو الحفظ PDF افتح الموقع من نسخة المجلد على الحاسب.</div><iframe style="height:calc(100% - 60px)" title="ملف الإنجاز"></iframe>';
    $('#mBody iframe').srcdoc = html;
  }

  /* ---------- modal ---------- */
  function openModal(title, file, small) {
    $('#mTitle').textContent = title || '';
    $('#modalBox').classList.toggle('small', !!small);
    $('#mBody').className = 'mb' + (small ? ' pad' : '');
    $('#mDl').style.display = $('#mOpen').style.display = file && !/^data:/.test(file) ? '' : 'none';
    if (file) {
      $('#mDl').href = file; $('#mOpen').href = file;
      $('#mBody').innerHTML = isImg(file) ? '<div style="display:flex;height:100%;padding:1rem"><img src="' + esc(file) + '" alt="' + esc(title) + '"></div>' : (/^https?:/.test(file) ? '<div class="empty" style="margin:2rem">رابط خارجي: <a href="' + esc(file) + '" target="_blank" rel="noopener">' + esc(file) + '</a></div>' : '<iframe src="' + esc(file) + '" title="' + esc(title) + '"></iframe>');
    }
    $('#modal').classList.add('open'); document.body.style.overflow = 'hidden';
  }
  function closeModal() { $('#modal').classList.remove('open'); $('#mBody').innerHTML = ''; document.body.style.overflow = ''; }
  $('#mClose').onclick = closeModal;
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]');
    if (v) { e.preventDefault(); openModal(v.dataset.title, v.dataset.view); }
    if (!e.target.closest('#more')) $('#more').classList.remove('open');
    if (e.target.id === 'copyMsg') {
      var txt = 'الاسم: ' + $('#cn').value + '\nالاستفسار: ' + $('#cm').value;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('تم النسخ'); }, function () { toast('انسخ النص يدويًا'); });
    }
  });

  /* ---------- router ---------- */
  var lastQ = '';
  function route() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (h === 'home') h = '';
    var i = h.indexOf('-'), key = i > -1 ? h.slice(0, i) : h, arg = i > -1 ? h.slice(i + 1) : '';
    if (key === 'search') arg = lastQ;
    if (AUTH && !SES) { showLogin(); return; }
    var fn = P[key] || P[''];
    app.innerHTML = allowed(key) ? fn(arg) : pageHead('لا تملك صلاحية', 'هذا القسم متاح لمنسوبي المدرسة فقط') + '<section class="block"><div class="container"><div class="empty">سجّل الدخول بصفة مناسبة للوصول إلى هذا القسم. <a href="javascript:void 0" id="reLogin">تسجيل الدخول</a></div></div></section>';
    if ($('#reLogin')) $('#reLogin').onclick = logout;
    $$('nav.main a').forEach(function (a) { a.classList.toggle('active', a.dataset.r === key); });
    $('#nav').classList.remove('open');
    window.scrollTo(0, 0);
    animate();
    var titles = { about: 'عن المدرسة', guides: 'الأدلة', circulars: 'التعاميم', reports: 'التقارير', stats: 'المؤشرات', activities: 'الأنشطة', initiatives: 'المبادرات', evidence: 'توثيق الشواهد', achievements: 'الإنجازات', development: 'التطوير المهني', schedules: 'الجداول', contact: 'تواصل معنا', search: 'بحث', notifications: 'إشعارات الطلاب' };
    document.title = (titles[key] ? titles[key] + ' — ' : '') + D.school.name;
  }
  window.addEventListener('hashchange', route);

  /* ---------- chrome ---------- */
  $('#burger').onclick = function () { $('#nav').classList.toggle('open'); };
  $('#more > button').onclick = function (e) { e.stopPropagation(); $('#more').classList.toggle('open'); };
  $('#searchForm').onsubmit = function (e) { e.preventDefault(); lastQ = $('#q').value; if (location.hash === '#search') route(); else location.hash = '#search'; };
  $('#themeBtn').onclick = function () { var d = document.documentElement, n = d.dataset.theme === 'dark' ? '' : 'dark'; d.dataset.theme = n; try { localStorage.setItem('mk-theme', n); } catch (e) { } };
  function fs(delta) { var cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 16; var n = Math.max(13, Math.min(21, cur + delta)); document.documentElement.style.setProperty('--fs', n + 'px'); try { localStorage.setItem('mk-fs', n); } catch (e) { } }
  $('#fsUp').onclick = function () { fs(1); }; $('#fsDown').onclick = function () { fs(-1); };
  try { $('#today').textContent = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { }

  if (AUTH && SES) applyRole();
  route();
})();
