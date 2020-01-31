import store from '../../../store/store-client';

// Settings
export function SettingsService ($q) {
    'ngInject';
    var self = this;
    self.get = function (key, def) {
        var deferred = $q.defer();
        store.getSettings({
            key: key,
            def: def
        }).then(deferred.resolve);
        return deferred.promise;
    };
    self.set = function (key, val) {
        var deferred = $q.defer();
        store.setSettings({
            key: key,
            val: val
        }).then(deferred.resolve);
        return deferred.promise;
    };
    self.reset = function () {
        var deferred = $q.defer();
        store.setSettings({
            key: 'settings'
        }).then(deferred.resolve);
        return deferred.promise;
    };
    return self;
}

// User Profile - check if the user is logged in. Get it's info
export function ProfileService ($q, SettingsService) {
    'ngInject';
    var self = this;

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

    self.words = function () {
        return SettingsService.get("words", 0);
    };

    self.savedWords = self.reduceNumbers(self.words);

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
    self.savedTime = function () {
        var deferred = $q.defer();
        self.words().then(function (words) {
            deferred.resolve(self.niceTime(Math.round(words / self.avgWPM)));
        });
        return deferred.promise;
    };
}
