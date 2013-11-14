Quicktext for Gmail™
=====================

Google Chrome plugin for Gmail for improved productivity.


Developing extension
--------------------

Development is done using Grunt. So first you need to install [Node.js](http://nodejs.org/) and [Grunt](http://gruntjs.com/).

There are available following commands:

* `grunt` or `grunt dev` or `grunt d` - Development mode. Creates development manifest, watches for styl files and recompiles them automatically.
* `grunt production` or `grunt p` - Build extension.
* `grunt test` or `grunt t` - Run tests.
* `grunt build` or `grunt b` - Build and compress extension.

Known issues
------------

1. Saving a quicktext from the context menus doesn't work with multi-lines.

   Relevant bug: https://code.google.com/p/chromium/issues/detail?id=116429

   This means that when selecting a text to save as a quicktext it will not preserve newlines.
