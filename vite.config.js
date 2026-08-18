/* globals process */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import purgecss from '@fullhuman/postcss-purgecss'
import { globSync } from 'glob'
import { ZipArchive } from 'archiver'
import firebaseTools from 'firebase-tools'

import solidPlugins from './vite.plugins.js'

const rootPath = path.dirname(fileURLToPath(import.meta.url))
const srcPath = path.join(rootPath, 'src')
const devPath = path.join(rootPath, 'ext')
const productionPath = path.join(rootPath, 'build')

const packageFile = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'))
const manifestFile = JSON.parse(fs.readFileSync(path.join(srcPath, 'manifest.json'), 'utf8'))

const browsers = ['chrome', 'firefox', 'safari']

const defaultFirebaseConfig = {
  projectId: 'demo-briskine-development',
  apiKey: '123',
  storageBucket: 'demo-briskine-development-bucket'
}

// manifest v3 on firefox needs add-on id
const firefoxAddonId = '{ee8d72b5-656f-40f2-8247-bfae87a235b8}'
const firefoxDataCollection = {
  required: ['authenticationInfo'],
}
const firefoxMinVersion = '142.0'

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

  // matching manifest setup for firefox and safari
  if (browser !== 'chrome') {
    updatedManifestFile.background = {
      scripts: [manifestFile.background.service_worker],
      type: manifestFile.background.type,
    }

    removeSidePanel(updatedManifestFile)

    delete updatedManifestFile.web_accessible_resources[0].use_dynamic_url
  }

  if (browser === 'firefox') {
    // firefox uses sidebar_action, instead of the side_panel key and
    // sidePanel permission
    updatedManifestFile.sidebar_action = {
      default_title: 'Briskine',
      default_panel: manifestFile.side_panel.default_path,
      default_icon: manifestFile.action.default_icon,
    }

    updatedManifestFile.browser_specific_settings = {
      gecko: {
        id: firefoxAddonId,
        strict_min_version: firefoxMinVersion,
        data_collection_permissions: firefoxDataCollection,
      },
    }
  }

  if (browser === 'safari') {
    // keep the manifest description under 112 characters, for safari
    // https://github.com/w3c/webextensions/issues/218
  }

  return updatedManifestFile
}

const unpurgedStyles = [
  path.join(srcPath, 'content', 'dialog'),
  path.join(srcPath, 'content', 'bubble'),
]

function purgeExtractedCss (options) {
  const purge = purgecss(options)
  return {
    postcssPlugin: 'briskine-purgecss',
    OnceExit (root, helpers) {
      const from = root.source?.input?.file || ''
      if (unpurgedStyles.some((stylePath) => from.startsWith(stylePath))) {
        return
      }
      return purge.OnceExit(root, helpers)
    },
  }
}

function copyStaticFiles () {
  fs.cpSync(path.join(srcPath, 'icons'), path.join(devPath, 'icons'), {recursive: true})
  fs.copyFileSync(path.join(rootPath, 'LICENSE'), path.join(devPath, 'LICENSE'))
}

function writeManifest (params) {
  fs.writeFileSync(
    path.join(devPath, 'manifest.json'),
    JSON.stringify(generateManifest(params))
  )
}

function zip ({ browser }) {
  const zipFilename = `${packageFile.name}-${packageFile.version}-${browser}.zip`
  fs.mkdirSync(productionPath, {recursive: true})

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(productionPath, zipFilename))
    const zipArchive = new ZipArchive()
    output.on('close', resolve)
    zipArchive.on('error', reject)
    zipArchive.pipe(output)
    zipArchive.directory(devPath, false)
    zipArchive.finalize()
  })
}

async function resolveFirebaseConfig (mode) {
  if (mode === 'development') {
    return defaultFirebaseConfig
  }

  const firebaseConfigFile = path.join(rootPath, `.firebase-config-${mode}.json`)
  try {
    return JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf8'))
  } catch {
    try {
      await firebaseTools.use(`gorgias-templates-${mode}`)
      const appConfig = await firebaseTools.apps.sdkconfig()
      fs.writeFileSync(firebaseConfigFile, JSON.stringify(appConfig.sdkConfig))
      return appConfig.sdkConfig
    } catch (err) {
      // eslint-disable-next-line
      console.warn(err)
      return defaultFirebaseConfig
    }
  }
}

function singleEntry ({ input, fileName, format, assetFileNames, cssCodeSplit }) {
  return {
    consumer: 'client',
    resolve: {
      noExternal: true,
    },
    build: {
      cssCodeSplit: cssCodeSplit,
      rollupOptions: {
        input: path.join(srcPath, input),
        output: {
          format: format,
          entryFileNames: fileName,
          assetFileNames: assetFileNames,
        },
      },
    },
  }
}

export default defineConfig(async ({ mode }) => {
  const browser = process.env.BROWSER || 'chrome'
  if (!browsers.includes(browser)) {
    throw new Error(`Unknown browser "${browser}". Expected one of: ${browsers.join(', ')}.`)
  }

  const firebaseConfig = await resolveFirebaseConfig(mode)
  const development = mode === 'development'

  return {
    root: srcPath,
    publicDir: false,

    define: {
      ENV: JSON.stringify(mode),
      REGISTER_DISABLED: JSON.stringify(browser === 'safari'),
      FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
      VERSION: JSON.stringify(packageFile.version),
    },

    plugins: solidPlugins(),

    css: {
      postcss: {
        plugins: [
          purgeExtractedCss({
            content: globSync(path.join(srcPath, '**/*'), {nodir: true}),
          }),
        ],
      },
    },

    build: {
      outDir: devPath,
      modulePreload: false,
      chunkSizeWarningLimit: 1000,
      emptyOutDir: false,
      target: ['chrome109', 'firefox142', 'safari16.4'],
      minify: !development,
      sourcemap: development,
    },

    environments: {
      pages: {
        consumer: 'client',
        resolve: {
          noExternal: true,
        },
        build: {
          rollupOptions: {
            input: {
              popup: path.join(srcPath, 'popup', 'popup.html'),
              sidepanel: path.join(srcPath, 'sidepanel', 'sidepanel.html'),
            },
            output: {
              format: 'es',
              entryFileNames: '[name]/[name].js',
              chunkFileNames: 'chunks/[name]-[hash].js',
              assetFileNames: (assetInfo) => {
                if (assetInfo.names?.some((name) => name.endsWith('.css'))) {
                  return '[name]/[name][extname]'
                }
                return 'assets/[name]-[hash][extname]'
              },
            },
          },
        },
      },

      content: singleEntry({
        input: path.join('content', 'index.js'),
        fileName: 'content/content.js',
        format: 'iife',
        assetFileNames: 'content/content[extname]',
        cssCodeSplit: false,
      }),

      background: singleEntry({
        input: path.join('background', 'background.js'),
        fileName: 'background/background.js',
        format: 'es',
      }),

      page: singleEntry({
        input: path.join('content', 'page', 'page.js'),
        fileName: 'page/page.js',
        format: 'es',
      }),
    },

    builder: {
      async buildApp (builder) {
        fs.rmSync(devPath, {recursive: true, force: true})

        for (const name of ['pages', 'content', 'background', 'page']) {
          await builder.build(builder.environments[name])
        }

        copyStaticFiles()
        writeManifest({browser, mode})

        if (mode === 'production') {
          await zip({browser})
        }
      },
    },
  }
})
