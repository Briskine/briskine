import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import * as fs from 'node:fs'

const packageFile = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function setup(project) {
  console.log('--- setup ---');
  console.log('>> ', path.resolve(__dirname, './src'));

  // console.log('RRR', project);

  const libraries = [
    { name: 'page', entry: './content/page/page.js' },
    { name: 'sandbox', entry: './content/sandbox/sandbox.js' },
  ];

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
        outDir: '../test/dist/',
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
        ENV: "'test'",
      }
    })
  }

  await fs.copyFile('./src/content/sandbox/sandbox.html', './test/dist/sandbox/sandbox.html', (err) => {
    if (err) throw err;
  });

}

export function teardown() {
  console.log('teardown')
}
