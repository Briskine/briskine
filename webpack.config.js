/* globals Buffer */
import fs from 'fs'
import webpack from 'webpack'
import path from 'path'
import {globSync} from 'glob'
import { ZipArchive }  from 'archiver'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import {PurgeCSSPlugin} from 'purgecss-webpack-plugin'
import MinimizerPlugin from 'minimizer-webpack-plugin'
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

const browsers = ['chrome', 'firefox', 'safari']

// the manifest description is limited to 112 characters on Safari
// https://github.com/w3c/webextensions/issues/218
// TODO reduce manifest length for all builds, so we don't need a separate description for safari
const safariManifestDescription = 'Write emails faster! Increase your productivity with templates and shortcuts on Gmail, Outlook, or LinkedIn.'

// manifest v3 on firefox needs add-on id
const firefoxAddonId = '{ee8d72b5-656f-40f2-8247-bfae87a235b8}'
const firefoxDataCollection = {
  required: ['authenticationInfo'],
}

function removeSidePanel (manifest) {
  delete manifest.side_panel
  manifest.permissions = manifest.permissions.filter((permissionItem) => permissionItem !== 'sidePanel')
}

function generateManifest ({ browser, mode }) {
  const updatedManifestFile = structuredClone(manifestFile)
  // get version from package
  updatedManifestFile.version = packageFile.version

  // source maps
  if (mode === 'development') {
    updatedManifestFile.web_accessible_resources[0].resources = updatedManifestFile.web_accessible_resources[0].resources.concat(
      Array('content', 'page').map((script) => `${script}/${script}.js.map`)
    )
  }

  if (browser === 'firefox') {
    // firefox doesn't support background.service_worker in manifest v3,
    // and runs the background as a non-persistent event page instead.
    // https://bugzil.la/1573659
    updatedManifestFile.background = {
      scripts: [manifestFile.background.service_worker],
    }

    // firefox uses sidebar_action, instead of the side_panel key and sidePanel permission
    updatedManifestFile.sidebar_action = {
      default_title: 'Briskine',
      default_panel: manifestFile.side_panel.default_path,
      default_icon: manifestFile.action.default_icon,
    }
    removeSidePanel(updatedManifestFile)

    updatedManifestFile.browser_specific_settings = {
      gecko: {
        id: firefoxAddonId,
        data_collection_permissions: firefoxDataCollection,
      },
    }
  }

  if (browser === 'safari') {
    updatedManifestFile.description = safariManifestDescription
    // safari doesn't support the sidepanel
    removeSidePanel(updatedManifestFile)
    // same as firefox
    updatedManifestFile.background = {
      scripts: [manifestFile.background.service_worker],
    }
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
      fs.mkdirSync(path.dirname(this.options.output), {recursive: true})
      const output = fs.createWriteStream(this.options.output)
      const zipArchive = new ZipArchive()
      output.on('close', callback)
      zipArchive.pipe(output)
      zipArchive.directory(this.options.entry, false)
      zipArchive.finalize()
    })
  }
}

function extensionConfig ({ mode, browser, firebaseConfig}) {
  const safari = browser === 'safari'
  const plugins = [
    generateManifest({ mode, browser }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/icons/', to: 'icons/' },
        { from: 'src/sidepanel/sidepanel.html', to: 'sidepanel/' },
        { from: 'LICENSE', to: '' }
      ]
    }),
    new webpack.DefinePlugin({
      ENV: JSON.stringify(mode),
      REGISTER_DISABLED: safari,
      FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
      VERSION: JSON.stringify(packageFile.version),
    }),
    new MiniCssExtractPlugin({
      filename: '[name]/[name].css'
    }),
    new PurgeCSSPlugin({
      paths: globSync('src/**/*',  {nodir: true, dotRelative: true})
    })
  ]

  if (mode === 'production') {
    const zipFilename = `${packageFile.name}-${packageFile.version}-${browser}.zip`
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
      sidepanel: './src/sidepanel/sidepanel.js',
      content: {
        import: './src/content/index.js',
        // force iife
        chunkLoading: 'jsonp'
      },
      page: {
        import: './src/content/page/page.js',
        library: { type: 'module' }
      },
    },
    output: {
      path: path.resolve(devPath),
      filename: '[name]/[name].js',
      clean: true,
    },
    experiments: {
      outputModule: true,
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
                exportType: 'string',
                url: false,
              }
            }
          ]
        },
        {
          test: /(\/sidepanel\/|\/popup\/|\/content\/attachments\/).+.(css)$/i,
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
    optimization: {
      minimizer: [
        // workaround for SyntaxError: Invalid character '\u201a' in Safari
        safari ? new MinimizerPlugin({
          minimizerOptions: {
            format: {
              ascii_only: true,
            },
          },
        }) : '...',
        new MinimizerPlugin({
          test: /\.css$/i,
          minify: MinimizerPlugin.cssnanoMinify
        }),
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
    browser: 'chrome',
    mode: 'production',
    ...env,
  }

  if (!browsers.includes(params.browser)) {
    throw new Error(`Unknown browser "${params.browser}". Expected one of: ${browsers.join(', ')}.`)
  }

  return extensionConfig(params)
}
