/*jshint multistr: true */

gApp.service('FilterTagService', function ($rootScope) {
    var filterTags = [];

    function toggleFilterTag(tag) {
        if (filterTags.length == 0 || filterTags[0] != tag) {
            filterTags[0] = tag;
        }

        $rootScope.$broadcast('toggledFilterTag');
    }

    function emptyFilterTags() {
        filterTags.splice(0, filterTags.length);
        $rootScope.$broadcast('toggledFilterTag');
    }

    return {
        toggleFilterTag: toggleFilterTag,
        emptyFilterTags: emptyFilterTags,
        filterTags: filterTags
    };
});

// Template operations
gApp.service('TemplateService', function ($q, $rootScope, SettingsService) {
    var self = this;
    self.isLoggedin = false;
    SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
        self.isLoggedin = isLoggedIn;
    });

    self.quicktexts = function (limit) {
        var deferred = $q.defer();
        // get all keys
        store.getTemplate().then(function (res) {
            var templates = [];
            for (var id in res) {
                var row = res[id];
                if (row != null && row.deleted === 0) {
                    templates.push(row);
                }
            }
            // sort by created_datetime desc
            templates.sort(function (a, b) {
                return new Date(b.created_datetime) - new Date(a.created_datetime);
            });
            // sort by updated_datetime desc
            // templates.sort(function (a, b) {
            //     return new Date(b.updated_datetime) - new Date(a.updated_datetime);
            // });

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

    // get template object given an id or null
    self.get = function (id) {
        var deferred = $q.defer();
        store.getTemplate({id: id}).then(function (res) {
            deferred.resolve(res[id]);
        });
        return deferred.promise;
    };

    // create and try to sync with the server
    self.create = function (t, onlyLocal, isPrivate) {
        var deferred = $q.defer();
        store.createTemplate({
            template: t,
            onlyLocal: onlyLocal,
            isPrivate: isPrivate
        }).then(deferred.resolve);
        return deferred.promise;
    };

    // update a template and try to sync
    self.update = function (t, onlyLocal, synced) {
        var deferred = $q.defer();
        store.updateTemplate({
            template: t,
            onlyLocal: onlyLocal,
            synced: synced
        }).then(deferred.resolve)
        return deferred.promise;
    };

    // delete a template and try to sync
    self.delete = function (t, onlyLocal) {
        var deferred = $q.defer();
        store.deleteTemplate({
            template: t,
            onlyLocal: onlyLocal
        }).then(deferred.resolve);
        return deferred.promise;
    };

    //TODO: Decide here at some point
    // delete all but don't delete from server
    self.deleteAll = function () {
        var deferred = $q.defer();
        store.clearLocalTemplates().then(() => {
            amplitude.getInstance().logEvent("Deleted all templates");
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
    self.used = function (id, onlyLocal) {
        var deferred = $q.defer();
        self.get(id).then(function (template) {
            var data = {};
            if (typeof template.use_count === 'undefined') {
                template.use_count = 0;
            }
            template.use_count++;
            template.lastuse_datetime = new Date().toISOString();
            data[template.id] = template;
            store.updateTemplate({
                template: data,
                synced: true,
                onlyLocal: true
            }).then(deferred.resolve);
        });
        return deferred.promise;
    };


});
