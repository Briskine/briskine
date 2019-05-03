// Firestore plugin
var _FIRESTORE_PLUGIN = function () {
    var getSettings = () => {};
    var setSettings = () => {};

    var getLoginInfo = () => {
        // TODO check if user is logged-in
    };
    var getAccount = () => {
        // TODO get account details
    };
    var setAccount = () => {
        // TODO update account details
    };

    var getMember = () => {};
    var setMember = () => {};

    var getTemplate = () => {};
    var updateTemplate = () => {};
    var createTemplate = () => {};
    var deleteTemplate = () => {};
    var clearLocalTemplates = () => {};

    var getSharing = () => {};
    var updateSharing = () => {};

    var getStats = () => {};
    var updateStats = () => {};

    var getPlans = () => {};
    var getSubscription = () => {};
    var updateSubscription = () => {};
    var cancelSubscription = () => {};

    var syncNow = () => {};
    var syncLocal = () => {};

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
        // TODO re-create subscribe popup in angular app
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

        on: on
    };
}();

