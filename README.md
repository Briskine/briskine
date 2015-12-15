Gorgias Chrome Extension
==========================

Google Chrome plugin for improved productivity on the web.

Sites supported
---------------

* Gmail
* Outlook.com
* Yahoo Mail
* Linkedin


Developing extension
--------------------

Development is done using Grunt. So first you need to install [Node.js](http://nodejs.org/) and [Grunt](http://gruntjs.com/).
Then, run `npm install` to install all dependencies.

There are available following commands:

* `grunt` or `grunt dev` or `grunt d` - Development mode. Creates development manifest, watches for styl files and recompiles them automatically.
* `grunt production` or `grunt p` - Build extension.
* `grunt test` or `grunt t` - Run tests.
* `grunt build` or `grunt b` - Build and compress extension.

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

Building plugins
----------------

You can build plugins using the `App.plugin('PLUGIN_NAME', {})` method.

Check out the `src/content/plugins/*.js` files for examples on how a plugin show look.

Each plugin must expose the following methods:

* `init`
* `getData`

All plugin methods should take two arguments: `params` and `callback`.

The `params` argument is an object which can contain other objects or properties that you can use in the method.

The `callback` argument should be a function called at the end of the method, after all async functionality.

The `callback` function uses `Node.js`-style arguments. The first one is an error object returned in case of errors, otherwise return `null`. The second argument is the actual method response.

### Plugin methods

#### init

The `init` method should respond with a boolean value, `false` by default, and `true` if the plugin should be activated.

#### getData

The `getData` method receives the following `params` object:

```
params: {
    element: DOM_ELEMENT
}
```

The `params.element` object is a reference to the DOM element on which the autocomplete was triggered. It can be a `contenteditable` element, or a form element.

The response of the `getData` method should look like:

```
{
    from: [],
    to: [],
    cc: [],
    bcc: [],
    subject: ''
}
```

Each array should contain objects that look like:

```
{
    name: '',
    first_name: '',
    last_name: '',
    email: ''
}
```

#### setTitle

```
// TODO
```

Testing
-------

Before running the tests, run:

```
npm install
```

Then key your Chrome private `.pem` keyfile and copy it as `key.pem` in the repository root.

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

If you want to run the tests locally (not on Sauce Labs) without recompiling the app, run:

```
grunt protractor:background
```

or

```
grunt protractor:content
```
