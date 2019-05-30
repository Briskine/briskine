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

    var db = firebase.firestore();

    // TODO sync on first initialize and delete from storage

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

    var getMembers = (params = {}) => {
        return Promise.resolve({
            members: []
        });
    };
    var setMember = mock;

    var tagsCollection = db.collection('tags');
    var templatesCollection = db.collection('templates');

    function getTags () {
        return getSignedInUser().then((user) => {
            return tagsCollection.where('customer', '==', user.customer).get()
        });
    };

    function createTags (tags = []) {
        return getSignedInUser().then((user) => {
            var batch = db.batch()

            var newTags = tags.map((tag) => {
                var tagId = uuid();
                var tagRef = tagsCollection.doc(tagId);
                var newTag = {
                    customer: user.customer,
                    title: tag,
                    version: 1
                };
                batch.set(tagRef, newTag);

                return Object.assign({id: tagId}, newTag);
            })

            return batch.commit().then(() => newTags);
        });
    }

    // replace tags titles with ids
    function replaceTags (templateTags) {
        return getTags().then((existingTagsQuery) => {
            var existingTags = existingTagsQuery.docs.map((tag) => {
                return Object.assign({id: tag.id}, tag.data());
            });

            // tags to be created
            var newTags = templateTags.filter((tag) => {
                return !(existingTags.some((existing) => {
                    return existing.title === tag
                }))
            });

            return createTags(newTags).then((createdTags) => {
                // merge existing tags with created tags
                var updatedTags = existingTags.concat(createdTags);

                // map template tag titles to ids
                return templateTags.map((tag) => {
                    return (
                        updatedTags.find((existingTag) => {
                            return existingTag.title === tag
                        }) || {}
                    ).id;
                });
             });
        });
    };

    function parseTemplate (params = {}) {
        var now = fsDate(new Date());

        var sharing = 'none';
        var shared_with = [];
        // TODO get sharing=everyone from controller/user?
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
            created_datetime: now,
            modified_datetime: now,
            deleted_datetime: null,
            shared_with: shared_with,
            sharing: sharing,
            tags: [],
            owner: null,
            customer: null,
            version: 1
        };

        // clean-up template tags
        var templateTags = (params.template.tags || '').split(',').map((tag) => {
            return (tag || '').trim();
        });

        return getSignedInUser()
            .then((user) => {
                template = Object.assign(template, {
                    owner: user.id,
                    customer: user.customer
                });

                return replaceTags(templateTags)
            }).then((tags) => {
                return Object.assign(template, {
                    tags: tags
                });
            });
    };

    // TODO switch to params
    var getTemplate = (id) => {
//         {
//             "id": {
//                 "attachments": "",
//                 "bcc": "",
//                 "body": "<div>Hello {{to.first_name}},</div><div><br></div><div><br></div><div>Happy 2017! I hope things went well for you during the holiday season!&nbsp;</div><div><br></div><div>I'm checking in as discussed, would you like to do a brief call sometimes next week?</div>",
//                 "cc": "",
//                 "created_datetime": "2017-01-08T20:06:40.143922",
//                 "deleted": 0,
//                 "id": "0aa3e13a-74ec-4017-9975-4dfcc14f608a",
//                 "lastuse_datetime": "",
//                 "nosync": 0,
//                 "private": false,
//                 "remote_id": "858d86ff-b5f8-4f3c-ac91-8f7b6bab293a",
//                 "shortcut": "ch",
//                 "subject": "Checking-in",
//                 "sync_datetime": "2019-05-30T14:52:51.845Z",
//                 "tags": "",
//                 "title": "Checking-in",
//                 "to": "",
//                 "updated_datetime": "2019-05-30T14:53:20.845Z",
//                 "use_count": 0
//             }
//         }


        if (id) {
            // TODO return single template
            return
        }

        return getSignedInUser()
            .then((user) => {
                // TODO return all templates
                return templatesCollection
                    .where('customer', '==', user.customer)
                    .get()
                    .then((templatesQuery) => {
                        return getTags().then((tagsQuery) => {
                            // backward compatibility
                            var templates = {};
                            templatesQuery.docs.forEach((template) => {
                                // replace tag ids with titles
                                var templateData = template.data();

                                var tags = templateData.tags.map((tagId) => {
                                    var foundTag = tagsQuery.docs.find((tag) => {
                                        return tag.id === tagId
                                    })
                                    return foundTag.data().title;
                                }).join(', ');

                                templates[template.id] = Object.assign(
                                    templateData,
                                    {
                                        id: template.id,
                                        // TODO check deleted_datetime
                                        deleted: 0,
                                        tags: tags,
                                        // TODO check sharing
                                        private: true
                                    },
                                )
                            });

                            return templates
                        });
                    });
            })
            .catch((err) => {
                // TODO not signed-in
                // return from cache
                console.log('err', err);
            })
    };
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

        return parseTemplate(params)
            .then((template) => {
                // TODO create firestore template
                var id = uuid();
                var ref = templatesCollection.doc(id);

                return ref.set(template)
            })
            .then((res) => {
                console.log('created', res);
            })
            .catch((err) => {
                console.log('error', err);
                // TODO error, not logged-in
                // create offline template
                return
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
                var userId = res.user.uid;
                var customersRef = db.collection('customers');

                return customersRef.where('members', 'array-contains', userId).get().then((customers) => {
                    // get first customer
                    if (customers.docs.length) {
                        return customers.docs[0];
                    }

                    // should always have at least one customer
                    return Promise.reject()
                }).then((customer) => {
                    return setSignedInUser({
                        id: userId,
                        customer: customer.id,
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
            });
    };
    var forgot = () => {};
    var logout = () => {
        return firebase.auth().signOut().then(() => {
            return setSignedInUser({});
        });
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

        getMembers: getMembers,
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

