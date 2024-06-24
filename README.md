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

Build extension and compress it as a zip file. The built extension is in `/ext`, and the zip file is in `/build`.

* Append `-- safari` to any command to build the Safari version. (eg. `npm run build -- safari`).
* Append `-- manifest=2` to any command to build the Manifest v2 version. (eg. `npm run build -- manifest=2`).

## Help Center

Visit our [Help Center](https://help.briskine.com/) for more details about templates, variables, and more.

## License

The Briskine browser extension is licensed under the [GPL-3.0 license](/LICENSE).
