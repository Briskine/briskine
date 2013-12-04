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
    return self;
});

// Settings
gqApp.service('SettingsService', function(){
    var self = this;
    self.get = function(key){
        return Settings.get(key);
    };
    self.set = function(key, val){
        return Settings.set(key, val);
    };
    return self;
});

// User Profile - check if the user is logged in. Get it's info
gqApp.service('ProfileService', function(md5){
    var self = this;

    self.email = 'alex@gmail-quicktext.com';
    self.firstName = 'Alex';
    self.lastName = 'Plugaru';
    self.currentSubscription = 'Yearly';
    self.expirationDate = '13/11/2014';

    self.gravatar = function(size){
        return 'http://www.gravatar.com/avatar/' + md5.createHash(self.email);
    };
    return self;
});
