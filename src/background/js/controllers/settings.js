/* globals confirm */
import $ from 'jquery';
import Mousetrap from 'mousetrap';

import exportTemplates from '../utils/export-templates';

export default function SettingsCtrl ($scope, $rootScope, $timeout, AccountService, TemplateService, SettingsService) {
    'ngInject';
    $scope.activeTab = "settings";

    AccountService.get().then(function(data){
        $scope.account = data;
    }).catch(() => {
        // not logged-in
    });

    $scope.showWarning = false;
    $scope.settings = {};
    SettingsService.get('settings').then(function(settings){
        $scope.settings = settings;
    });

    $scope.updateSettings = function(){
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

    $scope.resetSettings = function () {
        var r = confirm("Are you sure you want reset your settings?\n\nNote: Your stats will be reset");
        if (r === true) {
            SettingsService.reset();
        }
    };

    $scope.exportLocal = function () {
        chrome.storage.local.get(null, (data) => {
            const legacyTemplates = Object.keys(data)
                .filter((key) => {
                    const item = data[key];
                    if (typeof item === 'object' && item.id && item.body) {
                        return true;
                    }

                    return false;
                })
                .map((key) => {
                    return data[key];
                });

            const templates = Object.keys((data.firestoreLocalData || {}))
                .map((key) => {
                    return data[key];
                })
                .filter((item) => {
                    // de-duplicate by body
                    if (!legacyTemplates.find((legacy) => legacy.body === item.body)) {
                        return true;
                    }

                    return false;
                })
                .concat(legacyTemplates);

            exportTemplates(templates);
        });
    };
}
