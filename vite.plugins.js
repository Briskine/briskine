import solid from 'vite-plugin-solid'
import solidSvg from 'vite-plugin-solid-svg'

export default function solidPlugins () {
  return [
    solid({
      extensions: ['.js'],
      exclude: /node_modules\/.*\.js$/,
      hot: false,
    }),
    solidSvg({
      svgo: {
        enabled: true,
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  removeViewBox: false,
                  cleanupIds: false,
                },
              },
            },
          ],
        },
      },
    }),
  ]
}
