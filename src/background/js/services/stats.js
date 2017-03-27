gApp.service('StatsService', function ($q, $resource) {
    var self = this;

    self.res = $resource(Settings.defaults.apiBaseURL + 'templates/stats', {}, {
        get: {
            method: "GET"
        }
    });

    self.get = function (options) {
        var deferred = $q.defer();
        self.res.get(function (res) {
            deferred.resolve(res);
        });
        return deferred.promise;
    };
});
