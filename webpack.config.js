const webpack = require('webpack');
const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const packageFile = require('./package.json');
const manifestFile = require('./src/manifest.json');
const devManifestKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4fz+r4Bt92pF09QQkdrVrJRt/OYUWTg6mBHGyp0u6suCPaPFJ1mysOAphZIAhCPw4O/lsQ8AlLkHgFzpb5z7IjmrU3FB1dJXGifXDY6ybZi/CcZUY0g30Do+bowHKNHRnkYIl625jaQwvrKm9ZYseIPIbCOtDHSBoD579tbP+aYLxZV+aVBmvD7O2HayVzMgL8xc+imk2gRzmu0zVjgQ+WqlGApTsEtucsVUVrNTf6Txl9nDCN9ztRJwLH7VASKctHeHMwmK1uDZgkokdO5FjHYEp6VB7c4Pe/Af1l0/Dct9HgK8aFXtsmIZa7zWPrgAihBqKVaWMk4iJTmmXfNZxQIDAQAB';
let devtool = 'cheap-module-source-map';
const devServer = {
    inline: false,
    writeToDisk: true
};

const devPath = path.resolve('ext');
const productionPath = path.resolve('build');

function generateManifest (env) {
    let updatedManifestFile = Object.assign({}, manifestFile);
    if (env === 'production') {
        delete updatedManifestFile.key;
    } else {
        updatedManifestFile.key = devManifestKey;
        // Load content script on localhost
        updatedManifestFile.content_scripts[0].matches.push('http://localhost/gmail/*');
        updatedManifestFile.content_scripts[0].matches.push('https://localhost/gmail/*');
    }

    return new CopyWebpackPlugin([
        {
            from: './src/manifest.json',
            transform: function () {
                // generates the manifest file using the package.json informations
                return Buffer.from(JSON.stringify(updatedManifestFile));
            }
        }
    ]);
}

function createPackage () {
    const filename = `${packageFile.name}-${manifestFile.version}`;
    return {
        name: 'package',
        output: {
            path: devPath
        },
        plugins: [
            new FileManagerPlugin({
                onEnd: {
                    archive: [
                        {
                            source: devPath,
                            destination: `${productionPath}/${filename}.zip`
                        },
                    ]
                }
            })
        ]
    };
}

const commonConfig = function (env) {
    return {
        output: {
            path: devPath
        },
        plugins: [
            // clean the build folder
            new CleanWebpackPlugin(),
            generateManifest(env),
            new CopyWebpackPlugin([
                { from: 'src/_locales/', to: '_locales/' },
                { from: 'src/pages/', to: 'pages/' },
                { from: 'src/icons/', to: 'icons/' },
                { from: 'src/LICENSE', to: '' },
                { from: 'node_modules/tinymce/skins/lightgray/', to: 'pages/tinymce/skins/lightgray/' },
            ])
        ],
        devServer: devServer
    };
};

const optionsConfig = function (env) {
    return {
        entry: {
            background: './src/background/js/app.js'
        },
        output: {
            path: path.resolve(devPath, 'background'),
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
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            plugins: ['babel-plugin-angularjs-annotate']
                        }
                    }
                }
            ]
        },
        devServer: devServer,
        devtool: devtool
    };
};

const contentConfig = () => {
    return {
        entry: {
            content: './src/content/js/index.js'
        },
        output: {
            path: path.resolve(devPath, 'content'),
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
        devServer: devServer,
        devtool: devtool
    };
};

const storeConfig = (env) => {
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
            path: path.resolve(devPath, 'store'),
            filename: 'js/store.js'
        },
        devServer: devServer,
        devtool: devtool
    };
};

module.exports = mode => {
    const env = process.env.NODE_ENV || mode;
    if (env === 'production') {
        devtool = 'source-map';
        return [
            commonConfig(env),
            storeConfig(env),
            contentConfig(),
            optionsConfig(env),
            createPackage(),
        ];
    }
    return [
        commonConfig(env),
        storeConfig(env),
        contentConfig(),
        optionsConfig(env),
    ];
};
