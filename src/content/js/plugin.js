/**
 * Plugin
 */

var plugins = [];
export function register (plugin) {
    plugins.push(plugin);
}

// sequentially run promises until one returns true, or we reach the end
export function run (params = {}, index = 0) {
    var plugin = plugins[index];
    if (!plugin) {
        return true;
    }

    return Promise.resolve().then(() => plugin(params)).then((done) => {
        if (done === true) {
            return true;
        }

        return run(params, index + 1);
    });
}

