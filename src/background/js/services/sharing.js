gApp.service('QuicktextSharingService', function($q, $rootScope) {
    var self = this;

    // get quicktext's ACL given an id or null
    // TODO DEPRECATE this is not used anywhere?
    self.get = function(id) {
        var deferred = $q.defer();
        store.getSharing({
            quicktext_ids: [id]
        }).then(deferred.resolve);
        return deferred.promise;
    };

    self.list = function(qtList = []) {
        var deferred = $q.defer();
        store.getSharing({
            quicktext_ids: qtList.filter((qt) => !!qt.remote_id).map(function(qt) {
                return qt.remote_id;
            })
        }).then((result) => {
            deferred.resolve(result.acl);
        });
        return deferred.promise;
    };

    // Add users to a the ACL list of a bunch of quicktexts
    self.create = function(qtList, shareData, permission, send_email) {
        var deferred = $q.defer();
        var data = {
            message: shareData.message,
            quicktexts: {}
        };

        if (!permission) {
            permission = 'edit';
        }

        _.each(qtList, function(q){
            if (!_.contains(data[q.remote_id])) {
                data.quicktexts[q.remote_id] = {};
            }
            data.quicktexts[q.remote_id].emails = shareData.emails;
            data.quicktexts[q.remote_id].permission = permission;
        });

        store.updateSharing({
            acl: data,
            action: 'create',
            send_email: send_email
        }).then((res) => {
            amplitude.getInstance().logEvent('Shared Quicktext');
            deferred.resolve(res);
        });
        return deferred.promise;
    };

    // delete sharing for a list of quicktexts for a given target user
    self.delete = function(qtList, userId) {
        var deferred = $q.defer();
        store.updateSharing({
            action: 'delete',
            acl: {
                quicktext_ids: _.map(qtList, function(qt){
                    return qt.remote_id;
                }),
                user_id: userId
            }
        }).then(() => {
            amplitude.getInstance().logEvent('Deleted Quicktext Sharing');
            deferred.resolve();
        });
        return deferred.promise;
    };

});
