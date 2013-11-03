// Quicktexts operations
gqApp.service('QuicktextService', function(){
    var self = this;

    self.quicktexts = function(){
        return Settings.get('quicktexts');
    };

    // get quicktext object given an id or null
    self.get = function(id){
        var found;
        if (id) {
            _.each(Settings.get('quicktexts'), function(qt){
                if (qt.id == id) {
                    found = qt;
                    return false; // return false to stop the loop
                }
            });
        }
        return found;
    };

    // create and try to sync
    self.create = function(qt){
        var id = hex_md5(qt.title + qt.subject + qt.shortcut + qt.tags + qt.body);
        var newQt = {
            'id': id,
            'key': qt.key,
            'title': qt.title,
            'subject': qt.subject,
            'shortcut': qt.shortcut,
            'tags': qt.tags,
            'body': qt.body,
        };
        var quicktexts = Settings.get('quicktexts');
        quicktexts.push(newQt);
        Settings.set('quicktexts', quicktexts);
    };

    // update a quicktext and try to sync
    self.update = function(newQt){
        Settings.set('quicktexts', _.map(Settings.get('quicktexts'), function(qt){
            if (qt.id === newQt.id){
                return newQt;
            }
            return qt;
        }));
    };
 

    // delete a quicktext and try to sync
    self.delete = function(id){
        Settings.set('quicktexts', _.filter(Settings.get('quicktexts'), function(qt){
            return qt.id != id;
        }));
    };

    // delete all but don't delete from server
    self.deleteAll = function(){
        Settings.set('quicktexts', []);
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
        tagsCount = {};
        _.each(Settings.get('quicktexts'), function(qt){
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
        return tagsCount;
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
gqApp.service('ProfileService', function(){
    var self = this;

    self.email = 'alex@gmail-quicktext.com';
    self.firstName = 'Alex';
    self.lastName = 'Plugaru';
    self.currentSubscription = 'Yearly';
    self.expirationDate = '13/11/2014';

    self.gravatar = function(size){
        return 'http://www.gravatar.com/avatar/' + hex_md5(self.email);
    };
    return self;
}); 
