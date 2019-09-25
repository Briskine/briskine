"use strict";

var webpack = require("webpack");
var path = require("path");
var stylus = require("stylus");
var fileSystem = require("fs");
var jshint = require("jshint-loader");
var CleanWebpackPlugin = require("clean-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var WriteFilePlugin = require("write-file-webpack-plugin");
var ConcatPlugin = require('webpack-concat-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var extractBackgroundStyle = new ExtractTextPlugin('background/css/background.css');
var extractContentStyle = new ExtractTextPlugin('content/css/content.css');
var merge = require("webpack-merge");
var dev = require("./config/webpack.dev");
var build = require("./config/webpack.build");
var test = require("./config/webpack.test");
var myPackage = require("./package.json");
var manifest = require("./src/manifest.json");

const dependencies = {
        background: {
            js: [
                'raven-js/dist/raven.min.js',
                'jquery/dist/jquery.min.js',
                'bootstrap/dist/js/bootstrap.min.js',
                'underscore/underscore-min.js',
                'underscore.string/dist/underscore.string.min.js',
                'js-md5/build/md5.min.js',
                'handlebars/dist/handlebars.js',
                'moment/min/moment.min.js',
                'mousetrap/mousetrap.min.js',
                'mousetrap/plugins/record/mousetrap-record.min.js',

                'angular/angular.min.js',
                'angular-route/angular-route.min.js',
                'angular-resource/angular-resource.min.js',
                'angular-moment/angular-moment.min.js',

                'checklist-model/checklist-model.js',
                'ng-file-upload/ng-file-upload-all.min.js',

                'microplugin/src/microplugin.js',
                'sifter/sifter.min.js',
                'selectize/dist/js/selectize.min.js',

                'tinymce/tinymce.min.js',
                'tinymce/themes/modern/theme.min.js',
                'angular-ui-tinymce/src/tinymce.js',
                'tinymce/plugins/autoresize/plugin.js',
                'tinymce/plugins/autolink/plugin.js',
                'tinymce/plugins/image/plugin.js',
                'tinymce/plugins/link/plugin.js',
                'tinymce/plugins/media/plugin.js',
                'tinymce/plugins/table/plugin.js',
                'tinymce/plugins/advlist/plugin.js',
                'tinymce/plugins/lists/plugin.js',
                'tinymce/plugins/textcolor/plugin.js',
                'tinymce/plugins/imagetools/plugin.js',
                'tinymce/plugins/code/plugin.js',

                'fuse.js/src/fuse.min.js',

                'papaparse/papaparse.min.js',

                './firebase/config-firebase.js',
                './firebase/firebase.umd.js',

                // Should be first
                './src/background/js/environment.js',
                './src/background/js/config.js',
                './src/background/js/utils/amplitude.js',

                './src/common/*.js',

                './src/store/store-client.js',

                './src/background/js/**/*.js'
                ],
                css: [
                    'tinymce/skins/lightgray/skin.min.css',
                    'tinymce/skins/lightgray/content.min.css'
                ]
            },
        store: {
            js: [
                './src/background/js/environment.js',
                './src/background/js/config.js',

                './src/store/plugin-api.js',
                './src/store/plugin-firestore.js',
                './src/store/store-background.js'
            ]
        },
        content: {
            js: [
                'raven-js/dist/raven.min.js',
                'jquery/dist/jquery.min.js',
                'underscore/underscore-min.js',
                'handlebars/dist/handlebars.min.js',
                'moment/min/moment.min.js',
                'mousetrap/mousetrap.js',
                'mousetrap/plugins/global-bind/mousetrap-global-bind.js',
                'fuse.js/src/fuse.min.js',

                './src/background/js/environment.js',
                './src/common/*.js',

                './src/store/store-client.js',

                // order is important here
                './src/content/js/patterns.js',
                './src/content/js/index.js',
                './src/content/js/utils.js',
                './src/content/js/autocomplete.js',
                './src/content/js/keyboard.js',
                './src/content/js/dialog.js',
                './src/content/js/events.js',

                './src/content/js/plugins/*.js'
            ]
        }
    };

const commonConfig = merge([
    {
        module: {
            rules: [
                {
                    test: /\.(css|styl)$/i,
                    include: [
                        path.resolve(__dirname, 'src/background')
                    ],
                    use: extractBackgroundStyle.extract({
                        use: ['css-loader', 'stylus-loader']
                    })
                },
                {
                    test: /\.(css|styl)$/i,
                    include: [
                        path.resolve(__dirname, 'src/content')
                    ],
                    use: extractContentStyle.extract({
                        use: ['css-loader', 'stylus-loader']
                    })
                },
                {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    loader: 'url-loader?name=icons/[name].[ext]limit=100000',
                },
            ]
        },
        plugins: [
            // clean the build folder
            new CleanWebpackPlugin(["ext"]),
            new CopyWebpackPlugin([
                {   from: "src/_locales/", to: "_locales/"  },
                {   from: "src/pages/", to: "pages/"  },
                {   from: "src/icons/", to: "icons/"  },
                {   from: "src/LICENSE", to: ""  },
                {   from: "node_modules/font-awesome/fonts/", to: "background/fonts/"},
                {   from: "node_modules/tinymce/skins/lightgray/fonts/", to: "background/css/fonts/"},
                {   from: "node_modules/tinymce/skins/lightgray/", to: "pages/tinymce/skins/lightgray/"},
            ]),
            new ConcatPlugin(
                {
                    uglify: false,
                    sourceMap: true,
                    name: 'background',
                    outputPath: 'background/js',
                    fileName: '[name].js',
                    filesToConcat: dependencies.background.js,
                    attributes: {
                        async: true
                    }
                }
            ),
            new ConcatPlugin(
                {
                    uglify: false,
                    sourceMap: true,
                    name: 'content',
                    outputPath: 'content/js',
                    fileName: '[name].js',
                    filesToConcat: dependencies.content.js,
                    attributes: {
                        async: true
                    }
                }
            ),
            new ConcatPlugin(
                {
                    uglify: false,
                    sourceMap: true,
                    name: 'store',
                    outputPath: 'store/js',
                    fileName: '[name].js',
                    filesToConcat: dependencies.store.js,
                    attributes: {
                        async: true
                    }
                }
            ),
            extractBackgroundStyle,
            extractContentStyle,
            new WriteFilePlugin(),
        ],
    },
]);
const developmentConfig = merge([
    dev.devServer({
        host: process.env.HOST,
        port: process.env.PORT,
    }),
    dev.setPath({
        output: __dirname + "/ext"
    }),
]);
const productionConfig = merge([
    build.setPath({
        output: __dirname + "/ext"
    }),
    build.archive({
        path: __dirname + "/build",
        filename: myPackage.name + '-' + manifest.version,
    }),
]);
module.exports = mode => {
    if ( mode === "production" ){
        return merge(commonConfig, build.generateManifestProduction({}), productionConfig,  { mode });
    }
    return merge(commonConfig, developmentConfig, dev.generateManifest({}), { mode });
};
