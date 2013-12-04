/*jshint multistr: true */

// Quicktexts operations
gqApp.service('QuicktextService', function($q, md5){
    var self = this;

    self.db = openDatabase('qt', '1.0.0', '', 2 * 1024 * 1024);
    self.db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE quicktext (\
                id INTEGER PRIMARY KEY AUTOINCREMENT,\
                key VARCHAR(50) DEFAULT "",\
                title VARCHAR(250) NOT NULL,\
                shortcut VARCHAR(250) DEFAULT "",\
                subject TEXT DEFAULT "",\
                tags TEXT DEFAULT "",\
                body TEXT DEFAULT "");');
        tx.executeSql('INSERT INTO quicktext (title, shortcut, body) VALUES ("Say Hello", "h", "Hello {{to.0.first_name}},\n\n")');
        tx.executeSql('INSERT INTO quicktext (title, shortcut, body) VALUES ("Kind regards", "kr", "Kind regards,\n{{from.0.first_name}}.")');
    });

    self.quicktexts = function(){
        var deferred = $q.defer();
        self.db.transaction(function(tx){
            tx.executeSql("SELECT * FROM quicktext", [], function(tx, res) {
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

    // get quicktext object given an id or null
    self.get = function(id) {
        var deferred = $q.defer();
        self.db.transaction(function(tx){
            tx.executeSql("SELECT * FROM quicktext WHERE id = ?", [id], function(tx, res) {
                deferred.resolve(res.rows.item(0));
            });
        });
        return deferred.promise;
    };

    // create and try to sync
    self.create = function(qt){
        self.db.transaction(function(tx){
            tx.executeSql("INSERT INTO quicktext (key, title, subject, shortcut, tags, body) VALUES (?, ?, ?, ?, ?, ?)", [
                qt.key, qt.title, qt.subject, qt.shortcut, qt.tags, qt.body
            ]);
        });
    };

    // update a quicktext and try to sync
    self.update = function(qt){
        self.db.transaction(function(tx){
            tx.executeSql("UPDATE quicktext SET key = ?, title = ?, subject = ?, shortcut = ?, tags = ?, body = ? WHERE id = ?", [
                qt.key, qt.title, qt.subject, qt.shortcut, qt.tags, qt.body, qt.id
            ]);
        });
    };

    // delete a quicktext and try to sync
    self.delete = function(id){
        self.db.transaction(function(tx){
            tx.executeSql("DELETE FROM  quicktext WHERE id =  ?", [id]);
        });
    };

    // delete all but don't delete from server
    self.deleteAll = function(){
        self.db.transaction(function(tx){
            tx.executeSql("DELETE FROM quicktext");
        });
    };


    // get all tags from a quicktext
    self.tags = function(qt){
        var retTags = [];
        _.each(qt.tags.split(","), function(tag){
            retTags.push(tag.replace(/ /g, ""));
        });
        return retTags;
    };

    // get all tags
    self.allTags = function(){
        var deferred = $q.defer();
        self.quicktexts().then(function(quicktexts){
            var tagsCount = {};
            _.each(quicktexts, function(qt){
                _.each(qt.tags.split(","), function(tag){
                    tag = tag.replace(/ /g, "");
                    if (!tag) {
                        return;
                    }
                    if (!tagsCount[tag]){
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

// Settings
gqApp.service('SettingsService', function(){
    var self = this;
    self.get = function(key, def){
        return Settings.get(key, def);
    };
    self.set = function(key, val){
        return Settings.set(key, val);
    };
    return self;
});

// User Profile - check if the user is logged in. Get it's info
gqApp.service('ProfileService', function(SettingsService, md5){
    var self = this;

    self.email = 'alex@gmail-quicktext.com';
    self.firstName = 'Alex';
    self.lastName = 'Plugaru';
    self.currentSubscription = 'Yearly';
    self.expirationDate = '13/11/2014';

    self.gravatar = function(size){
        return 'http://www.gravatar.com/avatar/' + md5.createHash(self.email);
    };

    self.reduceNumbers = function(n) {
        /* Write nice numbers. Ex: 1000 -> 1k */
        if (!n){
            return "0";
        }
        if (n < 1000){
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
            mag= "G";
        } else if (n < Math.pow(10, 14)) {
            p = Math.pow(10, 11);
            mag = "T";
        }
        return (Math.floor((n / p) * p) / p).toFixed(2) + mag;
    };

    self.words = SettingsService.get("words", 0);
    self.savedWords = self.reduceNumbers(self.words);

    self.niceTime = function(minutes){
        if (!minutes){
            return "0min";
        }
        if (minutes < 60) {
            return minutes + "min";
        }
        // 23h and 23m
        if (minutes < 60 * 24) {
            return Math.floor(minutes/60) + "h and " + minutes % 60 + "min";
        } else {
            return Math.floor(minutes / (60 * 24)) + "d, " + Math.floor(minutes % (60 * 24) / 60) + "h and " + minutes % (60 * 24) % 60 + "min";
        }
    }
    // average WPM: http://en.wikipedia.org/wiki/Words_per_minute
    self.avgWPM = 33;
    self.savedTime = self.niceTime(Math.round(self.words/self.avgWPM));

    return self;
});
