import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { readFile, copyFile } from 'node:fs/promises'

const packageFile = JSON.parse(await readFile('./package.json', 'utf8'))

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function setup () {
  const libraries = [
    { name: 'page', entry: './content/page/page.js' },
    { name: 'sandbox', entry: './content/sandbox/sandbox.js' },
  ]

  for (const lib of libraries) {
    await build({
      root: path.resolve(__dirname, './src'),
      build: {
        lib: {
          entry: lib.entry,
          name: lib.name,
          fileName: (format, entryName) => `${entryName}/${entryName}.js`,
          formats: ['iife'],
        },
        outDir: '../test/bundle/',
      },
      resolve: {
        alias: {
          // HACK
          // Temporary alias, we'll switch directly to this import when migrating to Vite.
          'moment': 'moment/min/moment-with-locales.js',
        }
      },
      define: {
        VERSION: JSON.stringify(packageFile.version),
        ENV: '\'test\'',
      }
    })
  }

  await copyFile('./src/content/sandbox/sandbox.html', './test/bundle/sandbox/sandbox.html')
}
