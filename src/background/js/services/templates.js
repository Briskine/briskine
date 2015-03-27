/*jshint multistr: true */


// Template operations
gApp.service('TemplateService', function ($q, $resource, SettingsService) {
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

    self.quicktexts = function (limit) {
        var deferred = $q.defer();
        // get all keys
        TemplateStorage.get(null, function (res) {
            var templates = [];
            for (var id in res) {
                var row = res[id];
                if (row.deleted === 0) {
                    templates.push(row);
                }
            }
            // sort by created_datetime desc
            templates.sort(function (a, b) {
                return new Date(b.created_datetime) - new Date(a.created_datetime);
            });
            // sort by updated_datetime desc
            templates.sort(function (a, b) {
                return new Date(b.updated_datetime) - new Date(a.updated_datetime);
            });

            if (limit) {
                templates = templates.splice(0, limit);
            }
            deferred.resolve(templates);
        });
        return deferred.promise;
    };

    self.filtered = function (filters, limit) {
        var deferred = $q.defer();
        self.quicktexts().then(function (templates) {
            for (var i in filters) {
                templates = _.filter(templates, filters[i]);
            }
            if (limit) {
                templates = templates.splice(0, limit);
            }
            deferred.resolve(templates);
        });
        return deferred.promise;
    };

    /* Sync - assume that there was no connectivity and now we have it

     Local templates:

     * Created (doesn't have a 'remote_id' set)
     * Deleted (deleted=1 in the db) - delete remotely and then completely in the db
     * Updated (sync_datetime is null or lower than the updated_date)

     Remote templates (after local sync):

     * Created (no similar remote_id found locally) - update sync_date
     * Updated (found remote_id - update) - update sync_date
     */

    self.lastSync = null;

    self.sync = function (callback) {
        if (!self.isLoggedin) {
            return;
        }

        // Get the new or updated templates from the remote server
        self.qRes.query(function (remoteTemplates) {
            var now = new Date().toUTCString();

            TemplateStorage.get(null, function (localTemplates) {
                _.each(remoteTemplates, function (remote) {
                    var t;
                    var lastVersion = remote.versions[0];

                    var updated = false;
                    for (var id in localTemplates) {
                        t = localTemplates[id];
                        if (t.remote_id === remote.id) {
                            t = self._copy(lastVersion, t);
                            t.remote_id = remote.id;
                            self.update(t, true, true);

                            updated = true;
                            break;
                        }
                    }

                    // I wish there was for..else in JS
                    if (!updated) {
                        t = self._copy(lastVersion, {});
                        t.remote_id = remote.id;
                        t.sync_datetime = now;

                        self.create(t, true).then(function () {

                        });
                    }
                });
            });
        });

        // TODO should probably be done in one of the query callbacks
        // after a successful sync
        self.lastSync = new Date();
        if (callback) {
            callback(self.lastSync);
        }
    };

    self.syncLocal = function (callback) {
        if (!self.isLoggedin) {
            return;
        }

        // Handling all local templates
        TemplateStorage.get(null, function (templates) {
            for (var id in templates) {
                var t = templates[id];
                if (t.nosync !== 0) {
                    continue;
                }

                // no remote_id means that it's local only and we have to sync it with the remote sync service
                if (!t.remote_id) {
                    if (t.deleted === 1) {
                        continue;
                    }

                    var tRemote = new self.qRes();
                    tRemote = self._copy(angular.copy(t), tRemote);

                    // create new template on the server
                    tRemote.$save(function (res) {
                        t.remote_id = res.id;
                        t.sync_datetime = new Date().toUTCString();

                        var data = {};
                        data[t.id] = t;
                        self.create(t, true);
                    });
                } else { // was synced at some point
                    // if it's deleted locally, delete it remotely and then delete it locally
                    if (t.deleted === 1) {
                        self.qRes.get({quicktextId: t.remote_id}, function (remote) {
                            remote.$delete(function () {
                                TemplateStorage.remove(t.id);
                            });
                        });
                    } else if (t.updated_datetime) { // only if we have an updated_datetime
                        if (!t.sync_datetime || new Date(t.sync_datetime) < new Date(t.updated_datetime)) {

                            // template was updated locally, synced yet
                            self.qRes.get({quicktextId: t.remote_id}, function (remote) {
                                remote = self._copy(t, remote);
                                remote.$update(function () {
                                    t.sync_datetime = new Date().toUTCString();
                                    var data = {};
                                    data[t.id] = t;
                                    TemplateStorage.set(data);
                                });
                            });
                        }
                    }
                }
            }
        });

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

// Copy one template object to another - used for the remote saving
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

// get template object given an id or null
    self.get = function (id) {
        var deferred = $q.defer();
        TemplateStorage.get(id, function (res) {
            deferred.resolve(res[id]);
        });
        return deferred.promise;
    };

// create and try to sync with the server
    self.create = function (t, onlyLocal) {
        var deferred = $q.defer();

        // UUID4 as an id for the template
        t.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        t.nosync = typeof t.nosync !== 'undefined' ? t.nosync : 0;
        t.deleted = 0;
        t.use_count = 0;
        t.created_datetime = new Date().toUTCString();
        t.updated_datetime = t.updated_datetime || "";
        t.sync_datetime = t.sync_datetime || "";
        t.lastuse_datetime = t.lastuse_datetime || "";
        t.tags = self._clean_tags(t.tags);

        var data = {};
        data[t.id] = t;

        TemplateStorage.set(data, function () {
            if (onlyLocal) { // create only locally - don't do any remote operations
                deferred.resolve();
                return;
            }

            mixpanel.track("Created template", {
                "with_subject": true ? t.subject : false,
                "with_shortcut": true ? t.shortcut : false,
                "with_tags": true ? t.tags : false,
                "title_size": t.title.length,
                "body_size": t.body.length
            });

            if (!self.isLoggedin) {
                deferred.resolve();
                return;
            }

            var remote = new self.qRes();
            remote = self._copy(t, remote);
            // make sure we don't have a remote_id (it's a new template sow there should not be any remote_id)
            remote.remote_id = '';
            remote.$save(function (remote) {
                // once it's saved server side, store the remote_id in the database
                t.remote_id = remote.id;
                t.sync_datetime = new Date().toUTCString();
                TemplateStorage.set(data, function () {
                    deferred.resolve(t.id);
                });
            });
        });
        return deferred.promise;
    };

// update a template and try to sync
    self.update = function (t, onlyLocal, synced) {
        var deferred = $q.defer();

        // this template was synced. Update only sync_datetime and not updated_datetime
        if (synced) {
            t.sync_datetime = new Date().toUTCString();
        } else {
            t.updated_datetime = t.updated_datetime || new Date().toUTCString();
        }
        var data = {};
        data[t.id] = t;

        TemplateStorage.set(data, function () {
            if (onlyLocal) { // update only locally - don't do any remote operations
                deferred.resolve();
                return;
            }
            // Send some info about the creation of templates
            mixpanel.track("Updated template", {
                "with_subject": true ? t.subject : false,
                "with_shortcut": true ? t.shortcut : false,
                "with_tags": true ? t.tags : false,
                "title_size": t.title.length,
                "body_size": t.body.length
            });

            if (!self.isLoggedin) { // if it's not logged in
                deferred.resolve();
                return;
            }

            if (!t.remote_id) {
                var remote = new self.qRes();
                remote = self._copy(t, remote);
                remote.$save(function (res) {

                    t.remote_id = res.id;
                    t.sync_datetime = new Date().toUTCString();

                    var data = {};
                    data[t.id] = t;
                    TemplateStorage.set(data, function () {
                        deferred.resolve();
                    });
                });
                deferred.resolve();
            } else {
                self.qRes.get({quicktextId: t.remote_id}, function (remote) {
                    remote = self._copy(t, remote);
                    remote.$update(function () {
                        t.sync_datetime = new Date().toUTCString();
                        var data = {};
                        data[t.id] = t;
                        TemplateStorage.set(data, function () {
                            deferred.resolve();
                        });
                    });
                });
            }
        });

        return deferred.promise;
    };

// delete a template and try to sync
    self.delete = function (t) {
        var deferred = $q.defer();
        if (!t.remote_id) {
            TemplateStorage.remove(t.id, function () {
                mixpanel.track("Deleted template");
                deferred.resolve();
            });
        } else {
            var data = {};
            t.deleted = 1;
            data[t.id] = t;
            TemplateStorage.set(data, function () {
                mixpanel.track("Deleted template");
                self.qRes.get({quicktextId: t.remote_id}, function (remote) {
                    // make sure we have the remote id otherwise the delete will not find the right resource
                    remote.remote_id = remote.id;
                    remote.$delete(function () {
                        // Do a local "DELETE" only if deleted remotely.
                        // If remote operation fails, try again when syncing.
                        //
                        // NOTE: We delete locally to save space.
                        TemplateStorage.remove(t.id, function () {
                            mixpanel.track("Deleted template");
                            deferred.resolve();
                        });
                    });
                });
            });
        }
        return deferred.promise;
    };

//TODO: Decide here at some point
// delete all but don't delete from server
    self.deleteAll = function () {
        var deferred = $q.defer();
        TemplateStorage.clear(function () {
            mixpanel.track("Deleted all templates");
            deferred.resolve();
        });
        return deferred.promise;
    };

// get all tags from a template
    self.tags = function (t) {
        var retTags = [];
        _.each(t.tags.split(","), function (tag) {
            retTags.push(tag.replace(/ /g, ""));
        });
        return retTags;
    };

// get all tags from all templates
    self.allTags = function () {
        var deferred = $q.defer();
        self.quicktexts().then(function (quicktexts) {
            var tagsCount = {};
            _.each(quicktexts, function (t) {
                _.each(t.tags.split(","), function (tag) {
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

    // Update lastuse_datetime
    self.used = function(id, onlyLocal) {
        var deferred = $q.defer();
        self.get(id).then(function(template){
            var data = {};
            if (typeof template.use_count === 'undefined') {
                template.use_count = 0;
            }
            template.use_count++;
            template.lastuse_datetime = new Date().toUTCString();
            data[template.id] = template;
            TemplateStorage.set(data, function () {
                deferred.resolve();
            });
        });
        return deferred.promise;
    };
})
;

