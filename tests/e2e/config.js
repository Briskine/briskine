/* Shared config for testing
 */

var config = {
    sleepTime: 800,
    deleteAll: protractor.Key.chord(protractor.Key.CONTROL, 'a') + protractor.Key.DELETE,

    extensionsUrl: 'chrome://extensions-frame/',
    extensionName: 'Gorgias',
    extensionId: '',
    optionsUrl: 'chrome-extension://',
    optionsUrlSuffix: '/pages/bg.html',

    extensionb64: '',

    popupUrl: 'chrome-extension://',
    popupUrlSuffix: '/pages/bg.html#/popup',

    quicktextNew: {
        title: 'Test quicktext title ' + Date.now(),
        shortcut: 'Q',
        subject: 'Test quicktext subject',
        tags: 'tag1, tag2, tag3',
        body: 'Test quicktext body'
    },

    autocompleteShortcut: protractor.Key.chord(protractor.Key.CONTROL, protractor.Key.SPACE),

    gmailContainerSelector: '.AO',
    messageBodySelector: 'div[aria-label="Message Body"]',
    autocompleteDropdownSelector: '.qt-dropdown',

    gmail: {
        url: 'https://mail.google.com/mail/u/0/#inbox',
        user: process.env.QUICKTEXT_GMAIL_USERNAME,
        password: process.env.QUICKTEXT_GMAIL_PASSWORD
    },

    GetExtensionId: function(callback) {

        var foundExtension = false;

        browser.ignoreSynchronization = true;

        // use plain driver
        // to prevent complaining about angular not being available
        browser.driver.get(config.extensionsUrl);

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css('#extension-settings-list'));
        });

        var i = 0;
        var findExtension = function($details) {

            var $detail = $details[i];

            $detail.element(by.css('.extension-title')).getText().then(function(title) {

                if(title.indexOf(config.extensionName) !== -1) {

                    $detail.getAttribute('id').then(function(id) {
                        config.extensionId = id;

                        config.optionsUrl += config.extensionId + config.optionsUrlSuffix;

                        config.popupUrl += config.extensionId + config.popupUrlSuffix;

                        callback();

                        browser.ignoreSynchronization = false;


                    });

                } else {

                    i++;
                    findExtension($details);

                }

            });

        };

        element.all(by.css('.extension-list-item-wrapper')).then(findExtension);

    }
};

module.exports = config;
