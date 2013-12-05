// Settings
var Settings = {
    get: function(key, def) {
        if (key in window.localStorage && window.localStorage[key] !== '') {
            return JSON.parse(window.localStorage[key]);
        } else {
            if (!def){
                return this.defaults[key];
            } else {
                return def;
            }
        }
    },
    set: function(key, value) {
        if (value === this.defaults[key]) {
            return this.clear(key);
        } else {
            window.localStorage[key] = JSON.stringify(value);
            return window.localStorage[key];
        }
    },
    clear: function(key) {
        return delete window.localStorage[key];
    },
    has: function(key) {
        return key in window.localStorage;
    },
    defaults: {
        baseURL: "https://gmail-quicktext.com/",
        apiBaseURL: "https://gmail-quicktext.com/api/1/",
        syncEnabled: false,
        autocompleteEnabled: true, // autocomplete dialog
        tabcompleteEnabled: true, // tab completion
        sendStatsEnabled: true, // send anonymous statistics
        sidebarHidden: false // show or hide the sidebar
    }
};
