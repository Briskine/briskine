import webpack from 'webpack';
import path from 'path';
import {zip} from 'zip-a-folder';
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import packageFile from './package.json';
import manifestFile from './src/manifest.json';
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

    return new CopyWebpackPlugin({
        patterns: [
            {
                from: './src/manifest.json',
                transform: function () {
                    // generates the manifest file using the package.json information
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
            const output = stats.compilation.options.output;
            const zipPath = path.join(output.path, output.filename);
            await zip(this.options.folder, zipPath);
        });
    }
}

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject
            this.resolve = resolve
        })
    }
}

let doneStatus = {}

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

                const done = doneStatus[this.waitFor]
                done.promise.then(() => {
                    logger.log(`${this.status} config is done.`);
                    logger.log(`Start ${this.status} config.`);
                    callback();
                });
            });
        });

        compiler.hooks.done.tap(this.name, (compilation) => {
            doneStatus[this.status].resolve()
        });
    }
}

function sequence (configs = []) {
    let waitFor
    return configs.map((config, i) => {
        // add doneplugin to each config
        config.plugins.push(
            new DonePlugin(config.name, waitFor)
        )

        waitFor = config.name
        return config
    })
}


function createPackage () {
    const filename = `${packageFile.name}-${manifestFile.version}.zip`;
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


const commonConfig = function (env) {
    return {
        name: 'common',
        output: {
            path: devPath
        },
        plugins: [
            // clean the build folder
            new CleanWebpackPlugin({
                cleanStaleWebpackAssets: false
            }),
            generateManifest(env),
            new CopyWebpackPlugin({
                patterns: [
                    { from: 'src/_locales/', to: '_locales/' },
                    { from: 'src/pages/', to: 'pages/' },
                    { from: 'src/icons/', to: 'icons/' },
                    { from: 'LICENSE', to: '' }
                ]
            })
        ],
        devServer: devServer
    };
};

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
                    test: /\.(css|styl)$/i,
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

module.exports = mode => {
    const env = process.env.NODE_ENV || mode;
    if (env === 'production') {
        devtool = 'none';
        return sequence([
            commonConfig(env),
            backgroundConfig(env),
            contentConfig(env),
            popupConfig(env),
            createPackage()
        ]);
    }
    return sequence([
        commonConfig(env),
        backgroundConfig(env),
        contentConfig(env),
        popupConfig(env)
    ]);
};
