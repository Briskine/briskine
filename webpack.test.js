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
  resolve: {
    alias: {
      'handlebars/runtime': 'handlebars/dist/cjs/handlebars.runtime',
      'handlebars': 'handlebars/dist/cjs/handlebars'
    }
  }
}
