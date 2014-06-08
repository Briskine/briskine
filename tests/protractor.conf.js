exports.config = {
    baseUrl: '',
    specs: [
        './e2e/*.spec.js'
    ],
    chromeOnly: true,
    capabilities: {
        browserName: 'chrome',
        chromeOptions: {
            extensions: [],
            args: [
                'load-extension=./ext/'
            ]
        }
    }

//   seleniumAddress: 'http://localhost:4444/wd/hub',
//   jasmineNodeOpts: {
//     specs: ['./e2e/*.spec.js']
//   }
}

