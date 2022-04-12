# <img src="artwork/icon-64.png" height="24" with="24"> Briskine Browser Extension

> Text expander for the web

Write emails faster. Create text templates and insert them with shortcuts on any website.

Visit the [Briskine website](https://www.briskine.com/).

## Development

* Install [Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/).
* Run `npm install` to install all dependencies.

The following commands are available:

* `npm start`

Development mode. Creates development manifest, watches files and recompiles them automatically.
The build is placed in `/ext`.

* `npm run build`

Build extension and compress it as a zip file. The built extension is in `/ext`, and the zip file is in `/build`.

* Append `-- safari` to any command to build the Safari version. (eg. `npm run build -- safari`).


## Known issues

1. Saving a template from the context menus doesn't work with multi-lines.

   Relevant bug: https://code.google.com/p/chromium/issues/detail?id=116429

   This means that when selecting a text to save as a template it will not preserve newlines.

## Help Center

Visit our [Help Center](https://help.briskine.com/) for more details about templates, variables, and more.

## License

The Briskine browser extension is licensed under the [GPL-3.0 license](/LICENSE).
