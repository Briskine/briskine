#!/usr/bin/env python
""" Generate pages using jinja2 """

from jinja2 import FileSystemLoader, Environment
env = Environment(loader=FileSystemLoader("./templates"))

pages = [
    "dialog.html",
    "options.html",
    "popup.html",
]

for page in pages:
    new_content = env.get_template(page).render()
    with open(page, "w") as f:
        f.write(new_content.encode('utf-8'))
