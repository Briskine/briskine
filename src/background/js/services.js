/*jshint multistr: true */

// Quicktexts operations
gqApp.service('QuicktextService', function ($q, $resource, SettingsService) {
    var self = this;

    SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
        self.qRes = $resource(apiBaseURL + 'quicktexts/:quicktextId', {
            quicktextId: '@remote_id'
        }, {
            update: {
                method: "PUT"
            },
            delete: {
                method: "DELETE",
                isArray: false
            }
        });
    });

    self.isLoggedin = false;
    SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
        self.isLoggedin = isLoggedIn;
    });

    self.db = openDatabase('qt', '1.0.0', '', 2 * 1024 * 1024);
    self.db.transaction(function (tx) {
        var now = new Date().toISOString();
        tx.executeSql('CREATE TABLE quicktext (\n  id               INTEGER PRIMARY KEY AUTOINCREMENT,\n  remote_id        VARCHAR(50) DEFAULT "",\n  title            VARCHAR(250) NOT NULL,\n  shortcut         VARCHAR(250) DEFAULT "",\n  subject          TEXT DEFAULT "",\n  tags             TEXT DEFAULT "",\n  body             TEXT DEFAULT "",\n  created_datetime DATETIME     NOT NULL,\n  updated_datetime DATETIME DEFAULT NULL, -- updated locally\n  sync_datetime    DATETIME DEFAULT NULL, -- last sync datetime\n  deleted          INTEGER DEFAULT 0, -- mark as deleted\n  nosync          INTEGER DEFAULT 0\n);');
    });

    self.quicktexts = function (limit) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            if (limit) {
                limit = " LIMIT " + limit;
            } else {
                limit = "";
            }
            tx.executeSql("SELECT * FROM quicktext WHERE deleted = 0 ORDER BY created_datetime DESC" + limit, [], function (tx, res) {
                var len = res.rows.length, i;
                var list = [];
                for (i = 0; i < len; i++) {
                    list.push(res.rows.item(i));
                }
                deferred.resolve(list);
            });
        });
        return deferred.promise;
    };

    self.filtered = function (filters, args, limit) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            if (filters) {
                filters = " AND " + filters;
            } else {
                filters = "";
            }

            if (limit) {
                limit = " LIMIT " + limit;
            } else {
                limit = "";
            }

            var sql = "SELECT * FROM quicktext WHERE deleted = 0 " + filters + " ORDER BY created_datetime DESC" + limit;
            tx.executeSql(sql, args, function (tx, res) {
                var list = [];
                for (var i = 0; i < res.rows.length; i++) {
                    list.push(res.rows.item(i));
                }
                deferred.resolve(list);
            });
        });
        return deferred.promise;
    };

    /* Sync - assume that there was no connectivity and now we have it

     Local quicktexts:

     * Created (doesn't have a 'remote_id' set)
     * Deleted (deleted=1 in the db) - delete remotely and then completely in the db
     * Updated (sync_datetime is null or lower than the updated_date)

     Remote quicktexts (after local sync):

     * Created (no similar remote_id found locally) - update sync_date
     * Updated (found remote_id - update) - update sync_date
     */


    self.lastSync = null;

    self.sync = function (callback) {
        if (!self.isLoggedin) {
            return;
        }

        //Make sure we first create remote versions of previously unsynced quicktexts
        self.db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM quicktext WHERE remote_id = '' AND nosync = 0", [], function (tx, res) {
                var saveQt = function (qt) {
                    return function (remoteQt) {
                        self.db.transaction(function (tx) {
                            tx.executeSql("UPDATE quicktext SET remote_id = ?, sync_datetime = ? WHERE id = ?", [
                                remoteQt.id, remoteQt.created_datetime, qt.id
                            ]);
                        });
                    };
                };

                for (var i = 0; i < res.rows.length; i++) {
                    var qt = angular.copy(res.rows.item(i));
                    var qtRemote = new self.qRes();
                    qtRemote = self._copy(qt, qtRemote);
                    qtRemote.$save(saveQt(qt));
                }
            });
        });

        // Now for the deleted and updated quicktexts
        self.db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM quicktext WHERE remote_id != '' nosync = 0", [], function (tx, res) {

                var remoteDelete = function (qt) {
                    return function (remoteQt) {
                        // once it's deleted remotely, remove it locally
                        remoteQt.$delete(function () {
                            self.db.transaction(function (tx) {
                                tx.executeSql("DELETE FROM quicktext WHERE id = ?", [qt.id]);
                            });
                        });
                    };
                };

                var remoteUpdate = function (qt) {
                    return function (remoteQt) {
                        remoteQt = self._copy(qt, remoteQt);
                        remoteQt.$update(function (res) {
                            //update the sync time
                            self.db.transaction(function (tx) {
                                tx.executeSql("UPDATE quicktext SET sync_datetime = ? WHERE id = ?", [
                                    res.versions[0].created_datetime, qt.id
                                ]);
                            });
                        });
                    };
                };

                for (var i = 0; i < res.rows.length; i++) {
                    var qt = res.rows.item(i);
                    if (qt.deleted === 1) { // deleted, but not yet synced
                        self.qRes.get({quicktextId: qt.remote_id}, remoteDelete(qt));
                    } else if (!qt.sync_datetime || qt.sync_datetime < qt.updated_datetime) { // send for update only if sync_datetime is older than the update_datetime
                        self.qRes.get({quicktextId: qt.remote_id}, remoteUpdate(qt));
                    }
                }
            });
        });

        // Get the quicktexts from the remote server
        self.qRes.query(function (remoteQuicktexts) {
            self.db.transaction(function (tx) {
                var localQuicktexts = [];
                tx.executeSql("SELECT * FROM quicktext", [], function (tx, res) {
                    for (var i = 0; i < res.rows.length; i++) {
                        localQuicktexts.push(res.rows.item(i));
                    }
                    _.each(remoteQuicktexts, function (remoteQt) {
                        var lastVersion = remoteQt.versions[0];
                        var updated = false;

                        for (var i in localQuicktexts) {
                            var qt = angular.copy(localQuicktexts[i]);
                            if (qt.remote_id === remoteQt.id) {
                                qt = self._copy(lastVersion, qt);
                                qt.remote_id = remoteQt.id;
                                self.update(qt, true);
                                updated = true;
                                break;
                            }
                        }

                        // I wish there was for..else in JS
                        if (!updated) {
                            var newQt = self._copy(lastVersion, {});
                            newQt.remote_id = remoteQt.id;
                            self.create(newQt, true);
                        }
                    });
                });
            });
        });

        // TODO should probably be done in one of the query callbacks
        // after a succesfull sync
        self.lastSync = new Date();
        if (callback) {
            callback(self.lastSync);
        }
    };


// given a string with tags give a clean list
// remove spaces, duplicates and so on
    self._clean_tags = function (tags) {
        var tArray = _.filter(tags.split(','), function (tag) {
            if (tag.trim() !== '') {
                return true;
            }
        });
        tags = _.unique(_.map(tArray, function (t) {
            return t.trim();
        })).join(', ');
        return tags;
    };

// Copy one quicktext object to another - used for the remote saving
    self._copy = function (source, target) {
        for (var k in source) {
            // ignore the no own property or id
            if (k === 'id' && !source.hasOwnProperty(k)) {
                continue;
            }
            if (k === 'tags') {
                target[k] = self._clean_tags(source[k]);
            } else {
                target[k] = source[k];
            }
        }
        return target;
    };

// get quicktext object given an id or null
    self.get = function (id) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            tx.executeSql("SELECT * FROM quicktext WHERE id = ?", [id], function (tx, res) {
                deferred.resolve(res.rows.item(0));
            });
        });
        return deferred.promise;
    };

// create and try to sync with the server
    self.create = function (qt, onlyLocal) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            var now = new Date().toISOString();
            tx.executeSql("INSERT INTO quicktext (remote_id, title, subject, shortcut, tags, body, created_datetime) VALUES (?, ?, ?, ?, ?, ?, ?)", [
                qt.remote_id, qt.title, qt.subject, qt.shortcut, self._clean_tags(qt.tags), qt.body, now
            ], function (_, results) {
                if (onlyLocal) { // update only locally - don't do any remote operations
                    return;
                }

                var remoteDefer = $q.defer();
                deferred.resolve(remoteDefer.promise);

                if (!self.isLoggedin) {
                    remoteDefer.resolve();
                    return;
                }

                var qtId = results.insertId;
                var remoteQt = new self.qRes();
                remoteQt = self._copy(qt, remoteQt);
                // make sure we don't have a remote_id (it's a new template sow there should not be any remote_id)
                remoteQt.remote_id = '';
                remoteQt.$save(function (remoteQt) {
                    // once it's saved server side, store the remote_id in the database
                    self.db.transaction(function (tx) {
                        tx.executeSql("UPDATE quicktext SET remote_id = ?, sync_datetime = ? WHERE id = ?", [
                            remoteQt.id, remoteQt.created_datetime, qtId], function () {
                            remoteDefer.resolve(qtId);
                        });
                    });
                });

                // Send some info about the creation of templates
                mixpanel.track("Created template", {
                    "with_subject": true ? qt.subject !== "" : false,
                    "with_shortcut": true ? qt.shortcut !== "" : false,
                    "with_tags": true ? qt.tags !== "" : false,
                    "title_size": qt.title.length,
                    "body_size": qt.body.length
                });
            });
        });
        return deferred.promise;
    };

// update a quicktext and try to sync
    self.update = function (qt, onlyLocal) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            var now = new Date().toISOString();
            tx.executeSql("UPDATE quicktext SET remote_id = ?, title = ?, subject = ?, shortcut = ?, tags = ?, body = ?, updated_datetime = ? WHERE id = ?", [
                qt.remote_id, qt.title, qt.subject, qt.shortcut, self._clean_tags(qt.tags), qt.body, now, qt.id
            ], function () {
                if (onlyLocal) { // update only locally - don't do any remote operations
                    return;
                }

                var remoteDefer = $q.defer();
                deferred.resolve(remoteDefer.promise);

                if (!self.isLoggedin) {
                    remoteDefer.resolve();
                    return;
                }

                if (!qt.remote_id) {
                    var remoteQt = new self.qRes();
                    remoteQt = self._copy(qt, remoteQt);
                    remoteQt.$save(function (remoteQt) {
                        self.db.transaction(function (tx) {
                            tx.executeSql('UPDATE quicktext SET remote_id = ?, sync_datetime = ? WHERE id = ?', [
                                remoteQt.id, remoteQt.created_datetime, qt.id
                            ], function () {
                                remoteDefer.resolve();
                            });
                        });
                    });
                    deferred.resolve();
                } else {
                    self.qRes.get({quicktextId: qt.remote_id}, function (remoteQt) {
                        remoteQt = self._copy(qt, remoteQt);
                        remoteQt.$update(function () {
                            self.db.transaction(function (tx) {
                                tx.executeSql("UPDATE quicktext SET sync_datetime = ? WHERE id = ?", [
                                    remoteQt.versions[0].created_datetime, qt.id], function () {
                                    remoteDefer.resolve();
                                });
                            });
                        });
                    });
                }
                // Send some info about the creation of templates
                mixpanel.track("Updated template", {
                    "with_subject": true ? qt.subject !== "" : false,
                    "with_shortcut": true ? qt.shortcut !== "" : false,
                    "with_tags": true ? qt.tags !== "" : false,
                    "title_size": qt.title.length,
                    "body_size": qt.body.length
                });
            });
        });
        return deferred.promise;
    };

// delete a quicktext
    self.delete = function (qt) {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            if (!qt.remote_id) { // no remote_id means it was never on sync server
                self.db.transaction(function (tx) {
                    tx.executeSql("DELETE FROM quicktext WHERE id = ?", [qt.id], function () {
                        deferred.resolve();
                    });
                });
                return;
            }

            // we have something on the server so first update to deleted = 1
            tx.executeSql("UPDATE quicktext SET deleted = 1 WHERE id = ?", [qt.id], function () {
                var remoteDefer = $q.defer();
                deferred.resolve(remoteDefer.promise);

                if (!self.isLoggedin) {
                    remoteDefer.resolve();
                    return;
                }

                self.qRes.get({quicktextId: qt.remote_id}, function (remoteQt) {
                    // make sure we have the remote id otherwise the delete will not find the right resource
                    remoteQt.remote_id = remoteQt.id;
                    remoteQt.$delete(function () {
                        // Do a local "DELETE" only if deleted remotely.
                        // If remote operation fails, try again when syncing.
                        //
                        // NOTE: We delete locally to save space.
                        self.db.transaction(function (tx) {
                            tx.executeSql("DELETE FROM quicktext WHERE id = ?", [qt.id], function () {
                                remoteDefer.resolve();
                            });
                        });
                    });
                });
            });
        });
        mixpanel.track("Deleted template");
        return deferred.promise;
    };

//TODO: Decide here at some point
// delete all but don't delete from server
    self.deleteAll = function () {
        var deferred = $q.defer();
        self.db.transaction(function (tx) {
            tx.executeSql("DELETE FROM quicktext");
            mixpanel.track("Deleted all templates");
            deferred.resolve();
        });
        return deferred.promise;
    };

// get all tags from a quicktext
    self.tags = function (qt) {
        var retTags = [];
        _.each(qt.tags.split(","), function (tag) {
            retTags.push(tag.replace(/ /g, ""));
        });
        return retTags;
    };

// get all tags
    self.allTags = function () {
        var deferred = $q.defer();
        self.quicktexts().then(function (quicktexts) {
            var tagsCount = {};
            _.each(quicktexts, function (qt) {
                _.each(qt.tags.split(","), function (tag) {
                    tag = tag.replace(/ /g, "");
                    if (!tag) {
                        return;
                    }
                    if (!tagsCount[tag]) {
                        tagsCount[tag] = 1;
                    } else {
                        tagsCount[tag]++;
                    }
                });
            });
            deferred.resolve(tagsCount);
        });
        return deferred.promise;
    };

});

// Handle stats (publish stats on the remote server)
gqApp.service('StatsService', function ($resource, SettingsService) {
    var self = this;

    self.syncStatsTimer = null;
    SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
        self.statsRes = $resource(apiBaseURL + 'stats/');
    });

    // should probably be called every few minutes or so
    self.sync = function () {
        SettingsService.get("sendStatsEnabled").then(function (sendStatsEnabled) {
            if (sendStatsEnabled) { // do this only if user allowed sending anonymous statistics
                SettingsService.get("words").then(function (words) {
                    SettingsService.get('syncedWords').then(function (syncedWords) {
                        var newWords = words - syncedWords;
                        if (newWords > 0) {
                            var stats = new self.statsRes();
                            stats.words = newWords;
                            stats.$save(function () {
                                SettingsService.set("syncedWords", words);
                                SettingsService.set("lastStatsSync", new Date());
                            });
                        }
                    });
                });
            }
        });

        window.clearTimeout(self.syncStatsTimer);
        self.syncStatsTimer = window.setTimeout(self.sync, 15 * 60 * 1000); // every 15minutes
    };
    self.sync();
});

// Settings
gqApp.service('SettingsService', function ($q) {
    var self = this;
    self.get = function (key, def) {
        var deferred = $q.defer();
        Settings.get(key, def, function (data) {
            deferred.resolve(data);
        });
        return deferred.promise;
    };
    self.set = function (key, val) {
        var deferred = $q.defer();
        Settings.set(key, val, function () {
            deferred.resolve();
        });
        return deferred.promise;
    };
    self.reset = function() {
        for (var k in Settings.defaults){
            Settings.set(k, Settings.defaults[k], function () {
                // nothing to do here
            });
        }
    };
    return self;
});

// User Profile - check if the user is logged in. Get it's info
gqApp.service('ProfileService', function ($q, SettingsService, md5) {
    var self = this;

    self.gravatar = function (email, size) {
        if (email) {
            return 'https://www.gravatar.com/avatar/' + md5.createHash(email) + '?d=identicon';
        }
    };

    self.reduceNumbers = function (n) {
        /* Write nice numbers. Ex: 1000 -> 1k */
        if (!n) {
            return "0";
        }
        if (n < 1000) {
            return n;
        }

        var mag, p;
        if (n < Math.pow(10, 6)) {
            mag = "k";
            p = Math.pow(10, 3);
        } else if (n < Math.pow(10, 8)) {
            p = Math.pow(10, 6);
            mag = "M";
        } else if (n < Math.pow(10, 11)) {
            p = Math.pow(10, 8);
            mag = "G";
        } else if (n < Math.pow(10, 14)) {
            p = Math.pow(10, 11);
            mag = "T";
        }
        return (Math.floor((n / p) * p) / p).toFixed(2) + mag;
    };

    self.words = function(){
        return SettingsService.get("words", 0);
    };
    //self.savedWords = self.reduceNumbers(self.words);

    self.niceTime = function (minutes) {
        if (!minutes) {
            return "0min";
        }
        if (minutes < 60) {
            return minutes + "min";
        }
        // 23h and 23m
        if (minutes < 60 * 24) {
            return Math.floor(minutes / 60) + "h and " + minutes % 60 + "min";
        } else {
            return Math.floor(minutes / (60 * 24)) + "d, " + Math.floor(minutes % (60 * 24) / 60) + "h and " + minutes % (60 * 24) % 60 + "min";
        }
    };
    // average WPM: http://en.wikipedia.org/wiki/Words_per_minute
    self.avgWPM = 25;
    self.savedTime = function(){
        var deferred = $q.defer();
        self.words().then(function(words){
            deferred.resolve(self.niceTime(Math.round(words / self.avgWPM)));
        });
        return deferred.promise;
    };

    return self;
});
