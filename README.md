Quicktext for Gmail™
=====================

Google Chrome plugin for Gmail for improved productivity.


Regenerating pages
-------------------

Since we have a few html pages that essentially reuse the same html it makes
sense to have templates. Python + Jinja2: http://jinja.pocoo.org/ is used to make that possible.

Here's how it's done:

    mkvirtualenv gmail-quicktext
    pip install -r requirements.pip
    cd pages
    python generate_pages.py

Known issues
------------

1. Saving a quicktext from the context menus doesn't work with multi-lines.

   Relevant bug: https://code.google.com/p/chromium/issues/detail?id=116429

   This means that when selecting a text to save as a quicktext it will not preserve newlines.
