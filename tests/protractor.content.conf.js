/* Protractor config
 * for content script testing
 */
var defaultConfig = require('./protractor.background.conf.js');

defaultConfig.config.specs = [
  './e2e/content.spec.js'
];

exports.config = defaultConfig.config;
