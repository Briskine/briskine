/* License: MIT.
 * Copyright (C) 2013, 2014, Uri Shaked.
 */

'use strict';

module.exports = function (config) {
	config.set({
		basePath: '',
		frameworks: ['jasmine'],
		logLevel: config.LOG_INFO,
		browsers: ['PhantomJS'],
		autoWatch: true,
		reporters: ['dots', 'coverage'],
		files: [
			'components/angular/angular.js',
			'components/angular-mocks/angular-mocks.js',
			'components/moment/moment.js',
			'components/moment/lang/fr.js',
			'components/moment-timezone/moment-timezone.js',
			'angular-moment.js',
			'tests.js'
		],
		preprocessors: {
			'components/moment/moment.js': 'coverage',
			'angular-moment.js': 'coverage'
		}
	});
};
