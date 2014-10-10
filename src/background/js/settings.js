// Settings
var Settings = {
    get: function (key, def) {
        if (key in window.localStorage && window.localStorage[key] !== '') {
            return JSON.parse(window.localStorage[key]);
        } else {
            if (!def) {
                return angular.copy(this.defaults[key]);
            } else {
                return def;
            }
        }
    },
    set: function (key, value) {
        if (_.isEqual(value, this.defaults[key])) {
            return this.clear(key);
        } else {
            window.localStorage[key] = JSON.stringify(value);
            return window.localStorage[key];
        }
    },
    clear: function (key) {
        return delete window.localStorage[key];
    },
    has: function (key) {
        return key in window.localStorage;
    },
    defaults: {
        baseURL: "https://quicktext.io/",
        apiBaseURL: "https://quicktext.io/api/1/",

        settings: { // settings for the settings view
            dialog: {
                enabled: true,
                shortcut: 'ctrl+space', // shortcut that triggers the complete dialog
                auto: false, //trigger automatically while typing - should be disabled cause it's annoying sometimes
                delay: 1000 // if we want to trigger it automatically
            },
            keyboard: {
                enabled: true,
                shortcut: 'tab'
            },
            stats: {
                enabled: true  // send anonymous statistics - doesn't include GA
            }
        },
        // refactor this into 'local' and 'remote'
        isLoggedIn: false,
        syncEnabled: false,
        words: 0,
        syncedWords: 0,
        lastStatsSync: null,
        lastSync: null
    }
};
