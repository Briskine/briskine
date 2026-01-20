/* globals Buffer */
import fs from 'fs'
import webpack from 'webpack'
import path from 'path'
import {globSync} from 'glob'
import archiver from 'archiver'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import {PurgeCSSPlugin} from 'purgecss-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import firebaseTools from 'firebase-tools'

const packageFile = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const manifestFile = JSON.parse(fs.readFileSync('./src/manifest.json', 'utf8'))

const defaultFirebaseConfig = {
  projectId: 'demo-briskine-development',
  apiKey: '123',
  storageBucket: 'demo-briskine-development-bucket'
}

const devPath = path.resolve('ext')
const productionPath = path.resolve('build')

// the manifest description is limited to 112 characters on Safari
// https://github.com/w3c/webextensions/issues/218
const safariManifestDescription = 'Write emails faster! Increase your productivity with templates and shortcuts on Gmail, Outlook, or LinkedIn.'

function generateManifest ({ safari, mode, manifest }) {
  let updatedManifestFile = Object.assign({}, manifestFile)
  // get version from package
  updatedManifestFile.version = packageFile.version

  // safari manifest
  if (safari) {
    updatedManifestFile.description = safariManifestDescription
    updatedManifestFile.background.persistent = false
  }

  // source maps
  if (mode === 'development') {
    updatedManifestFile.web_accessible_resources[0].resources = updatedManifestFile.web_accessible_resources[0].resources.concat(
      Array('content', 'page', 'sandbox').map((script) => `${script}/${script}.js.map`)
    )
  }

  // manifest v2
  if (manifest === '2') {
    updatedManifestFile.manifest_version = 2
    updatedManifestFile.background.scripts = [updatedManifestFile.background.service_worker]
    delete updatedManifestFile.background.service_worker
    updatedManifestFile.background.persistent = false
    updatedManifestFile.permissions = updatedManifestFile.permissions
      .concat(updatedManifestFile.host_permissions)
    delete updatedManifestFile.host_permissions
    updatedManifestFile.web_accessible_resources = updatedManifestFile.web_accessible_resources[0].resources
    delete updatedManifestFile.sandbox
    updatedManifestFile.browser_action = updatedManifestFile.action
    delete updatedManifestFile.action
    updatedManifestFile.content_security_policy = updatedManifestFile.content_security_policy.extension_pages
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

function extensionConfig ({ mode, safari, manifest, firebaseConfig}) {
  const plugins = [
    generateManifest({ mode, safari, manifest }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/icons/', to: 'icons/' },
        { from: 'src/content/sandbox/sandbox.html', to: 'sandbox/' },
        { from: 'LICENSE', to: '' }
      ]
    }),
    new webpack.DefinePlugin({
      ENV: JSON.stringify(mode),
      REGISTER_DISABLED: safari,
      FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
      VERSION: JSON.stringify(packageFile.version),
      MANIFEST: JSON.stringify(manifest),
    }),
    new MiniCssExtractPlugin({
      filename: '[name]/[name].css'
    }),
    new PurgeCSSPlugin({
      paths: globSync('src/**/*',  {nodir: true, dotRelative: true})
    })
  ]

  if (mode === 'production') {
    const zipFilename = `${packageFile.name}-${packageFile.version}-manifest${manifest}.zip`
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
          test: /\/content\/.+.(css)$/i,
          use: [
            {
              loader: 'css-loader',
              options: {
                exportType: 'string'
              }
            }
          ]
        },
        {
          test: /(\/popup\/|\/content\/attachments\/).+.(css)$/i,
          use: [
              MiniCssExtractPlugin.loader,
              'css-loader'
          ]
        },
        {
          test: /\.(png)$/,
          type: 'asset'
        },
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                'babel-preset-solid',
                [
                  '@babel/preset-env',
                  {
                    corejs: '3.42',
                    useBuiltIns: 'usage',
                  },
                ]
              ],
            }
          }
        },
        {
          test: /\.svg$/i,
          resourceQuery: { not: [/raw/] },
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['babel-preset-solid'],
              },
            },
            {
              loader: '@svgr/webpack',
              options: {
                babel: false,
                jsxRuntime: 'automatic',
                svgo: false,
              },
            }
          ],
        },
      ]
    },
    devtool: mode === 'production' ? false : 'cheap-module-source-map',
    resolve: {
      alias: {
        'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
        'handlebars': 'handlebars/dist/cjs/handlebars'
      }
    },
    optimization: {
      minimizer: [
        '...',
        new CssMinimizerPlugin(),
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
    const firebaseConfigFile = `./.firebase-config-${env.mode}.json`
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf8'))
    } catch {
      // needed for ci
      try {
        await firebaseTools.use(`gorgias-templates-${env.mode}`)
        const appConfig = await firebaseTools.apps.sdkconfig()
        firebaseConfig = appConfig.sdkConfig

        fs.writeFileSync(firebaseConfigFile, JSON.stringify(firebaseConfig))
      } catch (err) {
        // eslint-disable-next-line
        console.warn(err)
      }
    }
  }

  const params = {
    firebaseConfig: firebaseConfig,
    manifest: '3',
    safari: false,
    mode: 'production',
    ...env,
  }

  return extensionConfig(params)
}
