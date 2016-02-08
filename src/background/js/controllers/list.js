gApp.controller('ListCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams, $location, $timeout, $filter,
              AccountService, TemplateService, SettingsService, FilterTagService, QuicktextSharingService,
              MemberService) {

        var $formModal;
        var $shareModal;
        var editor;

        var properties = $route.current.locals.properties;

        switch(properties.list) {
            case 'shared':
                $scope.title = "Shared templates";
                $scope.location = "/list/shared";
                $scope.sharing_setting = "Share with everyone";
                break;
            case 'private':
                $scope.title = "Private templates";
                $scope.location = "/list/private";
                $scope.sharing_setting = "Private";
                break;
            case 'tag':
                $scope.title = "<i class='fa fa-hashtag'/>" + FilterTagService.filterTags[0] + " templates";
                $scope.location = "/list/tag";
                $scope.sharing_setting = "Private";
                break;
            default:
                $scope.title = "All templates";
                $scope.location = "/list";
                $scope.sharing_setting = "Private";
                break;
        }

        $scope.shareData = {
            sharing: {},
            members: [],
            emails: "",
            message: "",
            acl: []
        };

        $scope.baseUrl = Settings.defaults.baseURL;

        $scope.account = {};
        $scope.filteredTemplates = [];
        $scope.templates = [];
        $scope.selectedQuicktexts = [];
        $scope.filterTags = [];
        $scope.limitTemplates = 42; // I know.. it's a cliche
        $scope.showInstallHint = false;

        function loadAccount() {
            AccountService.get().then(function(account) {
                $scope.account = account;
            });
        }

        loadAccount();

        $scope.$on('loggedIn', loadAccount);

        // Hide Subject and Tags fields by default
        $scope.settings = {};
        SettingsService.get('settings').then(function (settings) {
            $scope.settings = settings;
            $scope.subjectEnabled = settings.fields.subject;
            $scope.tagsEnabled = settings.fields.tags;

            if (!settings.shownInstallHint) {
                $scope.showInstallHint = true;
            }
        });

        $scope.closeHint = function () {
            SettingsService.get('settings').then(function (settings) {
                $scope.showInstallHint = false;

                settings.shownInstallHint = true;
                SettingsService.set('settings', settings);
            });
        };

        $scope.toggleField = function (field, enabled) {
            SettingsService.get('settings').then(function (settings) {
                settings.fields[field] = enabled;
                SettingsService.set('settings', settings);
            });
        };

        // by default the load more button is disabled
        $('.load-more').hide();

        $scope.reloadTemplates = function () {
            TemplateService.filtered([function(template) {
                if (properties.list == 'all' || properties.list == 'tag') { return true;}
                else if (properties.list == 'private') { return template.private; }
                else if (properties.list == 'shared') { return !template.private; }
            }]).then(function (r) {
                $scope.templates = r;
                $rootScope.$broadcast('reload')
            });
        };

        $scope.reloadTemplates();

        // Listen on syncing events
        $scope.$on("templates-sync", $scope.reloadTemplates);

        $scope.$watch('templates', function () {
            if ($scope.templates && $scope.templates.length) {
                // trigger filterQuicktexts to update filtered templates
                filterQuicktexts();
            }
        });


        /* Init modal and other dom manipulation
         * when the templates have loaded
         */
        var initDom = function () {

            /* New/Edit modal
             */
            $formModal = $('.quicktext-modal');

            $formModal.modal({
                show: false
            });

            $formModal.on('hide.bs.modal', function (e) {
                $timeout(function () {
                    $location.search('id', null);
                });
            });

            $formModal.on('shown.bs.modal', function () {
                $('#qt-title').focus();
            });

            // Share modal
            $shareModal = $('#quicktext-share-modal');

            $scope.shareQuicktexts = function (quicktexts) {
                // Only edit permission for now - meaning that
                QuicktextSharingService.create(quicktexts, $scope.shareData, 'edit').then(function () {
                    $scope.reloadSharing(quicktexts);
                    $scope.shareData.emails = "";
                    $scope.shareModalSelectizeField[0].selectize.clear();
                    $scope.templateModalSelectizeField[0].selectize.clear();
                    $rootScope.SyncNow();
                });
            };

            $scope.shareQuicktextsWithEveryone = function(quicktexts) {
                $scope.shareData.emails = "";
                var i = 0;
                $scope.shareData.members.forEach(function (member) {
                    if (member.active) {
                        if (i != 0) {
                            $scope.shareData.emails += ',';
                        }
                        $scope.shareData.emails += member.email;
                        i++;
                    }
                });
                $scope.shareQuicktexts(quicktexts);
            }

            $scope.revokeAccess = function (quicktexts, target_user_id) {
                QuicktextSharingService.delete(quicktexts, target_user_id).then(function () {
                    $scope.reloadSharing(quicktexts);
                });
            };

            $scope.reloadSharing = function (quicktexts) {
                QuicktextSharingService.list(quicktexts).then(function (result) {
                    // Show a user only once
                    var acl = [];
                    var userIds = []; // Show each user only once

                    _.each(result, function (row) {
                        if (!_.contains(userIds, row.target_user_id)) {
                            userIds.push(row.target_user_id);
                            acl.push(row);
                        }
                    });

                    $scope.shareData.acl = acl;
                });
            };

            $scope.showShareModalListener = function () {
                $scope.reloadSharing($scope.selectedQuicktexts);
                $scope.showShareModal($scope.selectedQuicktexts);
            };

            $scope.showShareModal = function (quicktexts) {
                var deferred = $q.defer();

                MemberService.members().then(function (data) {
                    $scope.shareData.members = data.members;

                    var options = [];

                    _.each(data.members, function (member) {
                        if (member.active) {
                            options.push({
                                'user_id': member.user_id,
                                'email': member.email,
                                'name': member.name
                            });
                        }
                    });

                    var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
                        '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

                    var selectize_data = {
                        persist: false,
                        maxItems: null,
                        valueField: 'email',
                        labelField: 'name',
                        searchField: ['name', 'email'],
                        options: options,
                        render: {
                            item: function (item, escape) {
                                return '<div>' +
                                    (item.name ? '<strong class="name">' + escape(item.name) + '</strong> ' : '') +
                                    (item.email ? '<span class="email">' + escape(item.email) + '</span>' : '') +
                                    '</div>';
                            },
                            option: function (item, escape) {
                                var label = item.name || item.email;
                                var caption = item.name ? item.email : null;
                                return '<div>' +
                                    '<span class="label">' + escape(label) + '</span>' +
                                    (caption ? '<span class="caption">' + escape(caption) + '</span>' : '') +
                                    '</div>';
                            }
                        },
                        createFilter: function (input) {
                            var match, regex;

                            // email@address.com
                            regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                            match = input.match(regex);
                            if (match) return !this.options.hasOwnProperty(match[0]);

                            // name <email@address.com>
                            regex = new RegExp('^([^<]*)<' + REGEX_EMAIL + '>$', 'i');
                            match = input.match(regex);
                            if (match) return !this.options.hasOwnProperty(match[2]);

                            return false;
                        },
                        create: function (input) {
                            if ((new RegExp('^' + REGEX_EMAIL + '$', 'i')).test(input)) {
                                return {email: input};
                            }
                            var match = input.match(new RegExp('^([^<]*)<' + REGEX_EMAIL + '\\>$', 'i'));
                            if (match) {
                                return {
                                    email: match[2],
                                    name: $.trim(match[1])
                                };
                            }
                            alert('Invalid email address.');
                            return false;
                        }
                    };

                    $scope.shareModalSelectizeField = $('#qt-invite-people').selectize(selectize_data);
                    $scope.templateModalSelectizeField = $('#template-qt-invite-people').selectize(selectize_data);
                    deferred.resolve();
                });

                return deferred.promise;
            };

            $shareModal.on('shown.bs.modal', $scope.showShareModalListener);
        };

        $rootScope.$on('$includeContentLoaded', initDom);


        $scope.showHTMLSource = false;
        $scope.toggleHTMLSource = function () {
            $scope.showHTMLSource = !$scope.showHTMLSource;
            if ($scope.showHTMLSource) {
                editor.setText(editor.getHTML());
            } else {
                editor.setHTML(editor.getText());
            }
        };

        // Delete a quicktext. This operation should first delete from the localStorage
        // then it should imedially go to the service and delete on the server
        $scope.deleteQt = function (quicktext) {
            if (quicktext) {
                r = confirm("Are you sure you want to delete '" + quicktext.title + "' template?");
                if (r === true) {
                    TemplateService.delete(quicktext).then(function () {
                        $scope.reloadTemplates();
                    });
                }
            }
        };

        // Delete a list of selected quicktexts.
        $scope.deleteQts = function() {
            if ($scope.selectedQuicktexts.length > 0) {
                if ($scope.selectedQuicktexts.length > 1) {
                    r = confirm("Are you sure you want to delete " + $scope.selectedQuicktexts.length + " templates?");
                } else {
                    r = confirm("Are you sure you want to delete '" + $scope.selectedQuicktexts[0].title + "' template?");
                }

                if (r === true) {
                    for (var qt in $scope.selectedQuicktexts) {
                        TemplateService.delete($scope.selectedQuicktexts[qt]);
                        $scope.templates.splice($scope.templates.indexOf($scope.selectedQuicktexts), 1);
                    }
                    $scope.reloadTemplates();

                    $scope.selectedAll = false;
                }
            }
        };

        $scope.toggleSelectAll = function (state) {
            if (state != undefined) {
                $scope.selectedAll = state;
            }
            if ($scope.templates.length > 0) {
                _.each($scope.filteredTemplates, function (qt) {
                    qt.selected = $scope.selectedAll;
                });
                $scope.selectedQuicktexts = $scope.selectedAll ? angular.copy($scope.filteredTemplates) : [];
            } else {
                $scope.selectedAll = false;
            }
        };

        $scope.getSelectedQuicktexts = function() {
            var qt_ids = [];
            for (var qt in $scope.selectedQuicktexts) {
              qt_ids.push($scope.selectedQuicktexts[qt].id);
            }
            return qt_ids;
        };

        $scope.updateSelectedQuicktexts = function(quicktext, checked) {
            if (!checked) {
                for (var qt in $scope.selectedQuicktexts) {
                    if ($scope.selectedQuicktexts[qt].id == quicktext.id) {
                        $scope.selectedQuicktexts.splice(qt, 1);
                    }
                }
            } else {
                $scope.selectedQuicktexts.push(quicktext);
            }
        };

        // apply filters to the list of quicktexts
        var filterQuicktexts = function () {
            // apply the text search filter
            $scope.filteredTemplates = $filter('filter')($scope.templates, $scope.searchText);
            // apply the tag search filter
            $scope.filteredTemplates = $filter('tagFilter')($scope.filteredTemplates, FilterTagService.filterTags);

            $scope.focusIndex = 0;

            if ($scope.filteredTemplates.length < $scope.limitTemplates) {
                $('.load-more').hide();
                $scope.limitTemplates = 42;
            } else {
                $('.load-more').show();
            }
        };

        $scope.$on('toggledFilterTag', function () {
            switch(properties.list) {
                case 'shared':
                    $scope.title = "Shared templates";
                    break;
                case 'private':
                    $scope.title = "Private templates";
                    break;
                case 'tag':
                    $scope.title = "<i class='fa fa-hashtag'/>" + FilterTagService.filterTags[0] + " templates";
                    break;
                default:
                    $scope.title = "All templates";
                    break;
            }

            filterQuicktexts();
        });

        $scope.loadMore = function () {
            $scope.limitTemplates += 42;
            if ($scope.limitTemplates > $scope.filteredTemplates.length) {
                $(".load-more").hide();
                $scope.limitTemplates = 42;
            }
        };

        $scope.$watch('searchText', filterQuicktexts);
    });
