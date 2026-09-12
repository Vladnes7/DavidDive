#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проставляет версию к styles.css и script.js в index.html.

Зачем. GitHub Pages отдаёт файлы с `Cache-Control: max-age=600`, поэтому
после выкладки браузер ещё десять минут показывает старые стили — правка
вроде бы выложена, а на экране её нет. Версия в ссылке заставляет браузер
скачать файл заново.

Версия — короткий хеш содержимого, а не дата: если файл не менялся, ссылка
остаётся прежней и кэш продолжает работать как надо.

Запускать перед каждым коммитом, где менялись стили или скрипт:

    python3 bump.py
"""
import hashlib, io, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(ROOT, "index.html")
ASSETS = ("styles.css", "script.js")


def short_hash(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


def main():
    html = io.open(PAGE, encoding="utf-8").read()
    before = html
    report = []

    for name in ASSETS:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            sys.exit("нет файла: " + name)
        ver = short_hash(path)
        attr = "href" if name.endswith(".css") else "src"
        pattern = re.compile(r'%s="%s(?:\?v=[0-9a-f]+)?"' % (attr, re.escape(name)))
        found = pattern.findall(html)
        if len(found) != 1:
            sys.exit("ожидалась одна ссылка на %s, нашлось %d" % (name, len(found)))
        html = pattern.sub('%s="%s?v=%s"' % (attr, name, ver), html)
        report.append("  %-12s v=%s" % (name, ver))

    if html == before:
        print("версии уже актуальны:")
    else:
        io.open(PAGE, "w", encoding="utf-8").write(html)
        print("обновлено:")
    print("\n".join(report))


if __name__ == "__main__":
    main()
