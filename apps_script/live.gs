/**
 * Данные для живой страницы «Психостоматология вживую» (data/live.json).
 *
 * Читает таблицу чатов (лист «Сообщения», «Чемпионат_лог») и таблицу эфиров
 * (все листы-месяцы) и отдаёт по ссылке веб-приложения ТОЛЬКО:
 *   - ники-псевдонимы (из списков POOLS ниже), пол для цвета, зубы, старый/текущий;
 *   - короткие фразы из чата (мат и восклицания) без имён, ников и ссылок;
 *   - фразы «точки Б» из постов тренеров с тегом #точкаБ;
 *   - короткие перепалки двух людей и реплики бота.
 * Настоящие имена и ники Telegram используются внутри для сопоставления и
 * наружу не уходят. Последняя защита: любая фраза, где встречается настоящее
 * имя или ник, выбрасывается.
 *
 * Установка: apps_script/README.md. ID таблиц и соль вписываются только в
 * копию скрипта в Google, в репозитории остаются заглушки.
 */
var CONFIG = {
  CHATS_ID: 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ_ЧАТОВ',
  EFIRY_ID: 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ_ЭФИРОВ',
  // случайная строка: от неё зависит, какой ник у кого. Сменить = все ники перемешаются.
  SALT: 'ВСТАВЬТЕ_СЛУЧАЙНУЮ_СТРОКУ',
  TZ: 'Europe/Moscow',
  GROUP: 'Исцеление отношений',
  ACTIVE_DAYS: 30,
  QUOTE_DAYS: 180,
  MSG_SHEET: 'Сообщения',
  CHAMP_SHEET: 'Чемпионат_лог'
};

// Ники. Те же списки читает scripts/fetch_live.py: ник не из списка не пройдёт проверку.
var POOLS = {
  f: ['Паулетта', 'Хуетта', 'Жоржетта', 'Розетта', 'Мариэтта', 'Бернадетта', 'Кончита', 'Пепита', 'Хуанита', 'Николетта', 'Лауретта', 'Каролетта', 'Мерседес', 'Габриэлла', 'Анхелита', 'Долорес', 'Эсмеральда', 'Пилар', 'Химена', 'Лупита', 'Марисоль', 'Росита', 'Палома', 'Консуэла', 'Хосефина', 'Эсперанса', 'Флоренсия', 'Касандра', 'Лусия', 'Соледад', 'Ампаро', 'Аурелия', 'Беатрис', 'Кармелита', 'Клементина', 'Доминга', 'Эулалия', 'Фелисидад', 'Грасиела', 'Исабелита', 'Хасинта', 'Леонор', 'Макарена', 'Нативидад', 'Перлита', 'Ремедиос', 'Сусанита', 'Тринидад', 'Урсулина', 'Ханита', 'Жозефина', 'Фернанда', 'Чикита', 'Пакита', 'Ракель', 'Марибель'],
  m: ['Хуанито', 'Педрито', 'Панчо', 'Рикардо', 'Лоренцо', 'Густаво', 'Бенито', 'Родриго', 'Сантьяго', 'Фернандо', 'Альфонсо', 'Эрнесто', 'Мигелито', 'Хорхе', 'Диего', 'Рамон', 'Эмилио', 'Фелипе', 'Гонсало', 'Игнасио', 'Хоакин', 'Леандро', 'Мануэло', 'Начо', 'Орасио', 'Пако', 'Рафаэль', 'Тито', 'Умберто', 'Висенте', 'Хавьер', 'Альберто', 'Карлито', 'Эстебан', 'Фаусто', 'Херардо', 'Исидро', 'Хасинто', 'Лусиано', 'Марсело', 'Норберто', 'Октавио', 'Пруденсио', 'Кирино', 'Рамиро', 'Сальвадор', 'Теодоро', 'Уго', 'Вальдо', 'Хенаро', 'Аурелио', 'Бальтасар', 'Касимиро', 'Доминго', 'Энрике', 'Фабрисио', 'Гаспар'],
  u: ['Санчес', 'Гонсалес', 'Родригес', 'Мендес', 'Лопес', 'Перес', 'Мартинес', 'Эрнандес', 'Рамирес', 'Торрес', 'Флорес', 'Ривера', 'Гомес', 'Диас', 'Крус', 'Моралес', 'Ортис', 'Гутьеррес', 'Чавес', 'Рамос']
};

var MONTHS = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'];
// уменьшительные из таблицы эфиров → полное имя, как в чате
var DIM = { 'аня': 'анна', 'анюта': 'анна', 'серега': 'сергей', 'сережа': 'сергей', 'оля': 'ольга', 'лера': 'валерия', 'ксюха': 'ксения', 'ксюша': 'ксения', 'таня': 'татьяна', 'маша': 'мария', 'катя': 'екатерина', 'женя': 'евгения', 'саша': 'александра', 'наташа': 'наталья', 'юля': 'юлия', 'настя': 'анастасия', 'лена': 'елена', 'света': 'светлана', 'рита': 'маргарита', 'дима': 'дмитрий', 'миша': 'михаил', 'паша': 'павел', 'вова': 'владимир', 'рома': 'роман', 'леша': 'алексей', 'антоша': 'антон', 'юлька': 'юлия', 'янка': 'яна', 'светуля': 'светлана', 'светка': 'светлана', 'ира': 'ирина', 'нати': 'наталья', 'натали': 'наталья', 'наташка': 'наталья', 'танюша': 'татьяна', 'маринка': 'марина', 'анька': 'анна', 'сашка': 'александра', 'людочка': 'людмила', 'люда': 'людмила' };
var MALE_A = { 'илья': 1, 'никита': 1, 'серега': 1, 'дима': 1, 'миша': 1, 'паша': 1, 'вова': 1, 'рома': 1, 'леша': 1, 'лева': 1, 'гоша': 1, 'кузьма': 1, 'фома': 1, 'лука': 1, 'антоша': 1, 'nikita': 1, 'ilya': 1 };
var UNISEX = { 'саша': 1, 'женя': 1, 'валя': 1, 'пользователь': 1, 'sasha': 1 };
// служебные пометки в ячейках эфиров, а не люди
var EFIR_JUNK = /занято|эфир|очеред|будет|приходите|медит|медиид|медииа|бронь|отмен|перенос|свободн|резерв/;
var MAT = /(?:ху[йеёяи]|пизд|бля|(?<![а-яё])(?:[её]бан|[её]бат|[её]бал|[её]бу|[её]бл|[её]би|ёб)|(?:за|на|у|вы|от|отъ|до|про|при|по|под|раз|съ)[её]б|сука|суки|сучк|жоп|говн|дерьм|залуп|муда[кч]|мудил|херн|хрен|нахер|похер|охуе|сран|срал|задолба)/i;

function doGet() {
  var body;
  try {
    body = buildLive_(readInput_(), Date.now(), CONFIG.SALT, hashGs_);
    delete body._debug;
  } catch (err) {
    body = { error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** Запустите вручную в редакторе: в журнале будут только цифры и ники, без настоящих имён. */
function testLive() {
  var out = buildLive_(readInput_(), Date.now(), CONFIG.SALT, hashGs_);
  Logger.log(JSON.stringify({
    updated: out.updated, stats: out.stats,
    teeth_people: out.people.filter(function (p) { return p.t.length; }).length,
    sample: out.people.slice(0, 5).map(function (p) { return { n: p.n, t: p.t, old: p.old, q: p.q.length, b: p.b.length }; })
  }, null, 2));
}

/**
 * Отладка сопоставления. В журнале будут НАСТОЯЩИЕ имена: только для вас,
 * никуда не копируйте журнал публично. Наружу (doGet) это не отдаётся.
 */
function debugLive() {
  var out = buildLive_(readInput_(), Date.now(), CONFIG.SALT, hashGs_);
  var d = out._debug;
  Logger.log('Из эфиров не нашлись в чате (' + d.unmatched.length + '):\n' + d.unmatched.join('\n'));
  Logger.log('Тёзки, выбран первый (' + d.ambiguous.length + '):\n' + d.ambiguous.join('\n'));
  Logger.log('Клиенты из отчётов ЗКФ без пары в чате (' + d.reportMiss.length + '):\n' + d.reportMiss.join('\n'));
  var rows = readInput_().msgs, cT = col_(rows[0], 'Текст'), ex = [];
  for (var i = rows.length - 1; i > 0 && ex.length < 5; i--) if (/Зуб/i.test(rows[i][cT]) && !/Клиент/i.test(rows[i][cT])) ex.push(String(rows[i][cT]).slice(0, 200));
  Logger.log('Примеры сообщений со словом «Зуб», которые не похожи на отчёт:\n' + ex.join('\n---\n'));
  var ex2 = [];
  for (var j = rows.length - 1; j > 0 && ex2.length < 5; j--) if (/Клиент/i.test(rows[j][cT])) ex2.push(String(rows[j][cT]).slice(0, 300));
  Logger.log('Последние сообщения со словом «Клиент»:\n' + ex2.join('\n---\n'));
}

function hashGs_(s) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return (((d[0] & 255) << 24) >>> 0) + ((d[1] & 255) << 16) + ((d[2] & 255) << 8) + (d[3] & 255);
}

function readInput_() {
  var chats = SpreadsheetApp.openById(CONFIG.CHATS_ID);
  var msgs = chats.getSheetByName(CONFIG.MSG_SHEET).getDataRange().getDisplayValues();
  var ch = chats.getSheetByName(CONFIG.CHAMP_SHEET);
  var champ = ch ? ch.getDataRange().getDisplayValues() : [];
  var now = new Date();
  var cur = MONTHS[+Utilities.formatDate(now, CONFIG.TZ, 'M') - 1] + ' ' + Utilities.formatDate(now, CONFIG.TZ, 'yyyy');
  var months = SpreadsheetApp.openById(CONFIG.EFIRY_ID).getSheets().map(function (s) {
    return { name: s.getName().replace(/\s+/g, ' ').trim().toUpperCase(), display: s.getDataRange().getDisplayValues() };
  });
  // ALIASES — второй файл проекта «Прозвища.gs» (шаблон apps_script/aliases.example.gs); его может не быть
  return { msgs: msgs, champ: champ, months: months, current: cur, aliases: typeof ALIASES !== 'undefined' ? ALIASES : {} };
}

// ---------- чистая логика (её же гоняет test/run.js в node) ----------

function norm_(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

var TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
function translit_(s) { return s.split('').map(function (c) { return TR[c] != null ? TR[c] : c; }).join(''); }
function latVariants_(s) {
  var a = translit_(s);
  var b = a.replace(/ya/g, 'ia').replace(/yu/g, 'iu').replace(/y$/, 'i').replace(/ey/g, 'ei').replace(/kh/g, 'h');
  var c = a.replace(/ey$/, 'ii').replace(/g/g, 'h');
  return [a, b, c].filter(function (x, i, arr) { return arr.indexOf(x) === i; });
}
function lev1_(a, b) { // расстояние Левенштейна не больше 1
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  var i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}

function parseDT_(s) {
  var m = /(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(String(s || ''));
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], (+(m[4] || 12)) - 3, +(m[5] || 0)) : null;
}

function col_(header, name) {
  for (var i = 0; i < header.length; i++) if (String(header[i]).trim().toLowerCase() === name.toLowerCase()) return i;
  throw new Error('Нет колонки «' + name + '»');
}

function genderOf_(first) {
  if (!first) return 'u';
  if (UNISEX[first]) return 'u';
  if (MALE_A[first]) return 'm';
  return /(?:а|я|a|ya)$/.test(first) ? 'f' : 'm';
}

/** Имена в ячейках таблицы эфиров: ячейка справа от времени «10:15». */
function efirNames_(display) {
  var out = {};
  for (var r = 0; r < display.length; r++) {
    for (var c = 0; c + 1 < display[r].length; c++) {
      if (!/^\s*\d{1,2}:\d{2}\s*$/.test(display[r][c])) continue;
      String(display[r][c + 1] || '').split(',').forEach(function (p) {
        var n = norm_(p);
        if (n && n.length >= 3 && !EFIR_JUNK.test(n) && !MAT.test(n)) out[n] = 1;
      });
    }
  }
  return Object.keys(out);
}

/** Фраза годится для бабла: короткая, без ссылок, ников, телефонов и чужих имён посреди фразы. */
function clean_(t, maxLen) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t.length < 6 || t.length > (maxLen || 110)) return null;
  if (/https?:|www\.|@\w|#|\d{5,}/.test(t)) return null;
  if (/[^.!?…]\s[А-ЯЁA-Z][а-яёa-z]+/.test(t.replace(/^[^А-ЯЁA-Zа-яёa-z]+/, ''))) return null; // Имя посреди фразы
  return t;
}

function buildLive_(inp, nowMs, salt, hash) {
  var DAY = 864e5;
  var rows = inp.msgs, H = rows[0] || [];
  var cD = col_(H, 'Дата'), cG = col_(H, 'Группа'), cA = col_(H, 'Автор'), cU = col_(H, 'Username'), cT = col_(H, 'Текст');

  // тренеры: роль «тренер» в Чемпионат_лог
  var trainers = {};
  if (inp.champ && inp.champ.length) {
    var ch = inp.champ[0], iu = col_(ch, 'Username'), ir = col_(ch, 'Роль');
    inp.champ.slice(1).forEach(function (r) { if (/тренер/i.test(r[ir])) trainers[String(r[iu]).replace(/^@/, '').toLowerCase()] = 1; });
  }

  var P = {}, list = [], botLines = [], seq = [], reports = [], pointB = [], selfTeeth = {}, nickTeeth = {};
  var stats = { efir_unmatched: 0, efir_ambiguous: 0, reports: 0, reports_matched: 0, point_b: 0, point_b_matched: 0, zub_msgs: 0, self_teeth: 0, nick_teeth: 0 };
  var debug = { unmatched: [], ambiguous: [], reportMiss: [] }; // только для debugLive, наружу не уходит
  var real = {}; // настоящие имена и ники: для последней проверки
  function person(key, author, user) {
    if (P[key]) return P[key];
    var toks = norm_(author).split(' ').filter(Boolean);
    var p = { key: key, toks: toks, user: user, first: toks[0] || '', firstMs: Infinity, last: 0, q: [], b: [], teeth: [], efirNow: false, efirPast: false };
    toks.slice(0, 2).forEach(function (t) { if (t.length >= 3) real[t] = 1; }); // имя и фамилия, без «терапевт для женщин»
    if (user) real[user] = 1;
    P[key] = p; list.push(p);
    return p;
  }

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i], ms = parseDT_(r[cD]), author = String(r[cA] || '').trim(), user = String(r[cU] || '').replace(/^@/, '').trim().toLowerCase();
    var text = String(r[cT] || '');
    // отчёты ЗКФ: «Клиент: #Яна шер | 🦷 Зуб: 47» или зуб на следующей строке; от людей и от ботов
    if (/Зуб/i.test(text)) stats.zub_msgs++;
    var reRep = /Клиент\s*:\s*#?\s*([^|\n]+?)\s*(?:\||\n)[\s\S]{0,200}?Зуб[а-яё]*\s*:?\s*([^\n]+)/gi, rep;
    while ((rep = reRep.exec(text))) {
      var th = rep[2].match(/\b[1-4][1-8]\b/g) || [];
      if (th.length) reports.push({ ms: ms, name: rep[1], teeth: th });
    }
    var reNick = /@([A-Za-z0-9_]{3,})\s+([1-4][1-8])\s*-?\s*(?:[а-яё]{1,3}\s+)?зуб/gi, nm;
    while ((nm = reNick.exec(text))) {
      var nu = nm[1].toLowerCase();
      nickTeeth[nu] = nickTeeth[nu] || {};
      nickTeeth[nu][nm[2]] = (nickTeeth[nu][nm[2]] || 0) + 1;
      stats.nick_teeth++;
    }
    var isBot = /bot$/i.test(user) || /бот|джузеппе|giuseppe/i.test(author);
    if (isBot) { botLines.push({ ms: ms, text: text }); continue; }
    if (!author || (author === 'Telegram' && !user)) continue;
    // свой зуб в собственных сообщениях: «у меня 46-й ноет», «зуб 21», «мой клык 43»
    if (!/Клиент/i.test(text)) {
      var reSelf = /(?:зуб|клык|резец|моляр|премоляр)[а-яё]*[^.!?\n\d]{0,20}?\b([1-4][1-8])\b|\b([1-4][1-8])\s*-?\s*(?:й|ой|ый|ом|ого|ым)?\s+(?:зуб|клык|резец|моляр)/gi, sm;
      var sk = user ? 'u:' + user : 'a:' + norm_(author);
      while ((sm = reSelf.exec(text))) {
        var st = sm[1] || sm[2];
        selfTeeth[sk] = selfTeeth[sk] || {};
        selfTeeth[sk][st] = (selfTeeth[sk][st] || 0) + 1;
      }
    }
    // точка Б: пост тренера с тегом #точкаБ, строки «@ник — фраза»
    if (trainers[user] && /#точка\s*б/i.test(text)) {
      text.split('\n').forEach(function (line) {
        var m = /@([A-Za-z0-9_]{3,})\s*[:—–-]\s*(.+)$/.exec(line);
        if (m) pointB.push({ ms: ms, user: m[1].toLowerCase(), text: m[2] });
      });
      continue;
    }
    if (String(r[cG]).trim() !== CONFIG.GROUP) continue;
    var p = person(user ? 'u:' + user : 'a:' + norm_(author), author, user);
    if (ms) { p.firstMs = Math.min(p.firstMs, ms); p.last = Math.max(p.last, ms); }
    if (ms && nowMs - ms <= CONFIG.QUOTE_DAYS * DAY) p.q.push({ ms: ms, text: text });
    seq.push({ ms: ms, p: p, text: text });
  }

  // сопоставление имени из эфиров или отчёта с человеком из чата
  stats.reports = reports.length; stats.point_b = pointB.length;
  var memo = {};
  function match(name, create) {
    var toks = norm_(name).split(' ').filter(Boolean);
    if (!toks.length) return null;
    var mk = toks.join(' ') + '|' + (create ? 1 : 0);
    if (memo[mk] !== undefined) return memo[mk];
    return (memo[mk] = matchNew(toks, create));
  }
  var aliases = {};
  Object.keys(inp.aliases || {}).forEach(function (k) { aliases[norm_(k)] = String(inp.aliases[k] || '').trim(); });
  function matchNew(toks, create) {
    // прозвище из словаря: «янка панамка» → @ник или другое имя
    var al = aliases[toks.join(' ')];
    if (al) {
      if (al.charAt(0) === '@') {
        var u = al.slice(1).toLowerCase(), byUser = list.filter(function (p) { return p.user === u; })[0];
        if (byUser) return byUser;
      } else if (norm_(al) !== toks.join(' ')) {
        return match(al, create);
      }
    }
    var first = toks[0], canon = DIM[first] || first, rest = toks[1] || '';
    var lats = latVariants_(canon);
    function hit(p) {
      if (p.toks.indexOf(canon) >= 0 || p.toks.indexOf(first) >= 0) return true;
      return lats.some(function (l) { return l.length >= 3 && (p.toks.indexOf(l) >= 0 || (p.user && p.user.indexOf(l) === 0)); });
    }
    var cands = list.filter(hit);
    if (!cands.length && canon.length >= 5) { // опечатка: «камила», «калилла»
      cands = list.filter(function (p) { return p.toks.some(function (t) { return t.length >= 5 && lev1_(t, canon); }); });
    }
    if (rest && cands.length > 1) {
      var rl = translit_(rest);
      // сначала по фамилии в имени автора, и только если не вышло, по нику
      var byTok = cands.filter(function (p) { return p.toks.some(function (t) { return t !== canon && t !== first && t.indexOf(rest) === 0; }); });
      cands = byTok.length ? byTok : cands.filter(function (p) {
        if (!p.user) return false;
        if (rl.length >= 2 && p.user.indexOf(rl) >= 0) return true;
        // «аня к» → annakuslieva: после имени в нике идёт буква фамилии
        return lats.some(function (l) { var u = p.user.replace(/[_.\d]/g, ''); return u.indexOf(l) === 0 && u.slice(l.length).indexOf(rl) === 0; });
      });
    }
    if (cands.length > 1) {
      // несколько тёзок: сначала тот, у кого имя стоит первым словом («Яна» лучше «Иванова Яна»), потом кто писал позже
      var firstPos = cands.filter(function (p) { return p.toks[0] === canon || p.toks[0] === first; });
      if (firstPos.length) cands = firstPos;
      cands.sort(function (a, b) { return (b.last || 0) - (a.last || 0); });
      stats.efir_ambiguous++;
      debug.ambiguous.push(toks.join(' ') + ' → ' + cands.map(function (p) { return p.toks.join(' ') + (p.user ? ' @' + p.user : ''); }).join(' | '));
      return cands[0];
    }
    if (cands.length === 1) return cands[0];
    if (!create) { debug.reportMiss.push(toks.join(' ')); return null; }
    stats.efir_unmatched++;
    debug.unmatched.push(toks.join(' '));
    var p = person('e:' + toks.join(' '), canon + (rest ? ' ' + rest : ''), '');
    p.first = canon;
    return p;
  }

  inp.months.forEach(function (m) {
    efirNames_(m.display).forEach(function (n) {
      var parts = [n], toks = n.split(' ');
      if (toks.length === 2 && toks[1].length >= 3 && !match(n, false) && match(toks[0], false) && match(toks[1], false)) parts = toks;
      parts.forEach(function (x) {
        var p = match(x, true);
        if (m.name === inp.current) p.efirNow = true; else p.efirPast = true;
      });
    });
  });

  reports.sort(function (a, b) { return (b.ms || 0) - (a.ms || 0); });
  reports.forEach(function (rp) {
    var p = match(rp.name, false);
    if (!p) return;
    stats.reports_matched++;
    rp.teeth.forEach(function (t) { if (p.teeth.indexOf(t) < 0 && p.teeth.length < 4) p.teeth.push(t); });
  });

  // «@ник 43 зуб — пыхтение»: зуб привязан к нику напрямую
  list.forEach(function (p) {
    var c = p.user && nickTeeth[p.user];
    if (!c) return;
    Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (t) { if (p.teeth.indexOf(t) < 0 && p.teeth.length < 4) p.teeth.push(t); });
  });

  // нет ни отчёта, ни ника: берём зубы, которые человек сам называл хотя бы дважды
  list.forEach(function (p) {
    var c = selfTeeth[p.key];
    if (p.teeth.length || !c) return;
    Object.keys(c).filter(function (t) { return c[t] >= 2; }).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 2)
      .forEach(function (t) { p.teeth.push(t); });
    if (p.teeth.length) stats.self_teeth++;
  });

  pointB.forEach(function (b) {
    var p = list.filter(function (x) { return x.user === b.user; })[0];
    if (p) { p.b.push(b); stats.point_b_matched++; }
  });

  // кто на площадке: текущие (эфир в этом месяце, чат за 30 дней, тренеры) и старые
  var people = list.filter(function (p) { return p.last || p.efirNow || p.efirPast; });
  people.forEach(function (p) {
    p.tr = !!(p.user && trainers[p.user]);
    p.old = !(p.tr || p.efirNow || (p.last && nowMs - p.last <= CONFIG.ACTIVE_DAYS * DAY));
    p.g = genderOf_(p.first);
  });

  // ники: стабильно по соли, старшие участники выбирают первыми
  var realNames = Object.keys(real).concat(people.map(function (p) { return p.first; }));
  var banned = {};
  realNames.forEach(function (t) { banned[t] = 1; });
  people.sort(function (a, b) { return (a.firstMs === Infinity ? 9e15 : a.firstMs) - (b.firstMs === Infinity ? 9e15 : b.firstMs) || (a.key < b.key ? -1 : 1); });
  var used = {};
  people.forEach(function (p) {
    var pool = POOLS[p.g].filter(function (n) { return !banned[norm_(n)]; });
    var h = hash(salt + '|' + p.key), round = 0, k = h % pool.length, tries = 0, name;
    while (true) {
      name = pool[k] + (round ? ' ' + (round + 1) : '');
      if (!used[name]) break;
      k = (k + 1) % pool.length;
      if (++tries >= pool.length) { tries = 0; round++; }
    }
    used[name] = 1; p.n = name;
  });

  // последняя защита от настоящих имён и ников во фразах
  var stems = realNames.filter(function (t) { return t && t.length >= 3; }).map(function (t) { return t.length >= 5 ? t.slice(0, -1) : t; });
  function safe(t) {
    var w = norm_(t).split(' ');
    for (var i = 0; i < w.length; i++) {
      for (var j = 0; j < stems.length; j++) if (w[i] === stems[j] || (stems[j].length >= 4 && w[i].indexOf(stems[j]) === 0)) return false;
    }
    return true;
  }
  function pick(arr, maxLen, cap) {
    var out = [], seen = {};
    arr.map(function (x) { return { ms: x.ms || 0, t: clean_(x.text, maxLen) }; })
      .filter(function (x) { return x.t && safe(x.t); })
      .sort(function (a, b) { return (MAT.test(b.t) - MAT.test(a.t)) || (/!/.test(b.t) - /!/.test(a.t)) || b.ms - a.ms; })
      .forEach(function (x) { if (out.length < cap && !seen[x.t]) { seen[x.t] = 1; out.push(x.t); } });
    return out;
  }
  function pickChat(arr) { // в чате берём только мат и восклицания
    return pick(arr.filter(function (x) { return MAT.test(x.text) || /!/.test(x.text); }), 110, 20);
  }

  // порядок на сайте перемешан, чтобы место не выдавало человека
  people.sort(function (a, b) { return (a.old - b.old) || (hash(salt + '#' + a.key) - hash(salt + '#' + b.key)); });
  var idx = new Map();
  people.forEach(function (p, i) { idx.set(p, i); });

  // перепалки: двое по очереди, не дольше 5 минут между репликами
  var fights = [];
  seq.sort(function (a, b) { return (a.ms || 0) - (b.ms || 0); });
  for (var s = 0; s + 1 < seq.length; s++) {
    var A = seq[s].p, B = seq[s + 1].p;
    if (A === B || !seq[s].ms || !idx.has(A) || !idx.has(B)) continue;
    var lines = [], e = s;
    while (e < seq.length && lines.length < 4 && seq[e].p === (lines.length % 2 ? B : A) && (e === s || seq[e].ms - seq[e - 1].ms <= 5 * 60e3)) {
      var t = clean_(seq[e].text, 90);
      if (!t || !safe(t)) break;
      lines.push([idx.get(seq[e].p), t]);
      e++;
    }
    if (lines.length >= 2 && lines.some(function (l) { return MAT.test(l[1]) || /!/.test(l[1]); })) { fights.push(lines); s = e - 1; }
  }
  fights = fights.slice(-40);

  var bot = pick(botLines.reduce(function (acc, x) {
    String(x.text).split(/(?<=[.!?…])\s+/).forEach(function (t) { acc.push({ ms: x.ms, text: t }); });
    return acc;
  }, []), 120, 30);

  return {
    updated: new Date(nowMs).toISOString().slice(0, 16) + 'Z',
    people: people.map(function (p) {
      return { n: p.n, g: p.g, t: p.teeth, old: p.old, tr: p.tr, q: pickChat(p.q), b: pick(p.b, 160, 10) };
    }),
    fights: fights,
    bot: bot,
    stats: stats,
    _debug: debug // doGet его вырезает
  };
}
