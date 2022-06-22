import webpack from 'webpack'
import path from 'path'
import glob from 'glob'
import CopyWebpackPlugin from 'copy-webpack-plugin'

export default {
  mode: 'development',
  entry: {
    test: glob.sync('./src/**/*.spec.js'),
    sandbox: './src/content/sandbox/sandbox.js',
  },
  output: {
    filename: '[name]/[name].js',
    path: path.resolve('test/bundle')
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      ENV: JSON.stringify('development'),
      REGISTER_DISABLED: false,
      FIREBASE_CONFIG: {},
      VERSION: 1,
      MANIFEST: JSON.stringify('3'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/content/sandbox/sandbox.html', to: 'sandbox.html' },
      ]
    }),
  ],
  resolve: {
    alias: {
      'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
      'handlebars': 'handlebars/dist/cjs/handlebars'
    }
  }
}
