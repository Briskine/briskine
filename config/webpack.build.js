const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');

exports.setPath = ({ output }) => {
    return {
        output: {
            path: output,
        },
    };
};
exports.archive = ({ path: buildPath, filename }) => {
    const plugin = new FileManagerPlugin({
        onEnd: {
            archive: [
                {
                    source: path.resolve(__dirname, '../ext'),
                    destination: `${buildPath}/${filename}.zip`
                },
            ]
        }
    });
    return {
        plugins: [plugin],
    };
};
exports.generateManifestProduction = ({}) => {
    var manifestProduction = require("../src/manifest.json")
    delete manifestProduction.key;
    const plugin = new CopyWebpackPlugin([
        {
            from: "./src/manifest.json",
            transform: function (content, path) {
                // generates the manifest file using the package.json informations
                return Buffer.from(JSON.stringify(manifestProduction))
            }
        }
    ]);
    return {
        plugins: [plugin],
    };
};
