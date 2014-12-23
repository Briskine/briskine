gqApp.controller('SettingsCtrl', function ($scope, $rootScope, QuicktextService, SettingsService) {

    $scope.settings =  SettingsService.get('settings');

    $scope.$watch("settings", function(data){
        $scope.updateSettings(data)
    }, true);

    $scope.updateSettings = function(data){
        SettingsService.set('settings', data);
    };

    // Delete all quicktexts. This will not delete the quicktexts on the server side
    $scope.deleteAll = function () {
        var r = confirm("Are you sure you want to delete all templates?\n\nNote: they will NOT be deleted from the sync server if it's setup.");
        if (r === true) {
            QuicktextService.deleteAll().then(function(){
                alert("All templates have been deleted. You can still get them back if you are registered gorgias.io");
            });
        }
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
            $scope.updateSettings($scope.settings);

            chrome.tabs.query({'url': '<all_urls>', 'windowType': 'normal'}, function (tabs) {
                for (var i in tabs) {
                    chrome.tabs.reload(tabs[i].id, {});
                }
            });
        });
    };
});
