/* globals Buffer, module, process */
/*jshint esversion: 8 */

import webpack from 'webpack';
import path from 'path';
import {zip} from 'zip-a-folder';
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import packageFile from './package.json';
import manifestFile from './src/manifest.json';
let devtool = 'cheap-module-source-map';

// TODO completely deprecate webpack-dev-server
// use only webpack --watch directly
const devServer = {
    hot: false,
    inline: false,
    liveReload: false,
    writeToDisk: true,
    disableHostCheck: true
};

const devPath = path.resolve('ext');
const productionPath = path.resolve('build');

function generateManifest () {
    let updatedManifestFile = Object.assign({}, manifestFile);
    // get version from package
    updatedManifestFile.version = packageFile.version;

    return new CopyWebpackPlugin({
        patterns: [
            {
                from: './src/manifest.json',
                transform: function () {
                    return Buffer.from(JSON.stringify(updatedManifestFile));
                }
            }
        ]
    });
}

class ZipPlugin {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        compiler.hooks.done.tap('ZipPlugin', async (stats) => {
            await zip(this.options.entry, this.options.output);
        });
    }
}

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

let doneStatus = {};

class DonePlugin {
    constructor (status, waitFor) {
        this.name = 'DonePlugin';
        this.status = status;
        this.waitFor = waitFor;
        doneStatus[status] = new Deferred();
    }

    apply (compiler) {
        const logger = compiler.getInfrastructureLogger(this.name);

        const hooks = [ 'watchRun', 'run' ];
        hooks.forEach((hook) => {
            compiler.hooks[hook].tapAsync(this.name, (tap, callback) => {
                if (!this.waitFor) {
                    logger.log(`Start ${this.status} config.`);
                    return callback();
                }

                const done = doneStatus[this.waitFor];
                done.promise.then(() => {
                    logger.log(`${this.status} config is done.`);
                    logger.log(`Start ${this.status} config.`);
                    callback();
                });
            });
        });

        compiler.hooks.done.tap(this.name, () => {
            doneStatus[this.status].resolve();
        });
    }
}

function sequence (configs = []) {
    let waitFor;
    return configs.map((config) => {
        // add doneplugin to each config
        config.plugins.push(
            new DonePlugin(config.name, waitFor)
        );

        waitFor = config.name;
        return config;
    });
}


function createPackage () {
    const filename = `${packageFile.name}-${packageFile.version}.zip`;
    return {
        name: 'package',
        output: {
            path: productionPath,
            filename: filename
        },
        plugins: [
            new ZipPlugin({
                folder: devPath
            })
        ]
    };
}


function extensionConfig (env) {
    const plugins = [
        // clean the build folder
        new CleanWebpackPlugin({
            cleanStaleWebpackAssets: false
        }),
        generateManifest(env),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/popup/popup.html', to: 'popup/' },
                { from: 'src/pages/', to: 'pages/' },
                { from: 'src/icons/', to: 'icons/' },
                { from: 'LICENSE', to: '' }
            ]
        }),
        new webpack.DefinePlugin({
            ENV: JSON.stringify(env),
        }),
        new MiniCssExtractPlugin({
            filename: '[name]/[name].css'
        })
    ];

    if (env === 'production') {
        const zipFilename = `${packageFile.name}-${packageFile.version}.zip`;
        const zipPath = path.join(productionPath, zipFilename);
        plugins.push(
            new ZipPlugin({
                entry: devPath,
                output: zipPath
            })
        )
    }

    return {
        name: 'common',
        entry: {
            background: './src/background/background.js',
            popup: './src/popup/popup.js',
            content: './src/content/js/index.js'
        },
        output: {
            path: path.resolve(devPath),
            filename: '[name]/[name].js'
        },
        plugins: plugins,
        module: {
            rules: [
                {
                    test: /\.(css)$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader'
                    ],
                },
                {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            outputPath: '../assets',
                            publicPath: '/assets',
                        }
                    }
                }
            ]
        },
        devtool: devtool
    };
}

const popupConfig = (env) => {
    return {
        name: 'popup',
        entry: {
            popup: './src/popup/popup.js'
        },
        output: {
            path: path.resolve(devPath, 'popup'),
            filename: '[name].js'
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].css'
            }),
            new webpack.DefinePlugin({
                ENV: JSON.stringify(env),
            }),
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'src/popup/popup.html', to: '' },
                ]
            })
        ],
        module: {
            rules: [
                {
                    test: /\.(css)$/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader'
                    ],
                },
                {
                    test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            outputPath: '../assets',
                            publicPath: '/assets',
                        }
                    }
                }
            ]
        },
        devServer: devServer,
        devtool: devtool
    };
};

const contentConfig = (env) => {
    return {
        name: 'content',
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
            }),
            new webpack.DefinePlugin({
                ENV: JSON.stringify(env),
            })
        ],
        module: {
            rules: [
                {
                    test: /\.(css)$/i,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        'css-loader'
                    ],
                },
            ]
        },
        devServer: devServer,
        devtool: devtool
    };
};

const backgroundConfig = (env) => {
    return {
        name: 'background',
        entry: {
            content: './src/background/background.js'
        },
        plugins: [
            new webpack.DefinePlugin({
                ENV: JSON.stringify(env),
            })
        ],
        output: {
            path: path.resolve(devPath),
            filename: 'background.js'
        },
        devServer: devServer,
        devtool: devtool
    };
};

export default function (env) {
    if (!env.mode) {
      throw new Error('No mode specified. See webpack.config.js.');
    }

    return extensionConfig(env.mode)
}
