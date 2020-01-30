var webpack = require('webpack');
var path = require('path');
var stylus = require('stylus');
var fileSystem = require('fs');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ConcatPlugin = require('webpack-concat-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var extractBackgroundStyle = new ExtractTextPlugin('background/css/background.css');
var merge = require('webpack-merge');
var dev = require('./config/webpack.dev');
var build = require('./config/webpack.build');
var myPackage = require('./package.json');
var manifest = require('./src/manifest.json');

const commonConfig = merge([
    {
        plugins: [
            // clean the build folder
            new CleanWebpackPlugin(['ext']),
            new CopyWebpackPlugin([
                {   from: 'src/_locales/', to: '_locales/'  },
                {   from: 'src/pages/', to: 'pages/'  },
                {   from: 'src/icons/', to: 'icons/'  },
                {   from: 'src/LICENSE', to: ''  },
                {   from: 'node_modules/font-awesome/fonts/', to: 'background/fonts/'},
                {   from: 'node_modules/tinymce/skins/lightgray/fonts/', to: 'background/css/fonts/'},
                {   from: 'node_modules/tinymce/skins/lightgray/', to: 'pages/tinymce/skins/lightgray/'},
            ]),
        ],
        devServer: {
            inline: false,
            writeToDisk: true
        }
    }
]);

const optionsConfig = function (mode) {
    const env = process.env.NODE_ENV || mode
    return {
        mode: 'development',
        entry: {
            background: './src/background/js/app.js'
        },
        output: {
            path: __dirname + '/ext/background',
            filename: 'js/[name].js'
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: 'css/[name].css'
            }),
            new webpack.DefinePlugin({
                ENV: JSON.stringify(env),
            }),
            new webpack.ProvidePlugin({
                jQuery: 'jquery',
                $: 'jquery',
                _: 'underscore'
            }),
        ],
        module: {
            rules: [
                {
                    test: /\.(css|styl)$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'stylus-loader'
                    ],
                },
                {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    loader: 'url-loader?name=icons/[name].[ext]limit=100000',
                },
            ]
        },
        devServer: {
            inline: false,
            writeToDisk: true
        },
        devtool: 'cheap-source-map'
    }
};

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
    },
    devtool: 'eval'
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
            optionsConfig(mode),
            merge(commonConfig, build.generateManifestProduction({}), productionConfig,  { mode })
        ]
    }
    return [
        storeConfig(mode),
        contentConfig,
        optionsConfig(mode),
        merge(commonConfig, developmentConfig, dev.generateManifest({}), { mode }),
    ];
};
