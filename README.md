Gorgias Chrome Extension
==========================

Google Chrome plugin for improved productivity on the web.

Sites supported
---------------

* Gmail
* Outlook.com
* Yahoo Mail
* Linkedin


Development
-----------

* Install [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/).
* Install [Yarn](https://yarnpkg.com).
* Run `yarn install` to install all dependencies.

The following commands are available:

* `yarn start` - Development mode. Creates development manifest, watches files and recompiles them automatically.
* `yarn build` - Build extension and compress extension.
* `yarn test` - Run tests.

Known issues
------------

1. Saving a template from the context menus doesn't work with multi-lines.

   Relevant bug: https://code.google.com/p/chromium/issues/detail?id=116429

   This means that when selecting a text to save as a template it will not preserve newlines.

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
