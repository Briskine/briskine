/* Tests for the Options page
 */

describe('Background script', function () {

    var config = require('./config.js');

    it('should open the Options page', function () {
        config.GetExtensionId(function () {
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

    it('should open the New Quicktext dialog', function () {
        browser.sleep(config.sleepTime);
        var elements = element(by.css('[href="#/list?id=new"]'));
        elements.click().then(function(){
            browser.sleep(config.sleepTime);
            element(by.css('.quicktext-modal')).getCssValue('display').then(function (display) {
                expect(display).toBe('block');
            });
        });
    });

    it('should not submit the New Quicktext form because of validation', function () {
        var modal = element(by.css('.quicktext-modal'));
        var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));
        btnSubmit.click().then(function(){
            browser.sleep(config.sleepTime);
            expect(modal.getCssValue('display')).toBe('block');
        });
    });

    it('should submit a New Template and hide the dialog', function () {
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

    it('should contain the new quicktext in the list', function () {
        var newItem = element(by.repeater('template in filteredTemplates').row(0));
        expect(newItem.getText()).toContain(config.quicktextNew.title);
    });

    it('should open the edit modal', function () {
        element.all(by.repeater('template in filteredTemplates')).then(function (elems) {
            elems[0].element(by.css('.list-group-item-link')).click();
            browser.driver.sleep(config.sleepTime);
            var modal = element(by.css('.quicktext-modal'));
            expect(modal.getCssValue('display')).toBe('block');
        });
    });

    it('should contain the template details', function () {
        var title = element(by.model('templateForm.selectedTemplate.title'));
        expect(title.getAttribute('value')).toBe(config.quicktextNew.title);
        var shortcut = element(by.model('templateForm.selectedTemplate.shortcut'));
        expect(shortcut.getAttribute('value')).toBe(config.quicktextNew.shortcut);
        browser.driver.switchTo().frame("qt-body_ifr");
        var body = browser.driver.findElement(by.css("body"));
        expect(body.getText()).toBe(config.quicktextNew.body);
        browser.driver.switchTo().defaultContent();
    });

    it('should contain the edited template in the list', function () {
        var newItem = element(by.repeater('template in filteredTemplates').row(0));
        expect(newItem.getText()).toContain(config.quicktextNew.title);
    });

    it('should edit the template and hide the dialog', function () {
        var modal = element(by.css('.quicktext-modal'));
        var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));
        config.quicktextNew.title += '2';
        var title = element(by.model('templateForm.selectedTemplate.title'));
        title.sendKeys(config.deleteAll + config.quicktextNew.title);
        btnSubmit.click();
        browser.driver.sleep(config.sleepTime);
        expect(modal.getCssValue('display')).toBe('none');
    });

    it('should filter the template', function () {
        var searchField = element(by.model('searchText'));
        var list = element.all(by.repeater('template in filteredTemplates'));
        searchField.sendKeys(config.quicktextNew.title);
        browser.driver.sleep(config.sleepTime);
        expect(list.count()).toBe(1);
    });

    it('should delete the new template', function () {
        element(by.model('searchText')).sendKeys(config.deleteAll);
        browser.driver.sleep(config.sleepTime);
        element.all(by.repeater('template in filteredTemplates')).then(function (elems) {
            var previousCount = elems.length;
            var button_delete = elems[0].element(by.css('.btn-delete'));
            browser.driver.sleep(3000); 
            button_delete.click();
            browser.switchTo().alert().accept();
            browser.driver.sleep(config.sleepTime);
            expect(element.all(by.repeater('template in filteredTemplates')).count()).toBe(previousCount - 1);
        });
    });
});
