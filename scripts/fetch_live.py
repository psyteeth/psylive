#!/usr/bin/env python3
"""Забирает данные живой страницы из Apps Script и пишет data/live.json.

Адрес берётся из переменной окружения LIVE_URL (секрет GitHub). Ответ проходит
строгую проверку и собирается заново: ники только из списков POOLS в
apps_script/live.gs, зубы только FDI, фразы короткие и без ссылок и @ников.
Если что-то не так, файл не меняется и скрипт падает с кодом 1: на сайте
остаются прошлые данные, а в GitHub видна красная задача.

    LIVE_URL=https://script.google.com/macros/s/.../exec python3 scripts/fetch_live.py
    python3 scripts/fetch_live.py --file ответ.json      # проверить сохранённый ответ
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "data" / "live.json"
GS = ROOT / "apps_script" / "live.gs"

TOOTH_RE = re.compile(r"^[1-4][1-8]$")
UPDATED_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$")
BAD_TEXT_RE = re.compile(r"https?:|www\.|@\w|#|\d{5,}")
STATS_KEYS = {"blocks", "comm", "table_people", "efir_unmatched", "efir_ambiguous", "reports", "reports_matched", "point_b", "point_b_matched", "zub_msgs", "self_teeth", "nick_teeth"}


class Bad(Exception):
    pass


def load_pools():
    src = GS.read_text(encoding="utf-8")
    pools = {}
    for key in ("f", "m", "u"):
        m = re.search(rf"^\s*{key}: \[(.*?)\]", src, re.M)
        if not m:
            raise Bad(f"не нашёл POOLS.{key} в {GS.name}")
        pools[key] = set(re.findall(r"'([^']+)'", m.group(1)))
    return pools


def text_ok(t, max_len, where):
    if not isinstance(t, str) or not 1 <= len(t) <= max_len or BAD_TEXT_RE.search(t):
        raise Bad(f"{where}: недопустимая фраза")
    return t


WHOM = {"", "папа", "мама", "родители", "альфа-жертва", "дракон", "муж", "жена", "парень", "девушка", "свекровь",
        "тёща", "сестра", "брат", "начальник", "подруга", "друг", "коллега", "врач", "ребёнок", "я сам", "мир"}


def b_ok(x, where):
    """Фраза точки Б: [кому, текст]; «кому» только из списка WHOM в live.gs."""
    if not isinstance(x, list) or len(x) != 2 or x[0] not in WHOM:
        raise Bad(f"{where}: ожидается [кому, фраза]")
    return [x[0], text_ok(x[1], 170, where)]


def clean(raw, pools):
    if not isinstance(raw, dict):
        raise Bad("ответ не объект")
    if "error" in raw:
        raise Bad(f"Apps Script вернул ошибку: {raw['error']}")
    upd = raw.get("updated")
    if not isinstance(upd, str) or not UPDATED_RE.match(upd):
        raise Bad("updated: неверный формат")
    people = raw.get("people")
    if not isinstance(people, list) or not 1 <= len(people) <= 400:
        raise Bad("people: пусто или слишком много")
    out_people, names = [], set()
    for i, p in enumerate(people):
        w = f"people[{i}]"
        if not isinstance(p, dict):
            raise Bad(f"{w}: не объект")
        g = p.get("g")
        if g not in pools:
            raise Bad(f"{w}.g")
        n = p.get("n")
        base = n.rsplit(" ", 1)[0] if isinstance(n, str) and re.search(r" \d+$", n) else n
        if base not in pools[g] or n in names:  # ник только из списка: настоящее имя сюда не пролезет
            raise Bad(f"{w}.n: ник не из списка или повтор")
        names.add(n)
        t = p.get("t")
        if not isinstance(t, list) or len(t) > 32 or not all(isinstance(x, str) and TOOTH_RE.match(x) for x in t):
            raise Bad(f"{w}.t")
        for k in ("old", "tr"):
            if not isinstance(p.get(k), bool):
                raise Bad(f"{w}.{k}")
        q, b = p.get("q"), p.get("b")
        if not isinstance(q, list) or len(q) > 25 or not isinstance(b, list) or len(b) > 12:
            raise Bad(f"{w}.q/b")
        out_people.append({
            "n": n, "g": g, "t": t, "old": p["old"], "tr": p["tr"],
            "q": [text_ok(x, 210, f"{w}.q") for x in q],
            "b": [b_ok(x, f"{w}.b") for x in b],
        })
    fights = raw.get("fights")
    if not isinstance(fights, list) or len(fights) > 60:
        raise Bad("fights")
    out_f = []
    for i, f in enumerate(fights):
        if not isinstance(f, list) or not 2 <= len(f) <= 8:
            raise Bad(f"fights[{i}]")
        line = []
        for j, (who, txt) in enumerate(f):
            if not isinstance(who, int) or isinstance(who, bool) or not 0 <= who < len(out_people):
                raise Bad(f"fights[{i}][{j}]: номер человека")
            line.append([who, text_ok(txt, 100, f"fights[{i}][{j}]")])
        out_f.append(line)
    solo = raw.get("solo", [])
    if not isinstance(solo, list) or len(solo) > 80:
        raise Bad("solo")
    out_s = []
    for i, x in enumerate(solo):
        if (not isinstance(x, list) or len(x) != 2 or not isinstance(x[0], int) or isinstance(x[0], bool)
                or not 0 <= x[0] < len(out_people) or not isinstance(x[1], list) or not 1 <= len(x[1]) <= 3):
            raise Bad(f"solo[{i}]")
        out_s.append([x[0], [text_ok(t, 210, f"solo[{i}]") for t in x[1]]])
    FACES = {"", "улыбка", "грустный", "очень грустный", "злой", "очень злой", "ржущий злой", "портал"}
    comm = raw.get("comm", [])
    if not isinstance(comm, list) or len(comm) > 200:
        raise Bad("comm")
    out_c = []
    for i, c in enumerate(comm):
        w = f"comm[{i}]"
        if not isinstance(c, list) or len(c) != 12:
            raise Bad(f"{w}: ожидается 12 полей")
        who, role, f0, said, a, fa, aa, faa, b, fb, portal, tooth = c
        if not isinstance(who, int) or isinstance(who, bool) or not 0 <= who < len(out_people):
            raise Bad(f"{w}: номер человека")
        if not isinstance(role, str) or not re.fullmatch(r"[а-яё -]{0,30}", role):
            raise Bad(f"{w}: адресат")
        if any(x not in FACES for x in (f0, fa, faa, fb)):
            raise Bad(f"{w}: лицо не из списка")
        if not isinstance(portal, bool) or not (tooth == "" or (isinstance(tooth, str) and TOOTH_RE.match(tooth))):
            raise Bad(f"{w}: портал или зуб")
        t = lambda x: "" if x == "" else text_ok(x, 230, w)
        out_c.append([who, role, f0, text_ok(said, 230, w), t(a), fa, t(aa), faa, t(b), fb, portal, tooth])
    react = raw.get("react", [])
    if not isinstance(react, list) or len(react) > 80:
        raise Bad("react")
    bot = raw.get("bot")
    if not isinstance(bot, list) or len(bot) > 40:
        raise Bad("bot")
    stats = raw.get("stats") or {}
    blocks = stats.pop("blocks", {}) if isinstance(stats, dict) else {}
    if not isinstance(blocks, dict) or not all(isinstance(k, str) and re.fullmatch(r"[a-z]{2,12}", k) and isinstance(v, int) for k, v in blocks.items()):
        raise Bad("stats.blocks")
    if not isinstance(stats, dict) or set(stats) - STATS_KEYS or not all(isinstance(v, int) and 0 <= v < 10**6 for v in stats.values()):
        raise Bad("stats")
    return {
        "updated": upd,
        "people": out_people,
        "fights": out_f,
        "solo": out_s,
        "comm": out_c,
        "react": [text_ok(x, 40, "react") for x in react],
        "bot": [text_ok(x, 130, "bot") for x in bot],
        "stats": {**stats, "blocks": blocks},
    }


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "psylive"})
    with urllib.request.urlopen(req, timeout=300) as r:  # Apps Script отвечает редиректом, urllib идёт за ним
        body = r.read().decode("utf-8", "replace")
        final = urllib.parse.urlsplit(r.geturl())
    try:
        return json.loads(body)
    except ValueError:
        pass
    # не JSON: подсказка без самой ссылки (она секрет)
    if final.netloc.startswith("accounts.google"):
        why = ("Google просит войти. В развёртывании Apps Script поставьте «У кого есть доступ: Все» "
               "и скопируйте новую ссылку /exec")
    elif "/dev" in final.path or "/edit" in final.path:
        why = "в LIVE_URL ссылка на редактор или /dev, а нужна ссылка развёртывания, которая заканчивается на /exec"
    elif not final.path.endswith("/exec") and "googleusercontent" not in final.netloc:
        why = f"ссылка ведёт не на веб-приложение ({final.netloc}); нужна ссылка развёртывания /exec"
    else:
        why = "Apps Script вернул страницу вместо данных; откройте ссылку /exec в браузере и посмотрите, что там"
    raise Bad(f"ответ не JSON: {why}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", help="взять ответ из файла вместо LIVE_URL")
    ap.add_argument("--out", default=str(TARGET))
    args = ap.parse_args(argv)
    try:
        pools = load_pools()
        if args.file:
            raw = json.loads(Path(args.file).read_text(encoding="utf-8"))
        else:
            url = os.environ.get("LIVE_URL", "").strip()
            if not url:
                raise Bad("не задан LIVE_URL")
            raw = fetch(url)
        live = clean(raw, pools)
    except (Bad, OSError, ValueError, TypeError) as e:
        print(f"fetch_live: {e}. data/live.json не изменён.", file=sys.stderr)
        return 1
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)  # data/ может не быть: пустые папки git не хранит
    Path(args.out).write_text(json.dumps(live, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    act = sum(not p["old"] for p in live["people"])
    print(f"fetch_live: ок, {live['updated']}: {act} сейчас, {len(live['people']) - act} в прошлом, "
          f"{sum(len(p['q']) for p in live['people'])} фраз, {sum(len(p['b']) for p in live['people'])} точек Б, "
          f"{len(live['fights'])} перепалок, {len(live['solo'])} монологов; {live['stats']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
