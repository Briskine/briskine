/* jshint esversion: 8 */

import path from 'path';

export default {
    mode: 'development',
    entry: {
        test: './test/test.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve('test/bundle')
    },
    resolve: {
        alias: {
            'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
            'handlebars': 'handlebars/dist/cjs/handlebars'
        }
    }
};
