gApp.controller('SettingsCtrl', function ($scope, $rootScope, $timeout,  AccountService, TemplateService, SettingsService) {
    $scope.activeTab = "settings";

    AccountService.get().then(function(data){
        $scope.account = data;
    });

    $scope.showWarning = false;
    $scope.settings = {};
    SettingsService.get('settings').then(function(settings){
        $scope.settings = settings;
    });

    $scope.updateSettings = function(){
        // check if we have to disable stats
        if (!$scope.settings.stats.enabled) {
            amplitude.setOptOut(true);
        } else {
            if(amplitude) {
                //enable events
                amplitude.setOptOut(false);
            }
        }
        SettingsService.set('settings', $scope.settings).then(function(){
            $scope.showWarning = true;
        });
    };

    $scope.recordSequence = function(selector) {
        var input = $('#' + selector);
        var model = input.attr('ng-model');
        input.val('');

        Mousetrap.record(function(sequence) {
            // sequence is an array like ['ctrl+k', 'c']

            var val = sequence.join(' ');
            if (model === 'settings.keyboard.shortcut'){
                $scope.settings.keyboard.shortcut = val;
            } else if (model === 'settings.dialog.shortcut'){
                $scope.settings.dialog.shortcut = val;
            }
            input.val(val);
            $scope.updateSettings();
        });
    };

    $scope.AddBlacklistItem = function() {
        $scope.settings.blacklist.push('');

        // focus the last element blacklist website
        // wait for angular to digest it
        $timeout(function() {
            var $container = $('.blacklist-list');
            var $newItem = $container.find('.blacklist-item-url').last();

            $newItem.focus();
        });
        $scope.updateSettings();
    };

    $scope.RemoveBlacklistItem = function(index) {
        $scope.settings.blacklist.splice(index, 1);
        $scope.updateSettings();
    };

    $scope.CheckBlacklistItem = function(index) {
        // if the url is blank, remove it
        if($scope.settings.blacklist[index].trim() === '') {
            $scope.settings.blacklist.splice(index, 1);
        }
    };

    // Delete all templates. This will not delete the templates on the server side
    $scope.deleteAll = function () {
        var r = confirm("Are you sure you want to delete all templates?\n\nNote: they will NOT be deleted from the sync server if it's setup.");
        if (r === true) {
            TemplateService.deleteAll().then(function(){
                alert("All templates have been deleted from your computer.");
            });
        }
    };

    $scope.resetSettings = function () {
        var r = confirm("Are you sure you want reset your settings?\n\nNote: Your stats will be reset");
        if (r === true) {
            SettingsService.reset();
        }
    };

    $scope.firestoreEnabled = window.FIRESTORE_ENABLED();
    $scope.disableFirestore = () => {
        window.TOGGLE_FIRESTORE(false);
        window.location.reload();
    };
});
