"use strict";

var webpack = require("webpack");
var path = require("path");
var stylus = require("stylus");
var fileSystem = require("fs");
var CleanWebpackPlugin = require("clean-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ConcatPlugin = require('webpack-concat-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var extractBackgroundStyle = new ExtractTextPlugin('background/css/background.css');
var merge = require("webpack-merge");
var dev = require("./config/webpack.dev");
var build = require("./config/webpack.build");
var myPackage = require("./package.json");
var manifest = require("./src/manifest.json");

const dependencies = {
        // TODO rename bundles
        // options page
        background: {
            js: [
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
            extractBackgroundStyle
        ],
        devServer: {
            inline: false,
            writeToDisk: true
        }
    }
]);

const contentConfig = {
    entry: {
        content: './src/content/js/index.js'
    },
    output: {
        path: __dirname + '/ext/content',
        filename: 'js/[name].js'
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'css/[name].css'
        })
    ],
    module: {
        rules: [
            {
                test: /\.(css|styl)$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    'css-loader',
                    'stylus-loader'
                ],
            },
        ]
    },
    devServer: {
        inline: false,
        writeToDisk: true
    }
};

const storeConfig = (mode) => {
    const env = process.env.NODE_ENV || mode
    return {
        entry: {
            content: './src/store/store-background.js'
        },
        plugins: [
            new webpack.DefinePlugin({
                ENV: JSON.stringify(env),
            })
        ],
        output: {
            path: __dirname + '/ext/store',
            filename: 'js/store.js'
        },
        devServer: {
            inline: false,
            writeToDisk: true
        },
        devtool: 'cheap-source-map'
    }
};

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
    if (mode === "production") {
        return [
            storeConfig(mode),
            contentConfig,
            merge(commonConfig, build.generateManifestProduction({}), productionConfig,  { mode })
        ]
    }
    return [
        storeConfig(mode),
        contentConfig,
        merge(commonConfig, developmentConfig, dev.generateManifest({}), { mode }),
    ];
};
