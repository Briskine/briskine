import webpack from 'webpack'
import path from 'path'
import {globSync} from 'glob'
import CopyWebpackPlugin from 'copy-webpack-plugin'

export default {
  mode: 'development',
  entry: {
    test: globSync('./src/**/*.spec.js', {dotRelative: true}),
    sandbox: './src/content/sandbox/sandbox.js',
    page: './src/content/page/page.js',
  },
  devtool: 'cheap-module-source-map',
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
        {
          from: 'src/content/sandbox/sandbox.html',
          to: 'sandbox/sandbox.html',
        },
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
