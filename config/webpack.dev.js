const CopyWebpackPlugin = require("copy-webpack-plugin");
let manifestDev = require('../src/manifest.json');

exports.devServer = ({ host, port } = {}) => ({
    devServer: {
        stats: "errors-only",
        host, // Defaults to `localhost`
        port, // Defaults to 8080
        open: false,
        overlay: true,
    },
});
exports.setPath = ({ output }) => {
    return {
        output: {
            path: output,
        },
    };
};
exports.generateManifest = ({}) => {
    var env = 'development';
    if (process.env.NODE_ENV) {
        env = process.env.NODE_ENV
    }

    manifestDev.key = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4fz+r4Bt92pF09QQkdrVrJRt/OYUWTg6mBHGyp0u6suCPaPFJ1mysOAphZIAhCPw4O/lsQ8AlLkHgFzpb5z7IjmrU3FB1dJXGifXDY6ybZi/CcZUY0g30Do+bowHKNHRnkYIl625jaQwvrKm9ZYseIPIbCOtDHSBoD579tbP+aYLxZV+aVBmvD7O2HayVzMgL8xc+imk2gRzmu0zVjgQ+WqlGApTsEtucsVUVrNTf6Txl9nDCN9ztRJwLH7VASKctHeHMwmK1uDZgkokdO5FjHYEp6VB7c4Pe/Af1l0/Dct9HgK8aFXtsmIZa7zWPrgAihBqKVaWMk4iJTmmXfNZxQIDAQAB'

    // Load content script on localhost
    manifestDev.content_scripts[0].matches.push('http://localhost/gmail/*')
    manifestDev.content_scripts[0].matches.push('https://localhost/gmail/*')
    const plugin = new CopyWebpackPlugin([
        {
            from: './src/manifest.json',
            transform: function (content, path) {
                // generates the manifest file using the package.json informations
                return Buffer.from(JSON.stringify(manifestDev))
            }
        }
    ]);
    return {
        plugins: [plugin],
    };
};
