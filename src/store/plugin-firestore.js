// Firestore plugin
var _FIRESTORE_PLUGIN = function () {
    // firebase
    firebase.initializeApp(Config.firebase);
    var db = firebase.firestore();

    // TODO sync on first initialize and delete from storage
    // IF signed-in

    function mock () {
        return Promise.resolve();
    };

    function fsDate (date) {
        if (!date) {
            return firebase.firestore.Timestamp.now();
        };

        return firebase.firestore.Timestamp.fromDate(date);
    };

    function now () {
        return fsDate(new Date());
    };

    // uuidv4
    function uuid() {
        return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };

    // handle fetch errors
    var handleErrors = function (response) {
        if (!response.ok) {
            return response.clone().json().then((res) => {
                return Promise.reject(res);
            });
        }
        return response;
    };

    // backwards compatibility
    // update template list
    function refreshTemplates () {
        trigger('templates-sync');
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
            var globalUser = {};
            globalUser[globalUserKey] = user;
            chrome.storage.local.set(globalUser, () => {
                resolve();
            });
        });
    };

    // firebase.auth().currentUser is not a promise
    // https://github.com/firebase/firebase-js-sdk/issues/462
    function getCurrentUser () {
        return new Promise((resolve, reject) => {
            var unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe()
                resolve(user)
            }, reject)
        })
    }

    // auth change
    firebase.auth().onAuthStateChanged((firebaseUser) => {
        if (!firebaseUser) {
            return setSignedInUser({});
        }

        return updateCurrentUser(firebaseUser);
    });

    var getLoginInfo = getSignedInUser;
    var getAccount = getSignedInUser;

    // update account details
    var setAccount = (params = {}) => {
        var currentUser = firebase.auth().currentUser;
        var userRef = usersCollection.doc(currentUser.uid);
        var updates = [];

        if (currentUser.email !== params.email) {
            updates.push(
                currentUser.updateEmail(params.email).then(() => {
                    // only if auth update successful
                    // update email in users collection
                    return userRef.update({email: params.email})
                })
            );
        }

        if (currentUser.displayName !== params.name) {
            updates.push(
                currentUser.updateProfile({
                    displayName: params.name
                }).then(() => {
                    // only if auth update successful
                    // update name in users collection
                    return userRef.update({full_name: params.name})
                })
            );
        }

        return Promise.all(updates).then(() => {
            // update details in cached user
            return updateCurrentUser(firebase.auth().currentUser);
        }).then(() => {
            // update password last, it invalidates the session
            if (params.password) {
                return currentUser.updatePassword(params.password).then(() => {
                    // automatically sign-in with new credentials
                    return signin({
                        email: params.email,
                        password: params.password
                    });
                });
            }

            return
        });
    };

    var usersCollection = db.collection('users');
    var customersCollection = db.collection('customers');
    var templatesCollection = db.collection('templates');
    var tagsCollection = db.collection('tags');

    function idsToUsers (userIds = []) {
        return Promise.all(
            userIds.map((id) => {
                return usersCollection.doc(id).get().then((userQuery) => {
                    var userData = userQuery.data();
                    return Object.assign({
                        // backwards compatibility
                        active: true,
                        id: userQuery.id,
                        email: userData.email,
                        name: userData.full_name
                    }, userData);
                })
            })
        )
    };

    var getMembers = (params = {exclude: null}) => {
//         members: []
//             active: true
//             email: "alex@gorgias.io"
//             id: ""
//             is_customer: true
//             name: "Alex Plugaru"
//             user_id: 1

        return getSignedInUser().then((user) => {
            return customersCollection.doc(user.customer).get().then((customer) => {
                var members = customer.data().members;
                var exclude = params.exclude;
                // by default exclude ourselves.
                // null is default, otherwise []
                if (exclude === null) {
                    exclude = [user.id];
                }

                // exclude users
                members = members.filter((memberId) => {
                    return !exclude.includes(memberId)
                });

                return idsToUsers(members);
            });
        }).then((members) => {
            return {
                members: members
            }
        });
    };

    // TODO team members page
    var setMember = (params = {}) => {
        console.log('setMember', params);

        return Promise.reject();
    };

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
    };

    function tagsToArray (tagsString = '') {
        return (tagsString || '').split(',').map((tag) => {
            return (tag || '').trim();
        }).filter((tag) => !!tag);
    };

    // replace tag titles with ids
    function tagsToIds (templateTags) {
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

    function idsToTags (tagIds) {
        return getTags().then((existingTagsQuery) => {
            return tagIds.map((tagId) => {
                var foundTag = existingTagsQuery.docs.find((tag) => {
                    return tagId === tag.id
                });

                if (!foundTag) {
                    return '';
                }

                return foundTag.data().title;
            });
        });
    };

    function parseTemplate (params = {}) {
        // private by default
        // sharing later set by updateSharing
        var sharing = 'none';
        var shared_with = [];
        var templateDate = now();

        var template = {
            title: params.template.title,
            body: params.template.body,
            shortcut: params.template.shortcut || '',
            subject: params.template.subject || '',
            cc: params.template.cc || '',
            bcc: params.template.bcc || '',
            to: params.template.to || '',
            attachments: params.template.attachments,
            created_datetime: templateDate,
            modified_datetime: templateDate,
            deleted_datetime: null,
            shared_with: shared_with,
            sharing: sharing,
            tags: [],
            owner: null,
            customer: null,
            version: 1
        };

        // clean-up template tags
        var templateTags = tagsToArray(params.template.tags);

        return getSignedInUser()
            .then((user) => {
                template = Object.assign(template, {
                    owner: user.id,
                    customer: user.customer
                });

                return tagsToIds(templateTags)
            }).then((tags) => {
                return Object.assign(template, {
                    tags: tags
                });
            });
    };

    // my templates
    var getTemplatesOwned = (user) => {
        return templatesCollection
            .where('customer', '==', user.customer)
            .where('owner', '==', user.id)
            .where('deleted_datetime', '==', null)
            .get()
    };

    // templates shared with me
    var getTemplatesShared = (user) => {
        return templatesCollection
            .where('customer', '==', user.customer)
            .where('shared_with', 'array-contains', user.id)
            .where('deleted_datetime', '==', null)
            .get()
    };

    // templates shared with everyone
    var getTemplatesForEveryone = (user) => {
        return templatesCollection
            .where('customer', '==', user.customer)
            .where('sharing', '==', 'everyone')
            .where('deleted_datetime', '==', null)
            .get()
    };

    var getTemplate = (params = {}) => {
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


        // return single template
        if (params.id) {
            return templatesCollection.doc(params.id).get().then((res) => {
                var templateData = res.data();

                return idsToTags(templateData.tags).then((tags) => {
                    var template = Object.assign({},
                        templateData,
                        {
                            id: res.id,
                            tags: tags.join(', '),
                            // backwards compatibility
                            remote_id: res.id,
                            nosync: 0
                        }
                    );

                    // backwards compatibility
                    var list = [];
                    list[template.id] = template;

                    return list;
                });
            });
        }

        return getSignedInUser()
            .then((user) => {
                var allTemplates = [];
                return Promise.all([
                    getTemplatesOwned(user),
                    getTemplatesShared(user),
                    getTemplatesForEveryone(user)
                ]).then((res) => {
                    // concat all templates
                    res.forEach((query) => {
                        allTemplates = allTemplates.concat(query.docs);
                    });

                    // backward compatibility
                    // and template de-duplication (owned and sharing=everyone)
                    var templates = {};
                    return Promise.all(
                        allTemplates.map((template) => {
                            var templateData = template.data();

                            return idsToTags(templateData.tags).then((tags) => {
                                templates[template.id] = Object.assign(
                                    templateData,
                                    {
                                        id: template.id,
                                        deleted: 0,
                                        tags: tags.join(', '),
                                        // TODO check sharing
                                        private: true,
                                        // backwards compatibility
                                        remote_id: res.id,
                                        nosync: 0
                                    },
                                );

                                return
                            });
                        })
                    ).then(() => {
                        return templates
                    });
                });
            })
            .catch((err) => {
                // TODO not signed-in
                // return from cache
                console.log('err', err);
            });
    };

    // update template details
    // sharing is updated later by updateSharing
    var updateTemplate = (params = {}) => {
//         attachments: []
//         body: "<div>&nbsp;</div>"
//         created_datetime: t {seconds: 1559227395, nanoseconds: 68000000}
//         customer: "IDJ03YipjOV3touEgrbX"
//         deleted_datetime: null
//         id: "500727c5-2c0d-4800-9f08-f6be3fdab248"
//         modified_datetime: t {seconds: 1559227395, nanoseconds: 68000000}
//         owner: "25v9Fag7OyfWQFvbFHimPAn5TuL2"
//         shared_with: []
//         sharing: "none"
//         tags: "test"
//         title: "t"
//         version: 1

        var updatedDate = now();
        var updatedTemplate = {
            modified_datetime: updatedDate,
            title: params.template.title || '',
            body: params.template.body || '',
            shortcut: params.template.shortcut || '',
            subject: params.template.subject || '',
            to: params.template.to || '',
            cc: params.template.cc || '',
            bcc: params.template.bcc || '',
            attachments: params.template.attachments || []
        };

        var templateTags = tagsToArray(params.template.tags);
        return tagsToIds(templateTags).then((tags) => {
            updatedTemplate.tags = tags;
            var ref = templatesCollection.doc(params.template.id);
            return ref.update(updatedTemplate).then(() => {
                // backwards compatibility
                refreshTemplates();

                return Object.assign(updatedTemplate, {
                    remote_id: params.template.id
                });
            });
        });
    };

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

        var newTemplate = {};

        return parseTemplate(params)
            .then((template) => {
                var id = uuid();
                newTemplate = Object.assign({
                    // backwards compatibility
                    id: id,
                    remote_id: id
                }, template);
                var ref = templatesCollection.doc(id);
                return ref.set(template);
            })
            .then(() => {
                // backwards compatibility
                // update template list after creation
                refreshTemplates();

                return newTemplate
            })
            .catch((err) => {
                console.log('error', err);
                // TODO error, not logged-in
                // create offline template
                return
            });
    };

    var deleteTemplate = (params = {}) => {
        var templateId = params.template.id;
        var deletedDate = now();
        var ref = templatesCollection.doc(templateId);
        return ref.update({
            deleted_datetime: deletedDate
        });
    };

    // TODO delete offline templates
    var clearLocalTemplates = mock;

    var getSharing = (params = {}) => {
//         "acl": [
//             {
//             "email": "romain@gorgias.io",
//             "quicktext_id": "07aa73cb-2ed0-4b4a-8ee0-30c91f53e501",
//             "given_name": "Romain",
//             "family_name": "Lapeyre",
//             "created_datetime": "2019-04-08T20:36:25.842155",
//             "user_id": 84,
//             "permission": "owner",
//             "id": "",
//             "target_user_id": 84,
//             "$$hashKey": "object:379"
//             }
//         ]

        if (!params.quicktext_ids || !params.quicktext_ids.length) {
            return Promise.resolve([]);
        }

        var members = [];

        return getMembers({exclude: []}).then((res) => {
            members = res.members;
            return members
        }).then(() => {
            return Promise.all(
                params.quicktext_ids.map((id) => {
                    return templatesCollection.doc(id).get()
                })
            )
        }).then((templates) => {
            // backwards compatibility
            // add template owners to acl
            var acl = templates.map((template) => {
                return {
                    target_user_id: template.data().owner
                }
            });

            return Promise.all(
                templates.map((template) => {
                    var templateData = template.data();
                    if (templateData.sharing === 'everyone') {
                        return members;
                    };

                    // if custom shared_with ids to users
                    if (templateData.sharing === 'custom') {
                        // get from cached members, avoid extra requests
                        return templateData.shared_with.map((userId) => {
                            return members.find((member) => member.id === userId);
                        });
                    };

                    // private
                    return [];
                })
            ).then((sharing) => {
                // merge users in acl, for multiple selected templates
                sharing.forEach((templateSharing) => {
                    templateSharing.forEach((sharedUser) => {
                        // de-duplicate
                        var existing = acl.find((user) => {
                            return user.id === sharedUser.id
                        });

                        if (!existing) {
                            acl.push(Object.assign({
                                // backwards compatibility
                                target_user_id: sharedUser.id
                            }, sharedUser));
                        };
                    });
                });

                // backwards compatibility
                return {
                    acl: acl
                }
            });
        });
    };

    function hasAll (listOne, listTwo) {
        return listTwo.every((val) => {
            return listOne.includes(val);
        });
    };

    var batchDeleteSharing = null;
    var timerDeleteSharing = null;
    var listDeleteSharing = [];
    // batch delete sharing (remove one user from shared_with)
    function deleteSharing (params = {}) {
        if (!batchDeleteSharing) {
            batchDeleteSharing = db.batch();
        }

        if (timerDeleteSharing) {
            clearTimeout(timerDeleteSharing);
        }

        // keep a list of updated templates
        if (!listDeleteSharing.includes(params.id)) {
            listDeleteSharing.push(params.id);
        }

        timerDeleteSharing = setTimeout(() => {
            batchDeleteSharing.commit().then(() => {
                // set sharing=none to templates with shared_with = []
                listDeleteSharing.forEach((id) => {
                    // set sharing to none if share_with empty
                    var ref = templatesCollection.doc(id);
                    ref.get().then((template) => {
                        var templateData = template.data();
                        if (templateData.shared_with.length === 0) {
                            ref.update({
                                sharing: 'none'
                            });
                        }
                    });
                });

                batchDeleteSharing = null;
                listDeleteSharing = [];
            });
        }, 1000);

        var templateRef = templatesCollection.doc(params.id);
        batchDeleteSharing.update(templateRef, {
            sharing: 'custom',
            shared_with: firebase.firestore.FieldValue.arrayRemove(params.user_id)
        });
    };

    var updateSharing = (params = {action: 'create', acl: {}, send_email: 'false'}) => {
        if (params.action === 'delete') {
            // TODO don't allow turn template private if you are not the owner
            // delete sends one request for each user, with params.acl.user_id
            // batch delete requests
            params.acl.quicktext_ids.forEach((id) => {
                deleteSharing({
                    id: id,
                    user_id: params.acl.user_id
                });
            });

            return Promise.resolve();
        }

        // params.acl.quicktexts is map
        var templateIds = Object.keys(params.acl.quicktexts);
        var members = [];
        return getMembers({exclude: []}).then((res) => {
            members = res.members;

            return Promise.all(
                templateIds.map((id) => {
                    return templatesCollection.doc(id).get()
                })
            )
        }).then((templates) => {
            return Promise.all(
                templates.map((template) => {
                    var templateData = template.data();
                    var owner = templateData.owner;
                    var emails = (params.acl.quicktexts[template.id].emails || '').split(',');
                    var sharing = 'none';
                    var shared_with = [];
                    // exclude template owner
                    var possibleMembers = members.filter((m) => m.id !== templateData.owner);
                    var everyMember = possibleMembers.map((m) => m.email);
                    var everyone = hasAll(emails, everyMember);

                    if (everyone) {
                        sharing = 'everyone';
                        // backwards compatibility
                        shared_with = possibleMembers.map((member) => member.id);
                    } else if (emails.length) {
                        sharing = 'custom';
                        // emails to ids
                        shared_with = possibleMembers.filter((member) => {
                            return emails.includes(member.email)
                        }).map((member) => member.id);
                    }

                    // TODO handle send_email param

                    return templatesCollection.doc(template.id).update({
                        sharing: sharing,
                        shared_with: shared_with
                    });
                })
            )
        });
    };

    var getStats = mock;
    var updateStats = mock;

    var getPlans = (params = {}) => {
        var customer = null
        return getSignedInUser().then((user) => {
            customer = user.customer
            return getCurrentUser()
        }).then((currentUser) => {
            return currentUser.getIdToken(true)
        }).then((idToken) => {
            return fetch(`${Config.functionsUrl}/plans`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customer: customer,
                        token: idToken
                    })
                })
                .then(handleErrors)
                .then((res) => res.json());
        });
    };

    var getSubscription = (params = {}) => {
        return getSignedInUser().then((user) => {
            var customerRef = customersCollection.doc(user.customer);

            return customerRef.get()
        }).then((customer) => {
            var subscriptionData = customer.data().subscription;
            var active = true;

            if (subscriptionData.canceled_datetime) {
                active = false;
            }

            // backwards compatibility
            return [
                Object.assign(subscriptionData, {
                    active: active,
                    start_datetime: subscriptionData.start_datetime.toDate()
                })
            ];
        });
    };

    var updateSubscription = mock;
    var cancelSubscription = mock;

    var syncNow = mock;
    var syncLocal = mock;

    // backwards compatibility
    function signinError (err) {
        throw {
            error: err.message || 'There was an issue signing you in. Please try again later.'
        };
    };

    function updateCurrentUser (firebaseUser) {
        var userId = firebaseUser.uid;
        var user = {
            id: userId,
            email: firebaseUser.email,
            created_datetime: new Date(firebaseUser.metadata.creationTime)
        };

        // get data from users collection
        return usersCollection.doc(userId).get().then((userDoc) => {
            // get data from users collection
            var userData = userDoc.data();
            user = Object.assign(user, {
                // only support one customer for now
                customer: userData.customers[0],
                // backwards compatibility
                info: {
                    name: userData.full_name,
                    // TODO get from firestore
                    share_all: true
                },
                editor: {
                    enabled: true
                },
                is_loggedin: true,
                current_subscription: '',
                created_datetime: '',
                current_subscription: {
                    active: true,
                    created_datetime: '',
                    plan: '',
                    quantity: 1
                },
                is_staff: false
            });

            return customersCollection.doc(user.customer).get()
        }).then((customer) => {
            var customerData = customer.data();
            var isCustomer = false;
            if (customerData.owner === user.id) {
                isCustomer = true;
            }

            user = Object.assign({
                is_customer: isCustomer
            }, user);

            return setSignedInUser(user);
        });
    }

    var signin = (params = {}) => {
        // migrate user password from old api
        return fetch(`${Config.functionsUrl}/signinMigrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            })
            .then(handleErrors)
            .then(() => {
                return firebase.auth().signInWithEmailAndPassword(params.email, params.password)
            })
            .then((authRes) => {
                return updateCurrentUser(authRes.user);
            }).catch((err) => {
                return signinError(err);
            });
    };

    var forgot = (params = {}) => {
        return firebase.auth().sendPasswordResetEmail(params.email)
            .catch((err) => {
                return signinError(err);
            });
    };

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

