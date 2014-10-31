/* Protractor config
 * for background script testing
 */
exports.config = {
    baseUrl: '',
    specs: [
        './e2e/background.spec.js'
    ],
    multiCapabilities: [{
        browserName: 'chrome',
        chromeOptions: {
            extensions: [],
            args: [
                'load-extension=./ext/'
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

