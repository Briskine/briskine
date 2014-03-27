exports.config = {
  baseUrl: '',
  specs: [
    './e2e/content.spec.js'
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
}

