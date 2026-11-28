/* جدول الحصص وتوقيت اليوم الدراسي — المدرسة المركزية للبنين بحائل · الفصل الأول 1448هـ
   المصدر: إعدادات الجدول الدراسي في منصة مدرستي (بداية اليوم 7:45، 7 حصص × 35 دقيقة،
   فرق 10 دقائق بين الحصص، راحة 10 دقائق، نشاط 10 دقائق) + جداول الصفوف الأسبوعية.
   لتعديل التوقيت: غيّر قيم from/to في bell فقط. */
window.TIMETABLE = {
  days: [0, 1, 2, 3, 4], /* الأحد=0 … الخميس=4 (حسب getDay) */
  dayNames: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  bell: [
    { p: 1, name: 'الحصة الأولى', from: '07:45', to: '08:20' },
    { gap: 1, name: 'انتقال', from: '08:20', to: '08:30' },
    { p: 2, name: 'الحصة الثانية', from: '08:30', to: '09:05' },
    { gap: 1, name: 'انتقال', from: '09:05', to: '09:15' },
    { p: 3, name: 'الحصة الثالثة', from: '09:15', to: '09:50' },
    { brk: 'rest', name: 'الراحة', from: '09:50', to: '10:00' },
    { p: 4, name: 'الحصة الرابعة', from: '10:00', to: '10:35' },
    { gap: 1, name: 'انتقال', from: '10:35', to: '10:45' },
    { p: 5, name: 'الحصة الخامسة', from: '10:45', to: '11:20' },
    { brk: 'activity', name: 'حصة النشاط', from: '11:20', to: '11:30' },
    { p: 6, name: 'الحصة السادسة', from: '11:30', to: '12:05' },
    { gap: 1, name: 'انتقال', from: '12:05', to: '12:15' },
    { p: 7, name: 'الحصة السابعة', from: '12:15', to: '12:50' }
  ],
  teachers: {
    hulail: 'محمد هليل الشمري', khalaf: 'خلف خليف الشمري', fraih: 'فريح عبدالله الشمري', sayer: 'ساير فايز الشمري',
    mamdouh: 'ممدوح خويلد الدحيلان', falah: 'فلاح مرضي الشمري', eyadah: 'محمد عيادة الشمري', waleed: 'وليد براك الشمري', mutni: 'مطني ناجي الشمري'
  },
  /* لكل صف: خمسة أيام (الأحد→الخميس)، وكل يوم سبع حصص: [المادة، رمز المعلم] أو null */
  grades: {
    4: { name: 'الصف الرابع', cls: 'رابع-1', days: [
      [['علوم','waleed'],['رياضيات','fraih'],['إنجليزي','eyadah'],['المهارات الرقمية','hulail'],['اللغة العربية','mamdouh'],['الدراسات الإسلامية','falah'],['فنية','hulail']],
      [['رياضيات','fraih'],['علوم','waleed'],['الدراسات الإسلامية','falah'],['اجتماعيات','mutni'],['اللغة العربية','mamdouh'],['إنجليزي','eyadah'],null],
      [['الدراسات الإسلامية','falah'],['رياضيات','fraih'],['اللغة العربية','mamdouh'],['علوم','waleed'],['المهارات الرقمية','hulail'],['إنجليزي','eyadah'],null],
      [['الدراسات الإسلامية','falah'],['اللغة العربية','mamdouh'],['اجتماعيات','mutni'],['رياضيات','fraih'],['التربية البدنية','mutni'],['مهارات حياتية','sayer'],null],
      [['الدراسات الإسلامية','falah'],['رياضيات','fraih'],['رياضيات','fraih'],['علوم','waleed'],['التربية البدنية','mutni'],['اللغة العربية','mamdouh'],null]
    ] },
    5: { name: 'الصف الخامس', cls: 'خامس-1', days: [
      [['اللغة العربية','mamdouh'],['Top Goal 2','eyadah'],['الدراسات الإسلامية','falah'],['رياضيات','fraih'],['المهارات الرقمية','hulail'],['فنية','hulail'],['مهارات حياتية','sayer']],
      [['علوم','waleed'],['الدراسات الإسلامية','falah'],['اجتماعيات','mutni'],['رياضيات','fraih'],['رياضيات','fraih'],['اللغة العربية','mamdouh'],null],
      [['Top Goal 2','eyadah'],['اللغة العربية','mamdouh'],['الدراسات الإسلامية','falah'],['رياضيات','fraih'],['رياضيات','fraih'],['علوم','waleed'],null],
      [['علوم','waleed'],['رياضيات','fraih'],['Top Goal 2','eyadah'],['الدراسات الإسلامية','falah'],['اللغة العربية','mamdouh'],['التربية البدنية','mutni'],null],
      [['علوم','waleed'],['اجتماعيات','mutni'],['المهارات الرقمية','hulail'],['اللغة العربية','mamdouh'],['الدراسات الإسلامية','falah'],['التربية البدنية','mutni'],null]
    ] },
    6: { name: 'الصف السادس', cls: 'سادس-1', days: [
      [['Top Goal 3','eyadah'],['اللغة العربية','sayer'],['رياضيات','khalaf'],['علوم','waleed'],['الدراسات الإسلامية','falah'],['اجتماعيات','mutni'],['التربية البدنية','mutni']],
      [['الدراسات الإسلامية','falah'],['رياضيات','khalaf'],['اللغة العربية','sayer'],['مهارات حياتية','sayer'],['علوم','waleed'],['التربية البدنية','mutni'],null],
      [['رياضيات','khalaf'],['المهارات الرقمية','hulail'],['Top Goal 3','eyadah'],['اللغة العربية','sayer'],['علوم','waleed'],['الدراسات الإسلامية','falah'],null],
      [['رياضيات','khalaf'],['اجتماعيات','mutni'],['علوم','waleed'],['اللغة العربية','sayer'],['الدراسات الإسلامية','falah'],['فنية','hulail'],null],
      [['المهارات الرقمية','hulail'],['اللغة العربية','sayer'],['Top Goal 3','eyadah'],['رياضيات','khalaf'],['رياضيات','khalaf'],['الدراسات الإسلامية','falah'],null]
    ] }
  }
};

/* أدوات مشتركة للشاشة وصفحة «جدولي» */
window.TT = (function () {
  var T = window.TIMETABLE;
  function mins(s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; }
  function nowMin(d) { return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
  function dayIdx(d) { var g = d.getDay(); return T.days.indexOf(g); } /* -1 = عطلة */
  function cell(grade, di, p) { var g = T.grades[grade]; return g && g.days[di] ? g.days[di][p - 1] || null : null; }
  function lastPeriod(di) { var m = 0; Object.keys(T.grades).forEach(function (k) { T.grades[k].days[di].forEach(function (c, i) { if (c) m = Math.max(m, i + 1); }); }); return m; }
  function slots(di) { /* جرس اليوم بعد حذف ما بعد آخر حصة */
    var last = lastPeriod(di), out = [];
    for (var i = 0; i < T.bell.length; i++) { var b = T.bell[i]; if (b.p && b.p > last) break; out.push(b); }
    while (out.length && !out[out.length - 1].p) out.pop();
    return out;
  }
  function state(d) {
    var di = dayIdx(d), t = nowMin(d);
    if (di < 0) return { kind: 'off', di: di };
    var sl = slots(di);
    if (!sl.length) return { kind: 'off', di: di };
    if (t < mins(sl[0].from)) return { kind: 'before', di: di, next: sl[0], until: mins(sl[0].from) - t, slots: sl };
    for (var i = 0; i < sl.length; i++) {
      var b = sl[i], f = mins(b.from), e = mins(b.to);
      if (t >= f && t < e) {
        var nx = null; for (var j = i + 1; j < sl.length; j++) if (sl[j].p) { nx = sl[j]; break; }
        return { kind: b.p ? 'period' : 'break', di: di, cur: b, left: e - t, len: e - f, next: nx, until: nx ? mins(nx.from) - t : null, slots: sl };
      }
    }
    return { kind: 'after', di: di, slots: sl };
  }
  function teacherDay(tid, di) {
    var out = [];
    Object.keys(T.grades).forEach(function (g) {
      T.grades[g].days[di].forEach(function (c, i) { if (c && c[1] === tid) out.push({ p: i + 1, grade: +g, subj: c[0], cls: T.grades[g].cls }); });
    });
    return out.sort(function (a, b) { return a.p - b.p; });
  }
  function bellOf(p) { for (var i = 0; i < T.bell.length; i++) if (T.bell[i].p === p) return T.bell[i]; return null; }
  return { T: T, mins: mins, nowMin: nowMin, dayIdx: dayIdx, cell: cell, slots: slots, state: state, teacherDay: teacherDay, bellOf: bellOf };
})();
