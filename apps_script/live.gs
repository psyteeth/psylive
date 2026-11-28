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
  // таблица «Участники психостоматологии»: зубы, согласие на показ, коммуникации (пусто = не читать)
  PEOPLE_ID: 'ВСТАВЬТЕ_ID_ТАБЛИЦЫ_УЧАСТНИКОВ',
  // случайная строка: от неё зависит, какой ник у кого. Сменить = все ники перемешаются.
  SALT: 'ВСТАВЬТЕ_СЛУЧАЙНУЮ_СТРОКУ',
  TZ: 'Europe/Moscow',
  GROUP: 'Исцеление отношений',
  ACTIVE_DAYS: 30,
  QUOTE_DAYS: 180,
  MSG_SHEET: 'Сообщения',
  CHAMP_SHEET: 'Чемпионат_лог',
  // полный список имён и фамилий участников: всё отсюда вырезается из фраз
  STATS_SHEET: 'СР_Статистика',
  // true: люди из эфиров, которых нет в чате и в словаре прозвищ, тоже стоят на площадке; false: их нет
  KEEP_UNMATCHED_EFIR: false,
  // чьи сообщения — реплики бота на площадке (имя автора или ник). Остальные боты игнорируются.
  BOT_MATCH: /джузеппе|giuseppe/i,
  // диалоги из чата в базовом блоке не показываем (часто непонятны без контекста);
  // диалоги будут «коммуникациями» с ответами из точки А и точки Б
  CHAT_SCENES: false,
  // базовый блок фраз: что звучит на площадке (разметка владельца 21.11.2026).
  // keep — берём, maybe — берём, но ниже в очереди, drop — не берём (кроме PHRASE_KEEP в «Прозвищах»)
  BLOCKS: {
    keep: ['heavy', 'rage', 'result', 'sex', 'teeth', 'school', 'clash', 'question'],
    maybe: ['self', 'complain'],
    drop: ['logistics', 'warm', 'family', 'work', 'jabfun', 'laugh', 'react', 'other']
  }
};

// Ники. Те же списки читает scripts/fetch_live.py: ник не из списка не пройдёт проверку.
var POOLS = {
  f: ['Паулетта', 'Хуетта', 'Жоржетта', 'Розетта', 'Мариэтта', 'Бернадетта', 'Кончита', 'Пепита', 'Хуанита', 'Николетта', 'Лауретта', 'Каролетта', 'Мерседес', 'Габриэлла', 'Анхелита', 'Долорес', 'Эсмеральда', 'Пилар', 'Химена', 'Лупита', 'Марисоль', 'Росита', 'Палома', 'Консуэла', 'Хосефина', 'Эсперанса', 'Флоренсия', 'Касандра', 'Лусия', 'Соледад', 'Ампаро', 'Аурелия', 'Беатрис', 'Кармелита', 'Клементина', 'Доминга', 'Эулалия', 'Фелисидад', 'Грасиела', 'Исабелита', 'Хасинта', 'Леонор', 'Макарена', 'Нативидад', 'Перлита', 'Ремедиос', 'Сусанита', 'Тринидад', 'Урсулина', 'Ханита', 'Жозефина', 'Фернанда', 'Чикита', 'Пакита', 'Ракель', 'Марибель', 'Милана'],
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
// личные данные во фразах
var PERSONAL = /(?:^|[^а-яё])(?:улиц[аеуы]|ул\.|проспект|пр-т|дом\s*\d|кв\.|квартир[аеуы]\s*\d|телефон|номер\s+(?:карты|телефона)|карт[ауы]\s+\d|сбер|тинькофф|т-банк|альфа-?банк|паспорт|снилс|e-?mail|почт[ауы]\s)/i;
// слово с заглавной буквы на типичное окончание фамилии (в любом падеже)
var SURNAME = /(?:^|[^А-ЯЁа-яё])[А-ЯЁ][а-яё]{2,}(?:ов|ев|ёв|ин|ын|ск|цк|енк|ук|юк|ян|швил|дз|ович|евич|овн|евн)(?:а|у|ым|ой|ом|е|ых|им|ого|ому|ий|ая|ую|ие|о)?(?![а-яё])/;
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
  Logger.log('Кто какой ник:\n' + d.nicks.join('\n'));
  Logger.log('Боты в чатах (реплики берутся только у тех, кто подходит под CONFIG.BOT_MATCH):\n' +
    Object.keys(d.bots).map(function (k) { return k + ' — ' + d.bots[k].n + ' сообщ., пример: ' + d.bots[k].ex; }).join('\n'));
  Logger.log('Реплики бота на площадке (' + out.bot.length + '):\n' + out.bot.join('\n'));
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
  var st = chats.getSheetByName(CONFIG.STATS_SHEET), people = [];
  if (st) {
    var sv = st.getDataRange().getDisplayValues(), ni = sv.length ? sv[0].map(function (h) { return String(h).trim().toLowerCase(); }).indexOf('имя') : -1;
    if (ni >= 0) people = sv.slice(1).map(function (r) { return r[ni]; });
  }
  var now = new Date();
  var cur = MONTHS[+Utilities.formatDate(now, CONFIG.TZ, 'M') - 1] + ' ' + Utilities.formatDate(now, CONFIG.TZ, 'yyyy');
  var months = SpreadsheetApp.openById(CONFIG.EFIRY_ID).getSheets().map(function (s) {
    return { name: s.getName().replace(/\s+/g, ' ').trim().toUpperCase(), display: s.getDataRange().getDisplayValues() };
  });
  // ALIASES — второй файл проекта «Прозвища.gs» (шаблон apps_script/aliases.example.gs); его может не быть
  var ptPeople = [], ptComm = [], ptCards = [];
  if (CONFIG.PEOPLE_ID && CONFIG.PEOPLE_ID.indexOf('ВСТАВЬТЕ') < 0) {
    var pt = SpreadsheetApp.openById(CONFIG.PEOPLE_ID);
    var su = pt.getSheetByName('Участники'), sc = pt.getSheetByName('Коммуникации');
    if (su) ptPeople = su.getDataRange().getDisplayValues();
    if (sc) ptComm = sc.getDataRange().getDisplayValues();
    ptCards = cardsSheet_(pt).getDataRange().getDisplayValues();
  }
  return { ptPeople: ptPeople, ptComm: ptComm, ptCards: ptCards, msgs: msgs, champ: champ, months: months, current: cur, aliases: typeof ALIASES !== 'undefined' ? ALIASES : {},
    nicks: typeof NICKS !== 'undefined' ? NICKS : {}, exclude: typeof EXCLUDE !== 'undefined' ? EXCLUDE : [],
    names: people, hide: typeof HIDE !== 'undefined' ? HIDE : [], pinned: typeof PINNED !== 'undefined' ? PINNED : {}, merge: typeof MERGE !== 'undefined' ? MERGE : {},
    phraseKeep: typeof PHRASE_KEEP !== 'undefined' ? PHRASE_KEEP : [], phraseDrop: typeof PHRASE_DROP !== 'undefined' ? PHRASE_DROP : [] };
}

// Вкладка «Карточки» в таблице участников: одна строка = участник + зуб. Если вкладки нет — создаём с шапкой и подсказками.
var CARD_COLS = ['ник_tg', 'зуб', 'триггер', 'точка_А', 'точка_Б', 'все_СП', 'все_АЖ', 'ОЧЛ', 'дофаминовая_ID', 'опасная_ID', 'зачем_зуб', 'залупа', 'путь_роста'];
var CARD_HINTS = ['@ник как в «Участниках»', '43', 'кто/что запускает', 'как сейчас', 'куда идём', 'все спарринг-партнёры', 'все альфа-жертвы', 'ОЧЛ',
  'дофаминовая идентичность', 'опасная идентичность', '(письки-зубы) зачем нужен зуб', '(сокровенная) залупа', 'путь роста: успехи общими словами, каждый с новой строки (Alt+Enter); можно в любой строке человека — всё сложится'];
function cardsSheet_(pt) {
  var sh = pt.getSheetByName('Карточки');
  if (!sh) {
    sh = pt.insertSheet('Карточки');
    sh.getRange(1, 1, 2, CARD_COLS.length).setValues([CARD_COLS, CARD_HINTS]);
    sh.getRange(1, 1, 1, CARD_COLS.length).setFontWeight('bold');
    sh.getRange(2, 1, 1, CARD_COLS.length).setFontStyle('italic').setFontColor('#888888');
    sh.setFrozenRows(2);
  }
  return sh;
}
/** Запустите один раз из редактора, чтобы вкладка «Карточки» появилась сразу. */
function setupCards() { cardsSheet_(SpreadsheetApp.openById(CONFIG.PEOPLE_ID)); }

// ---------- чистая логика (её же гоняет test/run.js в node) ----------

function norm_(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Обычные слова, которые начинаются как имя: «настоящая» ~ Настя, «любимый» ~ Люба, «верно» ~ Вера.
// Защита от имён во фразах (safe) такие слова не считает именем. Начало слова, ё → е.
var NOT_NAMES = ['настоящ', 'любим', 'любл', 'любит', 'любят', 'любя', 'верн', 'верит', 'верю', 'верят', 'верх', 'вероят', 'январ'];
function notName_(w) {
  for (var i = 0; i < NOT_NAMES.length; i++) if (w.indexOf(NOT_NAMES[i]) === 0) return true;
  return false;
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

// кому сказана фраза точки Б → подпись над грустнолицым
var WHOM = [[/^пап/, 'папа'], [/^от[еца]/, 'папа'], [/^мам/, 'мама'], [/^мат[ери]/, 'мама'], [/^родител/, 'родители'], [/^альфа/, 'альфа-жертва'], [/^жертв/, 'альфа-жертва'],
  [/^дракон/, 'дракон'], [/^пыхт/, 'дракон'], [/^муж/, 'муж'], [/^жен/, 'жена'], [/^парн/, 'парень'], [/^девушк/, 'девушка'], [/^свекр/, 'свекровь'], [/^тещ|^тёщ/, 'тёща'],
  [/^сестр/, 'сестра'], [/^брат/, 'брат'], [/^начальн|^босс|^шеф/, 'начальник'], [/^подруг/, 'подруга'], [/^друг/, 'друг'], [/^коллег/, 'коллега'],
  [/^врач|^стоматолог|^доктор/, 'врач'], [/^реб[её]н|^доч|^сын/, 'ребёнок'], [/^себ|^сам/, 'я сам'], [/^мир|^всем|^люд/, 'мир']];
function toWhom_(s) {
  var w = String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
  for (var i = 0; i < WHOM.length; i++) if (WHOM[i][0].test(w)) return WHOM[i][1];
  return '';
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

// Разгрузочная версия: мат пишем полностью. Слово, запиканное в чате («п***ц», «х*йня», «за*бали»),
// сверяем со словарём: каждая «*» — от одной до четырёх букв. Нашлось — пишем словом целиком.
var MAT_WORDS = ('пиздец пизда пизде пизду пиздой пиздато пиздеть пиздит пиздёж пиздеж хуй хуя хую хуем хуйня хуйню хуйни хуево хуёво ' +
  'ахуеть охуеть охуенно охуенный охуела охуел охуели нахуй похуй блядь блять бля ебать ебал ебала ебали ебу ебёт ебет ебись ' +
  'заебали заебал заебала заебало заебись наебал наебала выебываться выебывается выебнуться ебаный ебаная ебаное ебаные ёбаный ' +
  'ебанутый ебанутая ебанулся отъебись уебок уёбок ебло сука суки сучка сучара нахер похер херня хер мудак мудаки').split(' ');
function unmask_(t) {
  return String(t || '').replace(/[А-ЯЁа-яё]*\*[А-ЯЁа-яё*]*/g, function (w) {
    if ((w.match(/[а-яё]/gi) || []).length < 2) return w; // «2*2», «*» — не слово
    var re = new RegExp('^' + w.toLowerCase().replace(/\*+/g, '[а-яё]{1,4}') + '$');
    for (var i = 0; i < MAT_WORDS.length; i++) {
      if (re.test(MAT_WORDS[i])) { var f = MAT_WORDS[i]; return w.charAt(0) === w.charAt(0).toUpperCase() && w.charAt(0) !== '*' ? f.charAt(0).toUpperCase() + f.slice(1) : f; }
    }
    return w;
  });
}

/** Фраза годится для бабла: короткая, без ссылок, ников, телефонов и чужих имён посреди фразы. */
function clean_(t, maxLen, pinned) {
  t = unmask_(String(t || '')).replace(/\s+/g, ' ').trim();
  if (t.length < 6 || t.length > (maxLen || 110)) return null;
  if (/https?:|www\.|@\w|#|\d{5,}/.test(t)) return null;
  // Имя посреди фразы. В закреплённых фразах слово с заглавной допустимо: их пишет тренер, имена ловит safe()
  if (!pinned && /[^.!?…]\s[А-ЯЁA-Z][а-яёa-z]+/.test(t.replace(/^[^А-ЯЁA-Zа-яёa-z]+/, ''))) return null;
  if (PERSONAL.test(t)) return null;                                   // адрес, телефон, карта, банк
  if (SURNAME.test(t)) return null;                                    // слово с заглавной, похожее на фамилию
  if (!pinned && hasCommonName_(t)) return null;                       // «Руслан, …», «Ленка» — обращение к кому-то
  return t;
}

// ---------- блоки фраз ----------
var YOU_RE = /(^|[^а-яё])(ты|тебе|тебя|тобой|твой|твоя|вы|вам|вас|ваш)(?![а-яё])/i;
var ME_RE = /(^|[^а-яё])(я|мне|меня|мой|моя|мои|мной)(?![а-яё])/i;
var JAB_RE = /ху[йеёяи]|пизд|бля|[её]б[ауилн]|сук[аи]|жоп|охуе|нахер|хрен|долбо|туп[аоы]|дур[аы]|идиот|мудак/i;
var SMILE_RE = /\)\)|😂|🤣|😁|😆|😋|😅|🙈|😜|😏|ахах|хаха/i;
// порядок важен: фраза попадает в первый подходящий блок
var BLOCK_RULES = [
  ['heavy', /суицид|умер|смерт|(?<![а-яё])рак(?![а-яё])|онколог|больниц|диагноз|беремен|аборт|выкидыш|насил|избил|похорон|депресс|таблет|температур|рвот|понос|блев|мигрен/i],
  ['logistics', /запиш|записал|во сколько|ссылк|расписан|слот|перенес|в календар|завтра в \d|в \d{1,2}[:.]\d\d|кто (идёт|будет)|созвон|планы\)/i],
  ['rage', /ненавиж|ебашили|уязвим|лупил|бил[аи]? меня|издевал|предал|больно мне|как тебе больно/i],
  ['result', /получил|получилось|сработал|смогл|впервые|наконец|сказал[аи]? (маме|папе|мужу|отцу|матери|начальник)|не болит|перестал[аи]? болеть|отпустил|полегчал|стало легче|сдал[аи]? зач|победил|в руководител|повысил|помирил|выдохнул|работает!/i],
  ['warm', /спасибо|благодар|люблю|обнима|поддерж|вы лучшие|рад[аы]? за|горжусь|ценю|родн(ые|ая|ой)|❤|🥹|🤗|💕|💖|обожаю|солнышко|скучаю|соскучил/i],
  ['sex', /секс|трах|поеба|ебаться|кончаю|кончил|сиськ|сисяст|письк|член|оральн|мастурб|голая|грудь|мужчина гладит|жопошно/i],
  ['family', /мам[аеуы]|пап[аеуы]|отец|отца|мать|матер|муж[аеу]?(?![а-яё])|мужем|жена|свекр|тёщ|теща|сестр|брат|сын|доч|реб[её]н|дет[иья]|родител|бывш|подруг/i],
  ['teeth', /зуб|(?<![а-яё])\d\dй|челюст|десн|стоматолог|пломб|клык|резец|моляр|коронк|имплант|зареагировал/i],
  ['school', /(?<![а-яё])ср(?![а-яё])|саморегуляц|зач[её]т|пыхт|дракон|альфа|жертв|кунг|зкф|практик|листоч|точк[аеу] [аб]|оракул|экспрес|уебищн|бот чат|анализир|на сборе/i],
  ['work', /клиент|работ[аеуы]|деньг|денег|денежн|зарплат|начальник|рилс|инст|блог|бизнес|продаж|заказ|руковод|увол/i],
  ['jabfun', function (t) { return YOU_RE.test(t) && SMILE_RE.test(t); }],
  ['clash', function (t) { return YOU_RE.test(t) && (JAB_RE.test(t) || t.indexOf('!') >= 0); }],
  ['self', function (t) { return ME_RE.test(t) && (SMILE_RE.test(t) || /😵|🔥|\)/.test(t)); }],
  ['laugh', /\)\)|😂|🤣|😁|😆|😋|😅|🙈|😜|😏|ахах|хаха|ору(?![а-яё])|ржу|угар|прикол|ржака/i],
  ['question', /\?\s*$/],
  ['complain', /устал|заебал|достал|бесит|надоел|тошн|сил нет|не могу больше|грустн|плачу|обидн|страшн|тревог|херово|хуёво|хуево|смущает/i],
  ['react', /^.{0,25}$/]
];
function blockOf_(t) {
  for (var i = 0; i < BLOCK_RULES.length; i++) {
    var r = BLOCK_RULES[i][1];
    if (typeof r === 'function' ? r(t) : r.test(t)) return BLOCK_RULES[i][0];
  }
  return 'other';
}
/** Текст для сверки с исключениями: без ников-подписей «Ампаро:», знаков и регистра. */
function normX_(t) {
  return String(t || '').replace(/(^|[|\n/])\s*[А-ЯЁ][а-яё]+(?: \d)?:\s/g, ' ').toLowerCase().replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ').trim();
}

// Обычные русские имена: обращение к человеку не из чата («Руслан, а ты…») тоже не показываем.
// Имена-слова (Вера, Надежда, Любовь, Роман, Лев, Слава, Роза, Лилия) не включены.
var COMMON_NAMES = {};
('александр саша саня алексей леша лёша андрей антон артем артём борис вадим валентин валерий василий вася виктор витя виталий владимир вова володя владислав влад вячеслав геннадий гена георгий гоша григорий гриша даниил данила денис дмитрий дима евгений женя егор иван ваня игорь илья кирилл константин костя максим макс михаил миша никита николай коля олег павел паша петр петя руслан сергей сережа серега станислав стас степан тимур тимофей федор федя эдуард юрий юра ярослав ' +
 'александра алена алёна алина алла анастасия настя ангелина анна аня анька валентина валерия лера варвара галина галя дарья даша диана ева евгения екатерина катя катька елена лена елизавета лиза жанна зоя инна ирина ира карина кристина ксения ксюша ксюха лариса лидия лида людмила люда маргарита рита марина мария маша надя наталья наташа нина оксана ольга оля полина раиса светлана света софия соня таисия тамара татьяна таня ульяна юлия юля яна ян янка людка ленка ирка танька наташка маринка светка оленька юлька ксюшка галька'
).split(' ').forEach(function (n) { COMMON_NAMES[n.replace(/ё/g, 'е')] = 1; });
function hasCommonName_(t) {
  var re = /([А-ЯЁа-яё]+)(\s*[,—–-])?/g, m;
  while ((m = re.exec(String(t)))) {
    var w = m[1], low = w.toLowerCase().replace(/ё/g, 'е');
    if (w.charAt(0) === low.charAt(0) && !m[2]) continue;           // строчное слово без запятой — не обращение
    if (COMMON_NAMES[low]) return true;                                // «Руслан», «Ира,»
    // усечённые и падежные формы («Людк,», «Ян,», «Оль,») — только как обращение, с запятой или тире:
    // иначе «Надо» путается с «Надя»
    if (m[2] && (COMMON_NAMES[low + 'а'] || COMMON_NAMES[low + 'я'] || COMMON_NAMES[low.slice(0, -1)] ||
        COMMON_NAMES[low.slice(0, -1) + 'а'] || COMMON_NAMES[low.slice(0, -1) + 'я'] || /к$/.test(low) && COMMON_NAMES[low.slice(0, -1) + 'а'])) return true;
  }
  return false;
}

// с этих слов начинаются реплики, которые без предыдущего сообщения непонятны
var OPENERS = /^(?:и|а|но|это|так|вот|он|она|оно|они|его|ее|её|их|там|тут|то|ну|да|нет|же|тоже|потому|поэтому|который|которая|ага|угу|ой|ну и)(?![а-яё])/i;
/** Насколько фраза понятна без контекста: от первого лица, законченная, не «а он…». */
function sense_(t) {
  var s = 0, w = t.split(/\s+/), low = t.toLowerCase().replace(/^[^а-яё]+/, '');
  if (w.length < 3) s -= 2; else if (w.length <= 16) s += 1;
  if (/(^|[^а-яё])(я|мне|меня|мой|моя|моё|мое|мои|мной)(?![а-яё])/i.test(t)) s += 2;
  if (/(^|[^а-яё])(ты|тебе|тебя|твой|твоя|вы|вам|вас|ваш)(?![а-яё])/i.test(t)) s += 1;
  if (/[.!?…)]$/.test(t)) s += 1;
  if (OPENERS.test(low)) s -= 2;
  if (MAT.test(t)) s += 1;
  return s;
}
/** «@ник текст» → кому и сам текст (для признаков диалога). */
function addr_(t) {
  var m = /^\s*@([A-Za-z0-9_]{3,})[\s,:]*([\s\S]*)$/.exec(String(t || ''));
  return m ? { to: m[1].toLowerCase(), body: m[2] } : { to: '', body: String(t || '') };
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
  var debug = { unmatched: [], ambiguous: [], reportMiss: [], bots: {} }; // только для debugLive, наружу не уходит
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

  // один человек под двумя никами (MERGE в «Прозвищах»: '@старый': '@новый')
  var merge = {};
  Object.keys(inp.merge || {}).forEach(function (k) { merge[k.replace(/^@/, '').toLowerCase()] = String(inp.merge[k]).replace(/^@/, '').toLowerCase(); });
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i], ms = parseDT_(r[cD]), author = String(r[cA] || '').trim(), user = String(r[cU] || '').replace(/^@/, '').trim().toLowerCase();
    if (merge[user]) user = merge[user];
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
    // боты: Джузеппе даёт реплики бота, остальные боты пропускаются целиком
    var isBot = /bot$/i.test(user) || /(^|[^а-яё])бот(?![а-яё])/i.test(author) || CONFIG.BOT_MATCH.test(author + ' ' + user);
    if (isBot) {
      var bk = author + (user ? ' @' + user : '');
      if (!debug.bots[bk]) debug.bots[bk] = { n: 0, ex: String(text).replace(/\s+/g, ' ').slice(0, 120) };
      debug.bots[bk].n++;
      if (CONFIG.BOT_MATCH.test(author + ' ' + user)) botLines.push({ ms: ms, text: text });
      continue;
    }
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
        // «@ник — папе: фраза», «@ник (мама): фраза», «@ник: фраза»
        var m = /@([A-Za-z0-9_]{3,})\s*(?:\(([^)]{2,25})\))?\s*[:—–-]\s*(.+)$/.exec(line);
        if (!m) return;
        var to = m[2] ? toWhom_(m[2]) : '', body = m[3], pre = /^([а-яё -]{2,20}?)\s*[:—–]\s*(.+)$/i.exec(body);
        if (!to && pre && toWhom_(pre[1])) { to = toWhom_(pre[1]); body = pre[2]; }
        pointB.push({ ms: ms, user: m[1].toLowerCase(), text: body, to: to });
      });
      continue;
    }
    if (String(r[cG]).trim() !== CONFIG.GROUP) continue;
    var p = person(user ? 'u:' + user : 'a:' + norm_(author), author, user);
    if (ms) { p.firstMs = Math.min(p.firstMs, ms); p.last = Math.max(p.last, ms); }
    if (ms && nowMs - ms <= CONFIG.QUOTE_DAYS * DAY) p.q.push({ ms: ms, text: text });
    seq.push({ ms: ms, p: p, text: text });
  }

  // убранные с площадки (EXCLUDE в «Прозвищах»): их нет ни среди людей, ни в сопоставлении
  var excl = {};
  (inp.exclude || []).forEach(function (u) { excl[String(u).replace(/^@/, '').trim().toLowerCase()] = 1; });
  list = list.filter(function (p) { return !(p.user && excl[p.user]); });

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
    if (al === '-') return null; // «забыть»
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
    if (!CONFIG.KEEP_UNMATCHED_EFIR) return null;
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
        if (!p) return;
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

  // Таблица участников: зубы оттуда важнее догадок по чату; «показ_на_сайте = да» разрешает коммуникации
  var colOf = function (rows, name) { return rows.length ? rows[0].map(function (h) { return String(h).trim(); }).indexOf(name) : -1; };
  var byUser = function (nick) {
    var u = String(nick || '').replace(/^@/, '').trim().toLowerCase();
    u = merge[u] || u;
    return u ? list.filter(function (p) { return p.user === u; })[0] : null;
  };
  stats.table_people = 0;
  if (inp.ptPeople && inp.ptPeople.length > 2) {
    var cN = colOf(inp.ptPeople, 'ник_tg'), cZ = colOf(inp.ptPeople, 'зубы'), cS = colOf(inp.ptPeople, 'показ_на_сайте'), cP = colOf(inp.ptPeople, 'персонаж');
    inp.ptPeople.slice(2).forEach(function (r) {
      var p = byUser(r[cN]);
      if (!p) return;
      stats.table_people++;
      var th = String(r[cZ] || '').match(/\b[1-4][1-8]\b/g);
      if (th && th.length) p.teeth = th.filter(function (x, i) { return th.indexOf(x) === i; }).slice(0, 32);
      p.show = String(r[cS] || '').trim().toLowerCase() === 'да';
      if (cP >= 0) p.tableNick = String(r[cP] || '').trim();
      var cSt = colOf(inp.ptPeople, 'статус');
      if (cSt >= 0) p.tableStatus = String(r[cSt] || '').trim().toLowerCase();
    });
  }

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
    if (p.tableStatus === 'текущий') p.old = false;                    // статус в таблице участников главнее догадок
    else if (p.tableStatus === 'ушёл' || p.tableStatus === 'ушел' || p.tableStatus === 'пауза') p.old = true;
    p.g = genderOf_(p.first);
  });

  // ники: стабильно по соли, старшие участники выбирают первыми
  (inp.names || []).concat(inp.hide || []).forEach(function (n) {
    norm_(n).split(' ').forEach(function (t) { if (t.length >= 3) real[t] = 1; });
  });
  var realNames = Object.keys(real).concat(people.map(function (p) { return p.first; }));
  var banned = {};
  realNames.forEach(function (t) { banned[t] = 1; });
  people.sort(function (a, b) { return (a.firstMs === Infinity ? 9e15 : a.firstMs) - (b.firstMs === Infinity ? 9e15 : b.firstMs) || (a.key < b.key ? -1 : 1); });
  var used = {};
  // ручные ники (NICKS в «Прозвищах»): '@ник_telegram' → 'Паулетта'; пол берётся из списка, где этот ник
  // ключ — '@ник_telegram' или имя, как в чате («маша иванова»)
  var nicks = {}, nickByPerson = new Map();
  Object.keys(inp.nicks || {}).forEach(function (k) {
    var v = String(inp.nicks[k]).trim(), key = k.trim();
    if (key.charAt(0) === '@') { nicks[key.slice(1).toLowerCase()] = v; return; }
    var who = match(key, false);
    if (who) nickByPerson.set(who, v); else debug.reportMiss.push('ник для «' + key + '»: человек не найден');
  });
  // ник из колонки «персонаж» таблицы участников — главнее «Прозвищ»; только из списков POOLS
  people.forEach(function (p) {
    var want = p.tableNick;
    if (!want || want === '—' || want === '-') return;
    if (used[want]) { debug.reportMiss.push('ник «' + want + '» в таблице занят другим'); return; }
    var g = ['f', 'm', 'u'].filter(function (k) { return POOLS[k].indexOf(want) >= 0; })[0];
    if (!g) { debug.reportMiss.push('ник «' + want + '» из таблицы не из списка POOLS — взят ник из «Прозвищ»'); return; }
    p.n = want; p.g = g; used[want] = 1;
  });
  people.forEach(function (p) {
    if (p.n) return;
    var want = (p.user && nicks[p.user]) || nickByPerson.get(p);
    if (!want || used[want]) return;
    ['f', 'm', 'u'].forEach(function (g) { if (!p.n && POOLS[g].indexOf(want) >= 0) { p.n = want; p.g = g; used[want] = 1; } });
  });
  people.forEach(function (p) {
    if (p.n) return;
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
  debug.nicks = people.map(function (p) { return p.n + ' ← ' + p.toks.join(' ') + (p.user ? ' @' + p.user : '') + (p.old ? ' (старый)' : '') + (p.t ? '' : ''); });

  // последняя защита от настоящих имён и ников во фразах
  var stems = realNames.filter(function (t) { return t && t.length >= 3; }).map(function (t) { return t.length >= 5 ? t.slice(0, -1) : t; });
  // Имена в обращениях: «Янка», «Лер, скажи», «Оль,», «Тань». Формы имён участников (и уменьшительные
  // из DIM) ловятся, если слово с заглавной буквы или после него запятая или тире.
  var firsts = {};
  realNames.concat(Object.keys(DIM)).forEach(function (n) {
    n = String(n || '').toLowerCase().replace(/ё/g, 'е');
    if (n.length < 3) return;
    var canon = DIM[n] || n;
    var known = function (x) { return real[x] || latVariants_(x).some(function (l) { return real[l]; }) ||
      people.some(function (p) { return p.first === x; }); };            // «Оля» → «ольга» → в чате «Olga»
    if (!known(canon) && !known(n)) return;
    [n, canon].forEach(function (x) {
      firsts[x] = 1;
      if (/[ая]$/.test(x) && x.length >= 3) { firsts[x.slice(0, -1)] = 1; firsts[x.slice(0, -1) + 'ь'] = 1; } // Лера → Лер, Оля → Оль, Юля → Юль
    });
  });
  function safe(t) {
    var w = norm_(t).split(' ');
    for (var i = 0; i < w.length; i++) {
      if (notName_(w[i])) continue;
      for (var j = 0; j < stems.length; j++) if (w[i] === stems[j] || (stems[j].length >= 4 && w[i].indexOf(stems[j]) === 0)) return false;
    }
    var re = /([А-ЯЁа-яё]+)(\s*[,—–-])?/g, m;
    while ((m = re.exec(String(t)))) {
      var word = m[1], low = word.toLowerCase().replace(/ё/g, 'е');
      if (firsts[low] && (word.charAt(0) !== low.charAt(0) || m[2])) return false;
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
  function pickB(arr) {
    var out = [], seen = {};
    arr.slice().sort(function (a, b) { return (b.ms || 0) - (a.ms || 0); }).forEach(function (x) {
      var t = clean_(x.text, 160);
      if (out.length < 10 && t && safe(t) && !seen[t]) { seen[t] = 1; out.push([x.to || '', t]); }
    });
    return out;
  }
  // Базовый блок: решение по блоку фразы (CONFIG.BLOCKS) плюс исключения из разметки (PHRASE_KEEP / PHRASE_DROP).
  var KEEPX = (inp.phraseKeep || []).map(normX_).filter(function (x) { return x.length >= 6; });
  var DROPX = (inp.phraseDrop || []).map(normX_).filter(function (x) { return x.length >= 6; });
  function inList(t, L) {
    var n = normX_(t);
    if (n.length < 6) return false;
    // короткое («поняла») — только точным совпадением, иначе оно находится внутри «ни хуя не поняла»
    for (var i = 0; i < L.length; i++) if (L[i] === n || (n.length >= 14 && L[i].indexOf(n) >= 0) || (L[i].length >= 40 && n.indexOf(L[i]) === 0)) return true;
    return false;
  }
  var RANK = {};
  CONFIG.BLOCKS.keep.forEach(function (b) { RANK[b] = 2; });
  CONFIG.BLOCKS.maybe.forEach(function (b) { RANK[b] = 1; });
  stats.blocks = {};
  /** 3 — исключение «оставить», 2 — блок keep, 1 — maybe, 0 — не берём. */
  function rankOf(t) {
    if (inList(t, DROPX)) return 0;
    if (inList(t, KEEPX)) return 3;
    return RANK[blockOf_(t)] || 0;
  }
  function pickChat(arr) { // фразы базового блока: блок с решением «оставить» или исключение, понятнее — выше
    var out = [], seen = {};
    arr.map(function (x) {
      var t = clean_(addr_(x.text).body, 140);
      if (!t || !safe(t)) return null;
      var b = blockOf_(t); stats.blocks[b] = (stats.blocks[b] || 0) + 1;   // сколько фраз в каком блоке
      return { t: t, r: rankOf(t), s: sense_(t), ms: x.ms || 0 };
    })
      .filter(function (x) { return x && x.r > 0 && (x.r === 3 || (x.s >= 1 && x.t.split(/\s+/).length >= 3)); }) // «Поняла» одна — непонятно о чём
      .sort(function (a, b) { return b.r - a.r || b.s - a.s || b.ms - a.ms; })
      .forEach(function (x) { if (out.length < 20 && !seen[x.t]) { seen[x.t] = 1; out.push(x.t); } });
    return out;
  }

  // порядок на сайте перемешан, чтобы место не выдавало человека
  people.sort(function (a, b) { return (a.old - b.old) || (hash(salt + '#' + a.key) - hash(salt + '#' + b.key)); });
  var idx = new Map();
  people.forEach(function (p, i) { idx.set(p, i); });

  // Сценки из чата. В таблице нет пометки «ответ кому», поэтому берём только чистый обмен двух людей
  // A→B→A(→B…) с паузами до 2 минут. Если реплика не проходит фильтр, сценка обрывается на ней,
  // а слишком короткие обрывки выбрасываются. Выше ранжируются сценки с явными признаками разговора:
  // обращение на «ты», вопрос и ответ, @ник собеседника, начало разговора после тишины.
  seq.sort(function (a, b) { return (a.ms || 0) - (b.ms || 0); });
  seq.forEach(function (m) { var a = addr_(m.text); m.to = a.to; m.body = a.body; });
  var GAP = 2 * 60e3, cands = [];
  for (var s0 = 0; s0 + 1 < seq.length; s0++) {
    var A = seq[s0].p, B = seq[s0 + 1].p;
    if (A === B || !seq[s0].ms || !idx.has(A) || !idx.has(B)) continue;
    var lines = [], score = 0, e = s0;
    while (e < seq.length && lines.length < 6) {
      var m = seq[e];
      if (m.p !== (lines.length % 2 ? B : A)) break;
      if (e > s0 && (!m.ms || m.ms - seq[e - 1].ms > GAP)) break;
      var t = clean_(m.body, 90);
      if (!t || !safe(t)) break;
      var partner = m.p === A ? B : A;
      score += sense_(t);
      if (m.to && partner.user && m.to === partner.user) score += 3;          // @ник собеседника
      if (/(^|[^а-яё])(ты|тебе|тебя|твой|твоя|вы|вам|вас)(?![а-яё])/i.test(t)) score += 1;
      if (lines.length && /\?\s*$/.test(lines[lines.length - 1][1])) score += 2; // ответ на вопрос
      lines.push([idx.get(m.p), t]);
      e++;
    }
    if (lines.length < 3) continue;
    if (s0 === 0 || !seq[s0 - 1].ms || seq[s0].ms - seq[s0 - 1].ms > GAP) score += 2; // разговор начался с нуля
    var avg = score / lines.length;
    var ranks = lines.map(function (l) { return rankOf(l[1]); });
    var forced = ranks.indexOf(3) >= 0, dropped = lines.some(function (l) { return inList(l[1], DROPX); });
    var okLines = ranks.filter(function (r) { return r > 0; }).length;
    if (!dropped && (forced || (avg >= 1.5 && okLines * 2 >= lines.length))) cands.push({ lines: lines, score: score + (forced ? 100 : 0), ms: seq[s0].ms });
    s0 = e - 1;
  }
  var fights = CONFIG.CHAT_SCENES ? cands.sort(function (a, b) { return b.score - a.score || b.ms - a.ms; }).slice(0, 40).map(function (c) { return c.lines; }) : [];

  // Монологи: человек пишет 2–3 сообщения подряд за пару минут, и все они понятны без контекста.
  var solos = [];
  for (var k0 = 0; k0 < seq.length; k0++) {
    var who = seq[k0].p, run = [], k = k0;
    if (!idx.has(who) || !seq[k0].ms) continue;
    while (k < seq.length && seq[k].p === who && run.length < 3 && (k === k0 || seq[k].ms - seq[k - 1].ms <= GAP)) {
      var tt = clean_(seq[k].body, 140);
      if (!tt || !safe(tt)) { run = []; break; }
      run.push(tt); k++;
    }
    if (run.length >= 2 && run.join(' ').length <= 230) {
      var sc = run.reduce(function (acc, x) { return acc + sense_(x); }, 0) / run.length;
      var rr = run.map(rankOf), forcedS = rr.indexOf(3) >= 0, droppedS = run.some(function (x) { return inList(x, DROPX); });
      var shortS = run.some(function (x, i) { return rr[i] < 3 && x.split(/\s+/).length < 3; });
      if (!droppedS && !shortS && (forcedS || (sc >= 2 && rr.every(function (r) { return r > 0; }))))
        solos.push({ i: idx.get(who), lines: run, score: sc + (forcedS ? 100 : 0), ms: seq[k0].ms });
    }
    k0 = Math.max(k0, k - 1);
  }
  var solo = solos.sort(function (a, b) { return b.score - a.score || b.ms - a.ms; }).slice(0, 40).map(function (x) { return [x.i, x.lines]; });

  // Закреплённые фразы (PINNED в «Прозвищах»): всегда в репликах человека и отдельным монологом.
  // Фильтр имён, фамилий и личного действует; «понятность» и длина до 200 знаков — нет.
  var pinnedQ = new Map();
  Object.keys(inp.pinned || {}).forEach(function (k) {
    var u = k.replace(/^@/, '').trim().toLowerCase();
    var who = k.charAt(0) === '@' ? people.filter(function (p) { return p.user === u; })[0] : match(k, false);
    if (!who || !idx.has(who)) { debug.reportMiss.push('закреплённые фразы для «' + k + '»: человек не на площадке'); return; }
    [].concat(inp.pinned[k]).forEach(function (raw) {
      // @ник в закреплённой фразе → ник его персонажа («@happinessguy спасибо» → «Хуанито спасибо»)
      raw = String(raw).replace(/@([A-Za-z0-9_]{3,})/g, function (_, u) {
        var o = people.filter(function (p) { return p.user === u.toLowerCase(); })[0];
        return o && o.n ? o.n : '';
      }).replace(/\s{2,}/g, ' ');
      var t = clean_(raw, 200, true);
      if (!t || !safe(t)) { debug.reportMiss.push('закреплённая фраза не прошла фильтр имён/личного: «' + String(raw).slice(0, 60) + '»'); return; }
      if (!pinnedQ.has(who)) pinnedQ.set(who, []);
      pinnedQ.get(who).push(t);
      solo.unshift([idx.get(who), [t]]);
    });
  });

  // Коммуникации из таблицы участников: адресат говорит фразу, участник отвечает из точки А, (АА) и Б.
  // Только «на_сайт = да» у строки и «показ_на_сайте = да» у участника. Фильтр имён и личного действует.
  var FACES = { 'улыбка': 1, 'грустный': 1, 'очень грустный': 1, 'злой': 1, 'очень злой': 1, 'ржущий злой': 1, 'шок': 1, 'бешеный': 1, 'портал': 1 };
  var comm = [];
  stats.comm = 0;
  if (inp.ptComm && inp.ptComm.length > 2) {
    var H = {};
    inp.ptComm[0].forEach(function (h, i) { H[String(h).trim()] = i; });
    var cell = function (r, k) { return H[k] == null ? '' : String(r[H[k]] || '').trim(); };
    var txt = function (t) { if (!t) return ''; var c = clean_(t, 220, true); return c && safe(c) && !hasCommonName_(c) ? c : null; };
    var face = function (f) { f = f.toLowerCase(); return FACES[f] ? f : ''; };
    inp.ptComm.slice(2).forEach(function (r) {
      if (cell(r, 'на_сайт').toLowerCase() !== 'да') return;
      var p = byUser(cell(r, 'ник_tg'));
      if (!p || !p.show || !idx.has(p)) return;
      var said = txt(cell(r, 'фраза_адресата')), a = txt(cell(r, 'ответ_А')), aa = txt(cell(r, 'ответ_АА')), b = txt(cell(r, 'ответ_Б'));
      if (!said || a === null || aa === null || b === null) { debug.reportMiss.push('коммуникация не прошла фильтр: ' + cell(r, 'дата') + ' ' + cell(r, 'адресат_роль')); return; }
      // на сайт — только когда есть оба пути: ответ из точки А и ответ из точки Б (АА — по желанию)
      if (!a || !b) { debug.reportMiss.push('коммуникация без ' + (!a ? 'ответа из А' : 'ответа из Б') + ', не показываем: ' + cell(r, 'дата') + ' ' + cell(r, 'адресат_роль')); return; }
      var role = cell(r, 'адресат_роль').toLowerCase().replace(/[^а-яё -]/g, '').slice(0, 30);
      var tooth = (cell(r, 'зуб').match(/\b[1-4][1-8]\b/) || [''])[0];
      // что адресат отвечает на А («молодец») и на Б («чтооо?»), и как перепалка в Б продолжается:
      // «продолжение_Б» — реплики через « / », по очереди адресат и участник
      var ra = txt(cell(r, 'реакция_после_А')), rb = txt(cell(r, 'реакция_после_Б'));
      var chain = cell(r, 'продолжение_Б').split(/\s*\/\s*|\n+/).map(function (x) { return txt(x.trim()); });
      // «до_триггера» — начало сценки до прихода адресата: «улыбается / Чё-то поныть хочется»
      var intro = cell(r, 'до_триггера').split(/\s*\/\s*|\n+/).map(function (x) { return txt(x.trim()); });
      if (ra === null || rb === null || chain.some(function (x) { return x === null; }) || intro.some(function (x) { return x === null; })) { debug.reportMiss.push('коммуникация не прошла фильтр: ' + cell(r, 'дата') + ' ' + cell(r, 'адресат_роль')); return; }
      comm.push([idx.get(p), role, face(cell(r, 'лицо_адресата')), said, a, face(cell(r, 'лицо_после_А')), aa, face(cell(r, 'лицо_после_АА')),
        b, face(cell(r, 'лицо_после_Б')), cell(r, 'портал').toLowerCase() === 'да', tooth, ra, rb, chain.filter(Boolean).slice(0, 8), intro.filter(Boolean).slice(0, 4)]);
    });
    stats.comm = comm.length;
  }

  // Карточки: [номер, зуб, [триггер, А, Б, СП, АЖ, ОЧЛ, дофаминовая ID, опасная ID, зачем зуб, залупа]] и сводки [номер, текст].
  // Только для тех, кого показываем; клетка с адресом, телефоном, фамилией или именем — пустая (см. журнал).
  var cards = [], sums = [];
  stats.cards = 0;
  if (inp.ptCards && inp.ptCards.length > 2) {
    var CH = {};
    inp.ptCards[0].forEach(function (h, i) { CH[String(h).trim().toLowerCase()] = i; });
    var cc = function (r, k) { var i = CH[k.toLowerCase()]; return i == null ? '' : String(r[i] || '').replace(/\s+/g, ' ').trim(); };
    var ctxt = function (t, max) {
      if (!t) return '';
      if (t.length > max || /https?:|www\.|@\w|#|\d{5,}/.test(t) || PERSONAL.test(t) || SURNAME.test(t) || !safe(t) || hasCommonName_(t)) {
        debug.reportMiss.push('карточка: клетка не прошла фильтр (имя, фамилия, контакт или слишком длинно)'); return '';
      }
      return t;
    };
    var F = CARD_COLS.slice(2, 12), byKey = {}, sumOf = {};
    inp.ptCards.slice(2).forEach(function (r) {
      var p = byUser(cc(r, 'ник_tg'));
      if (!p || !p.show || !idx.has(p)) return;
      var w = idx.get(p), tooth = (cc(r, 'зуб').match(/\b[1-4][1-8]\b/) || [''])[0];
      // путь роста: каждая строка клетки — отдельный успех; строки из всех рядов человека складываются
      var gi = CH['путь_роста'] != null ? CH['путь_роста'] : CH['сводка_ии'];
      String(gi == null ? '' : r[gi] || '').split(/\n+/).forEach(function (x) {
        x = ctxt(x.replace(/\s+/g, ' ').trim(), 400);
        if (!x) return;
        var g = sumOf[w] || (sumOf[w] = []);
        if (g.indexOf(x) < 0 && g.length < 30) g.push(x);
      });
      if (!tooth) return;
      var k = w + ':' + tooth, row = byKey[k] || (byKey[k] = [w, tooth, F.map(function () { return ''; })]);
      F.forEach(function (f, j) { var v = ctxt(cc(r, f), 600); if (v && !row[2][j]) row[2][j] = v; });
    });
    Object.keys(byKey).forEach(function (k) { if (byKey[k][2].some(Boolean)) cards.push(byKey[k]); });
    Object.keys(sumOf).forEach(function (w) { sums.push([+w, sumOf[w]]); }); // [номер, [успех, …]]
    stats.cards = cards.length;
  }

  // реплики толпы: короткие ответы из чата («жесть», «ахахах», «ору»)
  var react = [], seenR = {};
  seq.slice().reverse().forEach(function (m) {
    var t = String(m.text || '').replace(/\s+/g, ' ').trim();
    if (react.length >= 60 || t.length < 2 || t.length > 40 || seenR[t.toLowerCase()]) return;
    if (/https?:|www\.|@\w|#|\d{3,}/.test(t) || !/[а-яё]/i.test(t) || !safe(t)) return;
    if (/[^.!?…]\s[А-ЯЁA-Z][а-яёa-z]+/.test(t)) return;
    if (!(MAT.test(t) || /!|\)|😂|🤣|ах|ха|жесть|ору|ого|капец|о+х|ну+|да+/i.test(t))) return;
    if (!inList(t, KEEPX) && !(RANK[blockOf_(t)] > 0)) return; // по разметке: блок «оставить» или исключение
    seenR[t.toLowerCase()] = 1;
    react.push(t);
  });

  // Реплики бота: только фразы из разборов Джузеппе про то, что стоит за сообщением
  // (скрытая потребность, злость, страх, «на самом деле»…).
  var NEED = /потребност|скрыт|на самом деле|за этим|стоит за|хочет|хочется|нужн|боится|страх|злост|злишь|обид|подавл|стыд|вин[аыу]|прос(ит|ьб)|защищ|контрол|признани|любв|принят/i;
  var bot = pick(botLines.reduce(function (acc, x) {
    String(x.text).split(/(?<=[.!?…])\s+|\n+/).forEach(function (t) {
      t = t.replace(/^[^А-ЯЁа-яё]+/, '');
      if (t.length >= 20 && NEED.test(t)) acc.push({ ms: x.ms, text: t });
    });
    return acc;
  }, []), 140, 30);

  return {
    updated: new Date(nowMs).toISOString().slice(0, 16) + 'Z',
    people: people.map(function (p) {
      var pq = pinnedQ.get(p) || [];
      return { n: p.n, g: p.g, t: p.teeth, old: p.old, tr: p.tr, q: pq.concat(pickChat(p.q).filter(function (x) { return pq.indexOf(x) < 0; })).slice(0, 24), b: pickB(p.b) };
    }),
    fights: fights,
    comm: comm,
    cards: cards,
    sums: sums,
    solo: solo,
    react: react,
    bot: bot,
    stats: stats,
    _debug: debug // doGet его вырезает
  };
}
