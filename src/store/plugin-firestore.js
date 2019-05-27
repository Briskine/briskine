// Firestore plugin
var _FIRESTORE_PLUGIN = function () {
    // firebase config
    // TODO staging data
    var firebaseConfig = {
        apiKey: "AIzaSyArp0AWkIjYn0nEFgfUFvtQ3ZS9GoqLwdI",
        authDomain: "gorgias-templates-staging.firebaseapp.com",
        databaseURL: "https://gorgias-templates-staging.firebaseio.com",
        projectId: "gorgias-templates-staging",
        storageBucket: "gorgias-templates-staging.appspot.com",
        messagingSenderId: "637457793167",
        appId: "1:637457793167:web:05dd21469e22d274"
    };
    firebase.initializeApp(firebaseConfig);

    function mock () {
        return Promise.resolve();
    };

    function fsDate (date) {
        if (!date) {
            return firebase.firestore.Timestamp.now();
        };

        return firebase.firestore.Timestamp.fromDate(date);
    };

    // uuidv4
    function uuid() {
        return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };

    // TODO borrow settings from old api plugin
    var getSettings = _GORGIAS_API_PLUGIN.getSettings;
    var setSettings = _GORGIAS_API_PLUGIN.setSettings;

    var globalUserKey = 'firebaseUser';
    function getSignedInUser () {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(globalUserKey, (res) => {
                const user = res[globalUserKey] || {};
                if (Object.keys(user).length) {
                    return resolve(user);
                }

                return reject();
            });
        });
    };

    function setSignedInUser (user) {
        return new Promise((resolve, reject) => {
            var globalUser = {}
            globalUser[globalUserKey] = user;
            chrome.storage.local.set(globalUser, () => {
                resolve();
            });
        });
    };

    var getLoginInfo = getSignedInUser;
    var getAccount = getSignedInUser;
    // TODO update account details
    var setAccount = mock;

    var getMember = mock;
    var setMember = mock;

    var getTemplate = mock;
    var updateTemplate = mock;
    var createTemplate = (params = {}) => {
//         {
//             "template": {
//                 "id": "",
//                 "remote_id": "",
//                 "shortcut": "test",
//                 "title": "test",
//                 "tags": "",
//                 "body": "<div>test</div>",
//                 "attachments": []
//             },
//             "onlyLocal": true,
//             "isPrivate": true
//         }

        return getSignedInUser().then((user) => {
            console.log(user);

            var now = fsDate(new Date());

            // TODO if logged-in, create in firestore
            // TODO else in storage
            // sync on first initialize and delete from storage

            // TODO check if all tags exist in the customer
            // TODO if not, create them first
            // TODO then replace with ids
            var tags = (params.template.tags || '').split(',').map((tag) => {
                return (tag || '').trim();
            });

            var sharing = 'none';
            var shared_with = [];
            // TODO get sharing=everyone from controller.
            if (!params.isPrivate) {
                sharing = 'custom';
                // TODO get from params.template
                shared_with = [];
            };

            var template = {
                body: params.template.body,
                title: params.template.title,
                attachments: params.template.attachments,
                cc: params.template.cc || '',
                bcc: params.template.bcc || '',
                to: params.template.to || '',
                owner: '',
                customer: '',
                created_datetime: now,
                modified_datetime: now,
                deleted_datetime: null,
                shared_with: shared_with,
                sharing: sharing,
                tags: [],
                version: 1
            };

            console.log('params', params);
            console.log('template', template);

            return
        })
        .catch(() => {
            // TODO not logged-in
            return
        })
        .then(() => {
            return Promise.reject();
        });
    };
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

    var signin = (params = {}) => {
        // TODO
        // - use firestore plugin first
        // - try to log user in
        // - if not successful, try to log-in with old api
        // - if old api successful, set password on firestore account (cloud function, check old-api cookie)
        // - set userMetadata.passwordUpdated = true
        // - if userMetadata.migrated = true account, keep using firestore
        // - if not, switch to old-api plugin

        return firebase.auth()
            .signInWithEmailAndPassword(params.email, params.password)
            .then((res) => {
                return setSignedInUser({
                    email: res.user.email,
                    // backwards compatibility
                    info: {
                        name: res.user.displayName,
                        // TODO get from firestore
                        share_all: true
                    },
                    created_datetime: new Date(res.user.metadata.creationTime),
                    editor: {
                        enabled: true
                    },
                    // TODO get from firestore
                    is_loggedin: true,
                    current_subscription: '',
                    is_customer: true,
                    created_datetime: '',
                    current_subscription: {
                        active: true,
                        created_datetime: '',
                        plan: '',
                        quantity: 1
                    },
                    is_staff: false
                });
            });
    };
    var forgot = () => {};
    var logout = () => {
        return setSignedInUser({});
    };

    var openSubscribePopup = function (params = {}) {
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
        logout: logout,
        forgot: forgot,
        openSubscribePopup: openSubscribePopup,

        on: on
    };
}();

