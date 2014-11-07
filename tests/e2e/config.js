/* Shared config for testing
 */

var config = {
    sleepTime: 800,
    extensionsUrl: 'chrome://extensions-frame/',
    extensionName: 'Quicktext for Chrome',
    extensionId: '',
    optionsUrl: 'chrome-extension://',
    optionsUrlSuffix: '/pages/bg.html',

    quicktextNew: {
        title: 'Test quicktext title ' + Date.now(),
        shortcut: 'Q',
        subject: 'Test quicktext subject',
        tags: 'tag1, tag2, tag3',
        body: 'Test quicktext body'
    }
};

module.exports = config;
