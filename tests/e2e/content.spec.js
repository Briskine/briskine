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

    var setValue = function(element, value) {

        return element.getWebElement().then(function(elem) {

            var execute = 'arguments[0].value = arguments[1];' +
            'angular.element(arguments[0]).trigger("input");'

            return browser.executeScript(execute, elem, value);

        });

    };

    it('should open the options page', function () {

        config.GetExtensionId(function() {

            browser.get(config.optionsUrl);

            browser.driver.wait(function () {
                return browser.driver.isElementPresent(by.css('.view-container'));
            });

            expect(browser.getTitle()).toBe('Gorgias Options');

        });

    });

    it('should create a new quicktext', function() {

        element(by.css('[href="#/list?id=new"]')).click();

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css('.quicktext-modal'));
        });

        setValue(element(by.model('selectedTemplate.title')), config.quicktextNew.title);

        setValue(element(by.model('selectedTemplate.body')), config.quicktextNew.body);

        setValue(element(by.model('selectedTemplate.shortcut')), config.quicktextNew.shortcut);

        element(by.model('selectedTemplate.body')).submit().then(function() {

            browser.sleep(config.sleepTime);

            expect(element(by.css('.quicktext-modal')).getCssValue('display')).toBe('none');

        });

    });

    it('should have the new quicktext in the pageaction popup', function () {

        browser.driver.get(config.popupUrl);

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css('.view-container'));
        });

        expect(element(by.css('.quicktexts-list')).getText()).toContain(config.quicktextNew.title);

    });

    it('should log into Gmail', function () {

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

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector));
        });

        expect(
            browser.driver.findElement(by.css(config.autocompleteDropdownSelector)).getText()
        ).toContain(config.quicktextNew.title);

    });

    it('should activate the quicktext by clicking on the autocomplete listing', function () {

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector));
        });

        browser.driver.findElement(by.css(config.autocompleteDropdownSelector + ' li:first-child')).click();

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });

    it('should activate the quicktext by pressing Enter', function () {

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.messageBodySelector));
        });

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.autocompleteShortcut);

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.autocompleteDropdownSelector));
        });

        var autocompleteSearch = config.autocompleteDropdownSelector + ' input[type=search]';

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(autocompleteSearch));
        });

        browser.driver.findElement(by.css(autocompleteSearch)).sendKeys(protractor.Key.ENTER);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });

    it('should activate the quicktext by pressing Tab', function () {

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css(config.messageBodySelector));
        });

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut + protractor.Key.TAB);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });


});
