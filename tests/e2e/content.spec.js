/* Tests for the contentscript
 */

describe('Content script', function () {

    var config = require('./config.js');

    // check for the required ENV variables
    if (!config.gmail.user || !config.gmail.password) {
        var envError = '\nIMPORTANT!\n Set the QUICKTEXT_GMAIL_USERNAME and QUICKTEXT_GMAIL_PASSWORD enviroment variables, so we can run the contentscript tests inside Gmail.';
        console.log(envError);
        return new Error(envError);
    }

    it('should log-in into Gmail', function () {

        browser.driver.get(config.gmail.url);

        browser.driver.findElement(by.css('#Email')).sendKeys(config.gmail.user);
        browser.driver.findElement(by.css('#Passwd')).sendKeys(config.gmail.password);

        browser.driver.findElement(by.css('#Passwd')).submit().then(function () {

            browser.driver.wait(function () {
                return browser.driver.isElementPresent(by.css(config.gmailContainerSelector));
            });

            expect(browser.driver.getCurrentUrl()).toContain('#inbox');

        });

    });

    it('should open the Compose window', function () {

        browser.driver.findElement(by.css('[gh=cm]')).click();

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.messageBodySelector));
        });

        expect(browser.driver.isElementPresent(by.css(config.messageBodySelector))).toBe(true);

    });

    // TODO add a new quicktext
    // by opening chrome-extension://<your-extension-id>/pages/bg.html#/popup
    // to also test the pageAction popup

    // TODO configure the autocomplete keyboard shortcut
    // or make sure it's the default one

    it('should show the autocomplete dropdown', function () {

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut);

        // trigger the autocomplete dialog with the keyboard shortcut

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.autocompleteShortcut);


        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector));
        });

        expect(browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector))).toBe(true);

    });

    it('should contain the quicktext in the autocomplete dropdown', function () {

        expect(
            browser.driver.findElement(by.css(config.autocompleteDropdownSelector)).getText()
        ).toContain('Say Hello');

    });

    it('should activate the quicktext by clicking on the autocomplete listing', function () {

        browser.driver.findElement(by.css(config.autocompleteDropdownSelector + ' li:first-child')).click();

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

    });

    it('should activate the quicktext by pressing Enter', function () {

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut);

        // TODO make this configurable
        var autocompleteShortcut = protractor.Key.chord(protractor.Key.CONTROL, protractor.Key.SPACE);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(autocompleteShortcut);

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector));
        });

        var autocompleteSearch = config.autocompleteDropdownSelector + ' input[type=search]';
        browser.driver.findElement(by.css(autocompleteSearch)).sendKeys(protractor.Key.ENTER);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

    });

    it('should activate the quicktext by pressing Tab', function () {

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys('h' + protractor.Key.TAB);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });


});
