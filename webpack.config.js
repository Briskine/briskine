var webpack = require("webpack"),
    path = require("path"),
    stylus = require("stylus")
    fileSystem = require("fs"),
    jshint = require("jshint-loader")
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyWebpackPlugin = require("copy-webpack-plugin"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    WriteFilePlugin = require("write-file-webpack-plugin"),
    ConcatPlugin = require('webpack-concat-plugin'),
    ExtractTextPlugin = require('extract-text-webpack-plugin'),
    merge = require("webpack-merge"),
    dev = require("./config/webpack.dev"),
    build = require("./config/webpack.build"),
    test = require("./config/webpack.test"),
    package = require("./package.json"),
    manifest = require("./src/manifest.json"),

    dependencies = {
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
                'tinymce/plugins/contextmenu/plugin.js',
                'tinymce/plugins/code/plugin.js',

                'fuse.js/src/fuse.min.js',

                // Should be first
                './src/background/js/environment.js',
                './src/background/js/utils/amplitude.js',
                './src/common/*.js',
                './src/background/js/**/*.js'
                ],
                css: [
                    'tinymce/skins/lightgray/skin.min.css',
                    'tinymce/skins/lightgray/content.min.css'
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

                './src/common/*.js',

                // order is important here
                './src/content/js/patterns.js',
                './src/content/js/index.js',
                './src/content/js/utils.js',
                './src/content/js/autocomplete.js',
                './src/content/js/keyboard.js',
                './src/content/js/dialog.js',
                './src/content/js/sidebar.js',
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
                    use: ExtractTextPlugin.extract({
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
                {   from: "node_modules/tinymce/skins/lightgray/", to: "pages/tinymce/skins/lightgray/"}
            ]),
            new ConcatPlugin(
                {
                    uglify: false,
                    sourceMap: false,
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
                    sourceMap: false,
                    name: 'content',
                    outputPath: 'content/js',
                    fileName: '[name].js',
                    filesToConcat: dependencies.content.js,
                    attributes: {
                        async: true
                    }
                }
            ),
            new ExtractTextPlugin({
                // `allChunks` is needed to extract from extracted chunks as well.
                allChunks: true,
                filename: "background/css/background.css",
            }),
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
        filename: package.name + '-' + manifest.version,
    }),
]);
module.exports = mode => {
    if ( mode === "production" ){
        return merge(commonConfig, productionConfig, build.generateManifestProduction({}), { mode });
    }

    return merge(commonConfig, developmentConfig, dev.generateManifest({}), { mode });
};