Quicktext Chrome Extension
==========================

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

Creating templates
------------------

Templates are powered by [handlebars.js](http://handlebarsjs.com/).

Following template variables are available:
* **subject** _string_
* **from** _list_; Each list element contains:
  * **name** _string_
  * **firt_name** _string_
  * **last_name** _string_
  * **email** _string_
* **to** _list_ similar to _from_
* **cc** _list_ similar to _from_
* **bcc** _list_ similar to _from_

To output a string use following syntax:
```
String variables are denoted by double curly braces: {{subject}}
```

If subject is _My email subject_ then it be rendered to:
```
String variables are denoted by double curly braces: My email subject
```

To output a list use following syntax:
```
To:
{{#each to}}
- Name {{name}}
- First name {{first_name}}
- Last name {{last_name}}
- Email {{email}}
{{/each}}
```

You also may want to output list only if it has values:
```
{{#if to}}
To:
{{#each to}}
- Name {{name}}
- First name {{first_name}}
- Last name {{last_name}}
- Email {{email}}
{{/each}}
{{/if}}
```

If you want to output only second element from list (note that list numbering starts with 0):
```
{{#if to.[1]}}
Second To:
- Name {{to.1.name}}
- First name {{to.1.first_name}}
- Last name {{to.1.last_name}}
- Email {{to.1.email}}
{{/if}}
```

Testing
-------

Before running the tests, run:

```
npm install
```

Set the `QUICKTEXT_GMAIL_USERNAME` and `QUICKTEXT_GMAIL_PASSWORD` ENV variables, for logging-in into Gmail.

```
export QUICKTEXT_GMAIL_USERNAME=abc
export QUICKTEXT_GMAIL_PASSWORD=def
```

Then, to run all the tests:

```
grunt test
```

or only for the contentscript:

```
grunt test:content
```

or only for the background script:

```
grunt test:background
```

Running the tests will recompile the app for production and test that.

If you want to run the tests without recompiling the app, run:

```
grunt protractor:background
```

or

```
grunt protractor:content
```
