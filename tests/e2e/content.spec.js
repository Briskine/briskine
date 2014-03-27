/* Tests for the contentscript
 */

describe('content script', function(){

  var gmail = {
        url: 'https://mail.google.com/',
        user: process.env.QUICKTEXT_GMAIL_USERNAME,
        password: process.env.QUICKTEXT_GMAIL_PASSWORD
      },
      gmailContainerSelector = '.AO',
      messageBodySelector = '[aria-label="Message Body"]';

  it('should log-in into Gmail', function() {

    browser.driver.get(gmail.url);

    browser.driver.findElement(by.css('#Email')).sendKeys(gmail.user);
    browser.driver.findElement(by.css('#Passwd')).sendKeys(gmail.password);

    browser.driver.findElement(by.css('#Passwd')).submit().then(function() {

      browser.driver.wait(function() {
        return browser.driver.isElementPresent(by.css(gmailContainerSelector));
      });

      expect(browser.driver.getCurrentUrl()).toContain('#inbox');

    });

  });

  it('should open the Compose window', function() {

    browser.driver.findElement(by.css('[gh=cm]')).click();

    browser.driver.wait(function() {
      return browser.driver.isElementPresent(by.css(messageBodySelector));
    });

    expect(browser.driver.findElement(by.css(messageBodySelector)).isPresent()).toBe(true);

  });

  it('should activate a quicktext using Tab', function() {

    browser.driver.findElement(by.css(messageBodySelector)).sendKeys('test');

    browser.driver.sleep(5000);

    expect(browser.driver.getCurrentUrl()).toContain('#inbox');

  });


});
