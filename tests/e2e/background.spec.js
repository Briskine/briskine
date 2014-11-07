/* Tests for the Options page
 */

describe('Background script', function () {

    var config = require('./config.js');

    it('should open the Options page', function () {

        var foundExtension = false;

        browser.ignoreSynchronization = true;

        // use plain driver
        // to prevent complaining about angular not being available
        browser.driver.get(extensionsUrl);

        browser.driver.wait(function () {
            return browser.driver.isElementPresent(by.css('#extension-settings-list'));
        });

        var i = 0;
        var findExtension = function($details) {

            var $detail = $details[i];

            $detail.element(by.css('.extension-title')).getText().then(function(title) {

                if(title.indexOf(extensionName) !== -1) {

                    $detail.getAttribute('id').then(function(id) {
                        extensionId = id;

                        optionsUrl += extensionId + optionsUrlSuffix;

                        browser.get(optionsUrl);

                        browser.driver.wait(function () {
                            return browser.driver.isElementPresent(by.css('.view-container'));
                        });

                        expect(browser.getTitle()).toBe('Quicktext Options');

                        browser.ignoreSynchronization = false;


                    });

                } else {

                    i++;
                    findExtension($details);

                }

            });

        };

        element.all(by.css('.extension-list-item-wrapper')).then(findExtension);

    });

    it('should redirect to the List view', function () {
        browser.driver.get(optionsUrl);

        expect(browser.getCurrentUrl()).toContain('/list');
    });

    it('should open the New Quicktext dialog', function () {
        element(by.css('[href="#/list?id=new"]')).click();
        browser.driver.sleep(sleepTime);

        element(by.css('.quicktext-modal')).getCssValue('display').then(function (display) {
            expect(display).toBe('block');
        });

    });

    it('should not submit the New Quicktext form because of validation', function () {
        var modal = element(by.css('.quicktext-modal'));
        var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));

        btnSubmit.click();

        expect(modal.getCssValue('display')).toBe('block');
    });

    it('should submit a New Quicktext and hide the dialog', function () {
        var modal = element(by.css('.quicktext-modal'));
        var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));

        var title = element(by.model('selectedQt.title'));
        title.sendKeys(config.quicktextNew.title);

        var shortcut = element(by.model('selectedQt.shortcut'));
        shortcut.sendKeys(config.quicktextNew.shortcut);

        var subject = element(by.model('selectedQt.subject'));
        subject.sendKeys(config.quicktextNew.subject);

        var tags = element(by.model('selectedQt.tags'));
        tags.sendKeys(config.quicktextNew.tags);

        var body = element(by.model('selectedQt.body'));
        body.sendKeys(config.quicktextNew.body);

        btnSubmit.click();

        browser.driver.sleep(sleepTime);

        expect(modal.getCssValue('display')).toBe('none');
    });

    it('should contain the new quicktext in the list', function () {
        var newItem = element(by.repeater('quicktext in filteredQuicktexts').row(0));

        expect(newItem.getText()).toContain(config.quicktextNew.title);
    });

    it('should open the edit modal', function () {
        element.all(by.repeater('quicktext in filteredQuicktexts')).then(function (elems) {
            elems[0].element(by.css('.edit-button')).click();
            browser.driver.sleep(sleepTime);
            var modal = element(by.css('.quicktext-modal'));
            expect(modal.getCssValue('display')).toBe('block');
        });
    });

    it('should contain the quicktext details', function () {

        var title = element(by.model('selectedQt.title'));
        expect(title.getAttribute('value')).toBe(config.quicktextNew.title);

        var shortcut = element(by.model('selectedQt.shortcut'));
        expect(shortcut.getAttribute('value')).toBe(config.quicktextNew.shortcut);

        var subject = element(by.model('selectedQt.subject'));
        expect(subject.getAttribute('value')).toBe(config.quicktextNew.subject);

        var tags = element(by.model('selectedQt.tags'));
        expect(tags.getAttribute('value')).toBe(config.quicktextNew.tags);

        var body = element(by.model('selectedQt.body'));
        expect(body.getAttribute('value')).toBe(config.quicktextNew.body);

    });

    it('should contain the edited quicktext in the list', function () {
        var newItem = element(by.repeater('quicktext in filteredQuicktexts').row(0));

        expect(newItem.getText()).toContain(config.quicktextNew.title);
    });

    it('should edit the quicktext and hide the dialog', function () {
        var modal = element(by.css('.quicktext-modal'));
        var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));

        config.quicktextNew.title += '2';

        var title = element(by.model('selectedQt.title'));
        var del = protractor.Key.chord(protractor.Key.CONTROL, 'a') + protractor.Key.DELETE;
        title.sendKeys(del + config.quicktextNew.title);

        btnSubmit.click();

        browser.driver.sleep(sleepTime);

        expect(modal.getCssValue('display')).toBe('none');
    });

    it('should filter the quicktexts', function () {
        var searchField = element(by.model('searchText'));
        var list = element.all(by.repeater('quicktext in filteredQuicktexts'));

        searchField.sendKeys(config.quicktextNew.title);

        browser.driver.sleep(sleepTime);
        expect(list.count()).toBe(1);
    });

    it('should delete the new quicktext', function () {
        var del = protractor.Key.chord(protractor.Key.CONTROL, 'a') + protractor.Key.DELETE;
        element(by.model('searchText')).sendKeys(del);

        browser.driver.sleep(sleepTime);

        element.all(by.repeater('quicktext in filteredQuicktexts')).then(function(elems) {

            var previousCount = elems.length;

            elems[0].element(by.css('button.close')).click();

            browser.driver.sleep(sleepTime);

            expect(element.all(by.repeater('quicktext in filteredQuicktexts')).count()).toBe(previousCount - 1);
        });
    });
})
