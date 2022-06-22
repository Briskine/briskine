/* eslint-env node */
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

// the manifest description is limited to 112 characters on Safari
// https://github.com/w3c/webextensions/issues/218
const safariManifestDescription = 'Write emails faster! Increase your productivity with templates and shortcuts on Gmail, Outlook, or LinkedIn.'

function generateManifest (params = {}) {
  let updatedManifestFile = Object.assign({}, manifestFile)
  // get version from package
  updatedManifestFile.version = packageFile.version

  // safari manifest
  if (params.safari) {
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

function extensionConfig (params = {}) {
  const plugins = [
    generateManifest(params),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/icons/', to: 'icons/' },
        { from: 'src/content/sandbox/sandbox.html', to: '' },
        { from: 'LICENSE', to: '' }
      ]
    }),
    new webpack.DefinePlugin({
      ENV: JSON.stringify(params.env),
      REGISTER_DISABLED: params.safari,
      FIREBASE_CONFIG: JSON.stringify(params.firebaseConfig),
      VERSION: JSON.stringify(packageFile.version),
    }),
    new MiniCssExtractPlugin({
      filename: '[name]/[name].css'
    }),
    new PurgecssPlugin({
      paths: glob.sync('src/**/*',  { nodir: true })
    })
  ]

  if (params.env === 'production') {
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
      sandbox: './src/content/sandbox/sandbox.js',
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
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        {
          test: /\.(css)$/i,
          resourceQuery: { not: [/raw/] },
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
    const firebaseConfigFile = './.firebase-config.json'
    try {
      await firebaseTools.use(`gorgias-templates-${env.mode}`)
      const appConfig = await firebaseTools.apps.sdkconfig()
      firebaseConfig = appConfig.sdkConfig

      fs.writeFileSync(firebaseConfigFile, JSON.stringify(firebaseConfig))
    } catch(err) {
      // eslint-disable-next-line
      console.warn('Reading Firebase credentials from file. This is only meant for the Firefox Add-On review process.')
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf8'))
      } catch (err) {
        // eslint-disable-next-line
        console.warn(err)
      }
    }
  }

  const params = Object.assign({
    firebaseConfig: firebaseConfig,
    manifest: '3',
    safari: false,
    mode: 'production',
  }, env)

  return extensionConfig(params)
}
