/**
 * Plugin
 */

var plugins = [];
export function register (plugin) {
    plugins.push(plugin);
}

// TODO seq promise run until one returns true
export function run (params = {}, index = 0) {
    var plugin = plugins[index]
    if (!plugin) {
        return true
    }

    // TODO what to send to plugin?
    return Promise.resolve().then(() => plugin(params)).then((done) => {
        if (done === true) {
            return true;
        }

        return run(params, index + 1);
    })
}

