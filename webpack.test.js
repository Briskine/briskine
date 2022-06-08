import webpack from 'webpack'
import path from 'path'
import glob from 'glob'

export default {
  mode: 'development',
  entry: {
    test: glob.sync('./src/**/*.spec.js')
  },
  output: {
    filename: '[name].bundle.js',
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
    }),
  ],
  resolve: {
    alias: {
      'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
      'handlebars': 'handlebars/dist/cjs/handlebars'
    }
  }
}
