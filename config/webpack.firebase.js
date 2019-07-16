var webpack = require('webpack');

var config = {
    mode: 'production',
    entry: {
        app: `${__dirname}/firebase.js`,
    },
    output: {
        path: `${__dirname}/../firebase`,
        filename: 'firebase.umd.js',
        library: 'firebase',
        libraryTarget: 'umd'
    }
};

module.exports = config;
