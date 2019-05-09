// Firestore plugin
var _FIRESTORE_PLUGIN = function () {
    // Your web app's Firebase configuration
    var firebaseConfig = {
        apiKey: "AIzaSyArp0AWkIjYn0nEFgfUFvtQ3ZS9GoqLwdI",
        authDomain: "gorgias-templates-staging.firebaseapp.com",
        databaseURL: "https://gorgias-templates-staging.firebaseio.com",
        projectId: "gorgias-templates-staging",
        storageBucket: "gorgias-templates-staging.appspot.com",
        messagingSenderId: "637457793167",
        appId: "1:637457793167:web:05dd21469e22d274"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    function mock () {
        return Promise.resolve();
    };

    var defaultSettings = {
        settings: {
            // settings for the settings view
            dialog: {
                enabled: true,
                shortcut: "ctrl+space", // shortcut that triggers the complete dialog
                auto: false, //trigger automatically while typing - should be disabled cause it's annoying sometimes
                delay: 1000, // if we want to trigger it automatically
                limit: 100 // how many templates are shown in the dialog
            },
            qaBtn: {
                enabled: true,
                shownPostInstall: false,
                caseSensitiveSearch: false,
                fuzzySearch: true
            },
            keyboard: {
                enabled: true,
                shortcut: "tab"
            },
            stats: {
                enabled: true // send anonymous statistics
            },
            blacklist: [],
            fields: {
                tags: false,
                subject: true
            },
            editor: {
                enabled: true // new editor - enable for new users
            }
        },
        // refactor this into 'local' and 'remote'
        isLoggedIn: false,
        syncEnabled: false,
        words: 0,
        syncedWords: 0,
        lastStatsSync: null,
        lastSync: null,
        hints: {
            postInstall: true,
            subscribeHint: true
        }
    };

    var getSettings = (params = {}) => {
        return Promise.resolve(defaultSettings[params.key]);
    };
    var setSettings = (params = {}) => {
        return Promise.resolve(defaultSettings[params.key]);
    };

    // TODO check if user is logged-in
    var getLoginInfo = () => {
        return Promise.reject();
    };
    // TODO get account details
    var getAccount = mock;
    // TODO update account details
    var setAccount = mock;

    var getMember = mock;
    var setMember = mock;

    var getTemplate = mock;
    var updateTemplate = mock;
    var createTemplate = mock;
    var deleteTemplate = mock;
    var clearLocalTemplates = mock;

    var getSharing = mock;
    var updateSharing = mock;

    var getStats = mock;
    var updateStats = mock;

    var getPlans = mock;
    var getSubscription = mock;
    var updateSubscription = mock;
    var cancelSubscription = mock;

    var syncNow = mock;
    var syncLocal = mock;

    var signin = () => {
        // TODO
        // - use firestore plugin first
        // - try to log user in
        // - if not successful, try to log-in with old api
        // - if old api successful, set password on firestore account (cloud function, check old-api cookie)
        // - set userMetadata.passwordUpdated = true
        // - if userMetadata.migrated = true account, keep using firestore
        // - if not, switch to old-api plugin
    };
    var forgot = () => {};
    var subscribe = () => {
        // TODO subscribe submit
    };

    var openSubscribePopup = function (params = {}) {
        // TODO open firestore subscribe popup
        $('#firestore-signup-modal').modal({
            show: true
        });
    };

    var events = [];
    var on = function (name, callback) {
        events.push({
            name: name,
            callback: callback
        });
    };

    var trigger = function (name) {
        events.filter((event) => event.name === name).forEach((event) => {
            if (typeof event.callback === 'function') {
                event.callback()
            }
        })
    };

    return {
        getSettings: getSettings,
        setSettings: setSettings,

        getLoginInfo: getLoginInfo,
        getAccount: getAccount,
        setAccount: setAccount,

        getMember: getMember,
        setMember: setMember,

        getTemplate: getTemplate,
        updateTemplate: updateTemplate,
        createTemplate: createTemplate,
        deleteTemplate: deleteTemplate,
        clearLocalTemplates: clearLocalTemplates,

        getSharing: getSharing,
        updateSharing: updateSharing,

        getStats: getStats,
        updateStats: updateStats,

        getPlans: getPlans,
        getSubscription: getSubscription,
        updateSubscription: updateSubscription,
        cancelSubscription: cancelSubscription,

        syncNow: syncNow,
        syncLocal: syncLocal,

        signin: signin,
        forgot: forgot,
        subscribe: subscribe,
        openSubscribePopup: openSubscribePopup,

        on: on
    };
}();

