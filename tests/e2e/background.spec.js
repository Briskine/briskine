/* Tests for the options page
 */

describe('background suite', function(){
  var optionsUrl = 'chrome-extension://cfooooochgpnlahkobanknlnabbpnfab/pages/bg.html';
  var ptor = protractor.getInstance();

  it('should show something', function(){
    // use plain driver
    // to prevent complaining about angular not being available
    ptor.driver.get(optionsUrl + '#/');
    expect(true).toBe(true);
  });
})
