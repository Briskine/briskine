/* Tests for the Options page
 */

describe('background suite', function(){
  var optionsUrl = 'chrome-extension://cfooooochgpnlahkobanknlnabbpnfab/pages/bg.html';

  var quicktext = {
    title: 'Test quicktext title ' + new Date().getTime(),
    shortcut: 'Q',
    subject: 'Test quicktext subject',
    tags: 'tag1, tag2, tag3',
    body: 'Test quicktext body'
  };

  it('should open the Options page', function(){
    // use plain driver
    // to prevent complaining about angular not being available
    browser.driver.get(optionsUrl);

    expect(browser.getTitle()).toBe('Quicktext Options');
  });

  it('should redirect to the List view', function(){
    browser.driver.get(optionsUrl);

    expect(browser.getCurrentUrl()).toContain('/list');
  });

  it('should open the New Quicktext dialog', function() {
    element(by.css('[href="#/list?id=new"]')).click();

    element(by.css('.quicktext-modal')).getCssValue('display').then(function(display) {
      expect(display).toBe('block');
    });

  });

  it('should not submit the New Quicktext form because of validation', function() {
    var modal = element(by.css('.quicktext-modal'));
    var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));

    btnSubmit.click();

    expect(modal.getCssValue('display')).toBe('block');
  });

  it('should submit a New Quicktext and hide the dialog', function() {
    var modal = element(by.css('.quicktext-modal'));
    var btnSubmit = element(by.css('.quicktext-modal [type=submit]'));

    var title = element(by.model('selectedQt.title'));
    title.sendKeys(quicktext.title);

    var shortcut = element(by.model('selectedQt.shortcut'));
    shortcut.sendKeys(quicktext.shortcut);

    var subject = element(by.model('selectedQt.subject'));
    subject.sendKeys(quicktext.subject);

    var tags = element(by.model('selectedQt.tags'));
    tags.sendKeys(quicktext.tags);

    var body = element(by.model('selectedQt.body'));
    body.sendKeys(quicktext.body);

    btnSubmit.click();

    expect(modal.getCssValue('display')).toBe('none');
  });

  it('should contain the new quicktext in the list', function() {
    var list = element(by.css('.quicktexts-list'));

    expect(list.getText()).toContain(quicktext.title);
  });

  // TODO delete newly added quicktext
  it('should delete the newly added quicktext', function() {
    var list = element.all(by.css('.quicktexts-list .list-group-item'));

    list.each(function(item) {

      item.getText().then(function(text) {
        if(text.indexOf(quicktext.title) !== -1) {
          item.findElement(by.css('button.close')).click();
        }
      });

    });

    //expect(list.getText()).toContain(quicktext.title);
  });

})
