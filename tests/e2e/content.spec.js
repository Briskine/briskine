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
                return element(by.css('.view-container')).isPresent();
            });

            expect(browser.getTitle()).toBe('Gorgias Options');

        });

    });

    it('should redirect to the List view', function () {
        browser.driver.get(config.optionsUrl);
        expect(browser.getCurrentUrl()).toContain('/list');
    });

    it('should close installed view for test', function () {
        var elem = element(by.css('#post-install-modal'));
        var button_close = elem.element(by.css('.close'));
        button_close.click();
    });

    it('should create a new quicktext', function() {

        browser.sleep(config.sleepTime);

        element(by.css('[href="#/list?id=new"]')).click();

        browser.driver.wait(function () {
            return element(by.css('.quicktext-modal')).isPresent();
        });
        browser.sleep(config.sleepTime);
        element(by.model('templateForm.selectedTemplate.title')).clear().sendKeys(config.quicktextNew.title);
        element(by.model('templateForm.selectedTemplate.shortcut')).clear().sendKeys(config.quicktextNew.shortcut);
        browser.driver.switchTo().frame("qt-body_ifr");
        var elements = browser.driver.findElement(by.css("body"));
        elements.clear();
        elements.sendKeys(config.quicktextNew.body);
        browser.driver.switchTo().defaultContent();
        element(by.model('templateForm.selectedTemplate.title')).submit().then(function () {
            browser.sleep(config.sleepTime);
            expect(element(by.css('.quicktext-modal')).getCssValue('display')).toBe('none');
        });
    });

    it('should log into Gmail', function () {

        browser.driver.get('https//gmail.com');//config.gmail.url);
        browser.driver.findElement(by.css('#Email')).sendKeys(config.gmail.user);
        browser.driver.findElement(by.css('#Passwd')).sendKeys(config.gmail.password);
        browser.driver.findElement(by.css('#Passwd')).submit().then(function () {

            browser.driver.wait(function () {
                return browser.driver.element(by.css(config.gmailContainerSelector)).isPresent();
            });

            expect(browser.driver.getCurrentUrl()).toContain('#inbox');

        });

    });

    it('should open the Compose window', function () {

        browser.driver.findElement(by.css('[gh=cm]')).click();

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.messageBodySelector)).isPresent();
        });

        expect(browser.driver.element(by.css(config.messageBodySelector))).toBe(true);

    });

    it('should show the autocomplete dropdown', function () {

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut);

        // trigger the autocomplete dialog with the keyboard shortcut

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.autocompleteShortcut);


        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.autocompleteDropdownSelector)).isPresent();
        });

        expect(browser.driver.element(by.css(config.autocompleteDropdownSelector))).isPresent().toBe(true);

    });

    it('should contain the quicktext in the autocomplete dropdown', function () {

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.autocompleteDropdownSelector)).isPresent();
        });

        expect(
            browser.driver.findElement(by.css(config.autocompleteDropdownSelector)).getText()
        ).toContain(config.quicktextNew.title);

    });

    it('should activate the quicktext by clicking on the autocomplete listing', function () {

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.autocompleteDropdownSelector)).isPresent();
        });

        browser.driver.findElement(by.css(config.autocompleteDropdownSelector + ' li:first-child')).click();

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });

    it('should activate the quicktext by pressing Enter', function () {

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.messageBodySelector)).isPresent();
        });

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.autocompleteShortcut);

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.autocompleteDropdownSelector)).isPresent();
        });

        var autocompleteSearch = config.autocompleteDropdownSelector + ' input[type=search]';

        browser.driver.wait(function () {
            return browser.driver.element(by.css(autocompleteSearch)).isPresent();
        });

        browser.driver.findElement(by.css(autocompleteSearch)).sendKeys(protractor.Key.ENTER);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });

    it('should activate the quicktext by pressing Tab', function () {

        browser.driver.wait(function () {
            return browser.driver.element(by.css(config.messageBodySelector)).isPresent();
        });

        // cleanup everything in the message body
        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.deleteAll);

        browser.driver.findElement(by.css(config.messageBodySelector)).sendKeys(config.quicktextNew.shortcut + protractor.Key.TAB);

        expect(
            browser.driver.findElement(by.css(config.messageBodySelector)).getText()
        ).toContain(config.quicktextNew.body);

    });


});
