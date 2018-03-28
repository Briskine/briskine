
var ZipPlugin = require('zip-webpack-plugin'),
    CopyWebpackPlugin = require("copy-webpack-plugin");

exports.setPath = ({ output }) => {
    return {
        output: {
            path: output,
        },
    };
};
exports.archive = ({ path, filename }) => {
    const plugin = new ZipPlugin({
        path: path,
        filename: filename,
    });
    return {
        plugins: [plugin],
    };
};
exports.generateManifestProduction = ({}) => {

    var fs = require('fs');
    fs.writeFile('src/background/js/environment.js','var ENV = "production";',function(err){
        if(err) throw err;
    })

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