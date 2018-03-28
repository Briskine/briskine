var Crx = require("crx-webpack-plugin");

exports.generateCrx = ({}) => {
    
    const plugin = new Crx({
        keyFile: '../ext.pem',
        contentPath: 'build',
        outputPath: '../ext',
        name: 'gorgias-chrome.crx'
    });

    return {
        plugins: [plugin],
    };
};