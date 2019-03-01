gApp.service('QuicktextSharingService', function($q, $resource, $rootScope) {
    var self = this;

    self.res = $resource($rootScope.apiBaseURL + 'share', {}, {
        post: {
            method: "POST"
        },
        update: {
            method: "PUT"
        },
        revoke: {
            method: "DELETE"
        }
    });

    // get quicktext's ACL given an id or null
    self.get = function(id) {
        var deferred = $q.defer();

        var sharing = new self.res();
        sharing.quicktext_ids = [id];

        sharing.$post(function(acl) {
            deferred.resolve(acl);
        });

        return deferred.promise;
    };

    self.list = function(qtList) {
        var deferred = $q.defer();
        var acls = new self.res();

        acls.quicktext_ids = _.map(qtList, function(qt){
            return qt.remote_id;
        });

        acls.$post(function(result){
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

        var acls = new self.res();
        acls.acl = data;
        acls.action = 'create';
        acls.send_email = send_email;
        acls.$update(function(res){
            amplitude.getInstance().logEvent('Shared Quicktext');
            deferred.resolve(res);
        });
        return deferred.promise;
    };

    // delete sharing for a list of quicktexts for a given target user
    self.delete = function(qtList, userId) {
        var deferred = $q.defer();
        var acls = new self.res();
        acls.acl = {
            quicktext_ids: _.map(qtList, function(qt){
                return qt.remote_id;
            }),
            user_id: userId
        };
        acls.action = 'delete';
        acls.$update(function(){
            amplitude.getInstance().logEvent('Deleted Quicktext Sharing');
            deferred.resolve();
        });
        return deferred.promise;
    };

});
