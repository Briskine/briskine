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

The new edit interface doesn't work yet. Also some of the old interfaces 
don't work either.
