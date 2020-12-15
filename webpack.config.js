/* globals Buffer*/
/*jshint esversion: 8 */

import webpack from 'webpack';
import path from 'path';
import {zip} from 'zip-a-folder';
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import packageFile from './package.json';
import manifestFile from './src/manifest.json';

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
        compiler.hooks.done.tap('ZipPlugin', async () => {
            await zip(this.options.entry, this.options.output);
        });
    }
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
        );
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
        devtool: 'cheap-module-source-map'
    };
}

export default function (env) {
    if (!env.mode) {
      throw new Error('No mode specified. See webpack.config.js.');
    }

    return extensionConfig(env.mode);
}
