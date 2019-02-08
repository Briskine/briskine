function _noop() {}

window.gorgiasExp = {
    setTemplate: _noop,
    getTemplate: _noop
}

;(function() {
try {
    if (
        typeof chrome.extension.getBackgroundPage !== 'function'
        && window.self !== window.top
    ) {
        // run contentscript only in top frames
        return
    }

    var getCache = []
    var getListCache = false

    var apiKey = 'AIzaSyBEBSU27-KiamI2acQBj5zXHBU91K0wLPE'
    var authDomain = 'gorgias-templates-staging.firebaseapp.com'
    var projectId = 'gorgias-templates-staging'
    var idKey = 'expUserId'
    var ready = false
    var firebaseUid
    var db

    function getRandomToken () {
        var randomPool = new Uint8Array(8)
        crypto.getRandomValues(randomPool)
        var hex = ''
        for (var i = 0; i < randomPool.length; i++) {
            hex += randomPool[i].toString(16)
        }
        return hex
    }

    function getEmail (userId) {
        return `${userId}@gorgias.io`
    }

    var initQueue = []
    function queue (func) {
        return function () {
            if (ready) {
                return func.apply(window, arguments)
            }

            initQueue.push(() => {
                func.apply(window, arguments)
            })
        }
    }

    function runInitQueue () {
        initQueue.forEach(function (func) {
            func()
        })
        ready = true
    }

    function anonymize (template = {}) {
        var data = {}
        Object.keys(template).forEach((key) => {
            if (
                [
                'id',
                'remote_id'
                ].includes(key)
            ) {
                return
            }

            if (typeof template[key] === 'string') {
                data[key] = 'g'.repeat(template[key].length)
            } else {
                data[key] = 0
            }
        })

        data.owner = firebaseUid
        return data
    }

    function register () {
        var user = {}
        user[idKey] = getRandomToken()

        // create firebase user
        return firebase.auth()
        .createUserWithEmailAndPassword(
            getEmail(user[idKey]),
            user[idKey]
        )
        .then(function () {
            // save user id
            chrome.storage.sync.set(user)
        })
    }

    function login (userId) {
        return firebase.auth()
        .signInWithEmailAndPassword(
            getEmail(userId),
            userId
        )
    }

    function getTemplateData (data = {}) {
        var localId = Object.keys(data || {})[0]
        return data[localId] || {}
    }

    function setTemplate (template = {}) {
        var id = template.remote_id || template.id

        if (id) {
            db.collection('templates')
            .doc(id)
            .update(anonymize(template))
        }
    }

    function allTemplatesQuery () {
        return db.collection('templates')
            .where('owner', '==', firebaseUid)
    }

    function getTemplate (data = {}) {
        var template = getTemplateData(data)
        var id = template.remote_id || template.id

        if (!id && !getListCache) {
            getListCache = true
            return allTemplatesQuery().get()
        }

        if (getCache.includes(id)) {
            return
        }

        getCache.push(id)

        return db.collection('templates')
            .doc(id)
            .get()
            .then((res) => {
                // template doesn't exist, create it
                if (!res.exists) {
                    setTemplate(data)
                }
            })
    }

    function init () {
        if (!window.firebase) {
            return
        }

        firebase.initializeApp({
            apiKey: apiKey,
            authDomain: authDomain,
            projectId: projectId
        })

        db = firebase.firestore()
        var settings = {timestampsInSnapshots: true}
        db.settings(settings)
        db.enablePersistence({
            experimentalTabSynchronization:true
        })

        firebase.auth()
        .onAuthStateChanged(function (user) {
            firebaseUid = (user || {}).uid

            // already logged-in
            if (user) {
                runInitQueue()

                allTemplatesQuery()
                .onSnapshot(() => {})

                // get all templates,
                // simulate sync
                getTemplate()

                window.gorgiasExp = {
                    setTemplate: queue(setTemplate),
                    getTemplate: queue(getTemplate),
                }

                return
            }

            // check existing user id
            chrome.storage.sync.get(idKey, function (res) {
                if (res[idKey]) {
                    return login(res[idKey])
                        .catch((err) => {
                            // have uid but can't login
                            // user was deleted or similar
                            return register()
                        })
                }

                register()
            })
        })
    }

    init()
} catch(err) {}
}())
 
