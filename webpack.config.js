/* globals Buffer */
/* jshint esversion: 8 */

import fs from 'fs';
import webpack from 'webpack';
import path from 'path';
import archiver from 'archiver';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import packageFile from './package.json';
import manifestFile from './src/manifest.json';

const devPath = path.resolve('ext');
const productionPath = path.resolve('build');

const safariManifestName = 'Briskine: Templates for Gmail';
const safariManifestDescription = 'Write emails faster! Increase your productivity with templates and shortcuts on Gmail, Outlook, or LinkedIn.';

function generateManifest (safari) {
    let updatedManifestFile = Object.assign({}, manifestFile);
    // get version from package
    updatedManifestFile.version = packageFile.version;

    // safari manifest
    if (safari) {
        updatedManifestFile.name = safariManifestName;
        updatedManifestFile.description = safariManifestDescription;
    }

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
        compiler.hooks.done.tapAsync('ZipPlugin', (params, callback) => {
            const output = fs.createWriteStream(this.options.output);
            const zipArchive = archiver('zip');
            output.on('close', callback);
            zipArchive.pipe(output);
            zipArchive.directory(this.options.entry, false);
            zipArchive.finalize();
        });
    }
}

function extensionConfig (env, safari = false) {
    const plugins = [
        generateManifest(safari),
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
            REGISTER_DISABLED: safari
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
        entry: {
            background: './src/background/background.js',
            popup: './src/popup/popup.js',
            content: './src/content/js/index.js'
        },
        output: {
            path: path.resolve(devPath),
            filename: '[name]/[name].js',
            clean: true
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
                    test: /\.(png|svg)$/,
                    type: 'asset'
                }
            ]
        },
        devtool: 'cheap-module-source-map',
        resolve: {
            alias: {
                'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
                'handlebars': 'handlebars/dist/cjs/handlebars'
            }
        }
    };
}

export default function (env) {
    if (!env.mode) {
      throw new Error('No mode specified. See webpack.config.js.');
    }

    return extensionConfig(env.mode, env.safari);
}
