/* Tests for the Options page
 */

describe('Background script', function () {

    var config = require('./config.js');

    it('should open the Options page', function () {

        config.GetExtensionId(function() {

            browser.get(config.optionsUrl);

            browser.driver.wait(function () {
                return browser.driver.isElementPresent(by.css('.view-container'));
            });

            expect(browser.getTitle()).toBe('Gorgias Options');

        });

    });

    it('should redirect to the List view', function () {
        browser.driver.get(config.optionsUrl);

        expect(browser.getCurrentUrl()).toContain('/list');
    });

    it('should open the New Quicktext dialog', function () {
        element(by.css('[href="#/list?id=new"]')).click();

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

        element(by.model('selectedTemplate.tags')).clear().sendKeys(config.quicktextNew.tags);

        browser.sleep(5000);

        element(by.model('selectedTemplate.title')).clear().sendKeys(config.quicktextNew.title);

        browser.sleep(5000);

        element(by.model('selectedTemplate.body')).clear().sendKeys(config.quicktextNew.body);

        browser.sleep(5000);

        element(by.model('selectedTemplate.subject')).clear().sendKeys(config.quicktextNew.subject);

        browser.sleep(5000);

        element(by.model('selectedTemplate.shortcut')).clear().sendKeys(config.quicktextNew.shortcut);

        browser.sleep(5000);

        element(by.model('selectedTemplate.body')).submit().then(function() {

            browser.sleep(config.sleepTime);


            expect(element(by.css('.quicktext-modal')).getCssValue('display')).toBe('none');

        });

    });

    it('should contain the new quicktext in the list', function () {
        var newItem = element(by.repeater('quicktext in filteredQuicktexts').row(0));

        expect(newItem.getText()).toContain(config.quicktextNew.title);
    });

    it('should open the edit modal', function () {
        element.all(by.repeater('quicktext in filteredQuicktexts')).then(function (elems) {
            elems[0].element(by.css('.edit-button')).click();
            browser.driver.sleep(config.sleepTime);
            var modal = element(by.css('.quicktext-modal'));
            expect(modal.getCssValue('display')).toBe('block');
        });
    });

    it('should contain the quicktext details', function () {

        var title = element(by.model('selectedTemplate.title'));
        expect(title.getAttribute('value')).toBe(config.quicktextNew.title);

        var shortcut = element(by.model('selectedTemplate.shortcut'));
        expect(shortcut.getAttribute('value')).toBe(config.quicktextNew.shortcut);

        var subject = element(by.model('selectedTemplate.subject'));
        expect(subject.getAttribute('value')).toBe(config.quicktextNew.subject);

        var tags = element(by.model('selectedTemplate.tags'));
        expect(tags.getAttribute('value')).toBe(config.quicktextNew.tags);

        var body = element(by.model('selectedTemplate.body'));
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

        var title = element(by.model('selectedTemplate.title'));
        title.sendKeys(config.deleteAll + config.quicktextNew.title);

        btnSubmit.click();

        browser.driver.sleep(config.sleepTime);

        expect(modal.getCssValue('display')).toBe('none');
    });

    it('should filter the quicktexts', function () {
        var searchField = element(by.model('searchText'));
        var list = element.all(by.repeater('quicktext in filteredQuicktexts'));

        searchField.sendKeys(config.quicktextNew.title);

        browser.driver.sleep(config.sleepTime);
        expect(list.count()).toBe(1);
    });

    it('should delete the new quicktext', function () {
        element(by.model('searchText')).sendKeys(config.deleteAll);

        browser.driver.sleep(config.sleepTime);

        element.all(by.repeater('quicktext in filteredQuicktexts')).then(function(elems) {

            var previousCount = elems.length;

            elems[0].element(by.css('button.close')).click();

            browser.driver.sleep(config.sleepTime);

            expect(element.all(by.repeater('quicktext in filteredQuicktexts')).count()).toBe(previousCount - 1);
        });
    });
})
