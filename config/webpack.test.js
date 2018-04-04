var Crx = require("crx-webpack-plugin");

exports.generateCrx = ({}) => {
    
    const plugin = new Crx({
        keyFile: '../ext.pem',
        contentPath: '../ext',
        outputPath: '../ext',
        name: 'gorgias-chrome'
    });

    return {
        plugins: [plugin],
    };
};