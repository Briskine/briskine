/* Protractor config
 * for background script testing
 */

var fs = require('fs');

var extensionb64 = fs.readFileSync('./ext/quicktext-chrome.crx');

// convert to base64
extensionb64 = new Buffer(extensionb64).toString('base64');

exports.config = {
    baseUrl: '',
    specs: [
        './e2e/background.spec.js'
    ],
    multiCapabilities: [{
        browserName: 'chrome',
        chromeOptions: {
            extensions: [ extensionb64 ],
            args: [
                //'load-extension=./ext/'
            ]
        }
    }],
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 30000,
        isVerbose : true,
        includeStackTrace : true
    }
};

