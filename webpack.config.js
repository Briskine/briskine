/* globals Buffer, console */
/* jshint esversion: 8 */

import fs from 'fs'
import webpack from 'webpack'
import path from 'path'
import glob from 'glob'
import archiver from 'archiver'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import PurgecssPlugin from 'purgecss-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import firebaseTools from 'firebase-tools'

const packageFile = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const manifestFile = JSON.parse(fs.readFileSync('./src/manifest.json', 'utf8'))

const defaultFirebaseConfig = {
  projectId: 'briskine-development',
  apiKey: '123',
  storageBucket: 'briskine-development-bucket'
}

const devPath = path.resolve('ext')
const productionPath = path.resolve('build')

const safariManifestDescription = 'Write emails faster! Increase your productivity with templates and shortcuts on Gmail, Outlook, or LinkedIn.'

function generateManifest (safari) {
  let updatedManifestFile = Object.assign({}, manifestFile)
  // get version from package
  updatedManifestFile.version = packageFile.version

  // safari manifest
  if (safari) {
    updatedManifestFile.description = safariManifestDescription
  }

  return new CopyWebpackPlugin({
    patterns: [
      {
        from: './src/manifest.json',
        transform: function () {
          return Buffer.from(JSON.stringify(updatedManifestFile))
        }
      }
    ]
  })
}

class ZipPlugin {
  constructor(options) {
    this.options = options
  }
  apply(compiler) {
    compiler.hooks.done.tapAsync('ZipPlugin', (params, callback) => {
      const output = fs.createWriteStream(this.options.output)
      const zipArchive = archiver('zip')
      output.on('close', callback)
      zipArchive.pipe(output)
      zipArchive.directory(this.options.entry, false)
      zipArchive.finalize()
    })
  }
}

function extensionConfig (env, safari = false, firebaseConfig = {}) {
  const plugins = [
    generateManifest(safari),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/icons/', to: 'icons/' },
        { from: 'src/background.html', to: '' },
        { from: 'LICENSE', to: '' }
      ]
    }),
    new webpack.DefinePlugin({
      ENV: JSON.stringify(env),
      REGISTER_DISABLED: safari,
      FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
      VERSION: JSON.stringify(packageFile.version),
    }),
    new MiniCssExtractPlugin({
      filename: '[name]/[name].css'
    }),
    new PurgecssPlugin({
      paths: glob.sync('src/**/*',  { nodir: true })
    })
  ]

  if (env === 'production') {
    const zipFilename = `${packageFile.name}-${packageFile.version}.zip`
    const zipPath = path.join(productionPath, zipFilename)
    plugins.push(
      new ZipPlugin({
        entry: devPath,
        output: zipPath
      })
    )
  }

  return {
    entry: {
      background: './src/background/background.js',
      popup: './src/popup/popup.js',
      content: './src/content/index.js',
      page: './src/content/page/page.js',
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
          ]
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
    },
    optimization: {
      minimizer: [
        '...',
        new CssMinimizerPlugin()
      ]
    }
  }
}

export default async function (env) {
  if (!env.mode) {
    throw new Error('No mode specified. See webpack.config.js.')
  }

  let firebaseConfig = defaultFirebaseConfig
  if (env.mode !== 'development') {
    try {
      await firebaseTools.use(`gorgias-templates-${env.mode}`)
      const appConfig = await firebaseTools.apps.sdkconfig()
      firebaseConfig = appConfig.sdkConfig
    } catch(err) {
      console.warn(err)
    }
  }

  return extensionConfig(env.mode, env.safari, firebaseConfig)
}
