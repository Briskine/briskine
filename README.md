# <img src="src/icons/briskine-combo.svg" with="300" height="55" alt="Briskine Browser Extension">

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

Build the extension for all browsers and compress each one as a zip file.

* Use `npm run build:chrome`, `npm run build:firefox`, or `npm run build:safari` to build a single browser.
* Add `browser=firefox` (or `chrome`/`safari`) to any command to pick the browser. (eg. `npm start -- browser=firefox`). Defaults to `chrome`.

## Help Center

Visit our [Help Center](https://help.briskine.com/) for more details about templates, variables, and more.

## License

The Briskine browser extension is licensed under the [GPL-3.0 license](/LICENSE).
