gApp.controller('ListCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams, $location, $timeout, $filter,
              AccountService, TemplateService, SettingsService, FilterTagService, QuicktextSharingService,
              MemberService) {

        var $formModal;
        var $shareModal;

        var properties = $route.current.locals.properties;

        if ($routeParams.id) {
            if (!$routeParams.src) {
                $location.search('id', null);
            }
        }

        if ($routeParams.action) {
            $location.search('action', null);
        }

        // set the header titles of the list based on the URL
        SettingsService.get('isLoggedIn').then(function (isLoggedIn) {
            switch (properties.list) {
                case 'shared':
                    if (!isLoggedIn) {
                        $location.path("#/list");
                    }
                    $scope.title = "Shared templates";
                    $scope.location = "/list/shared";
                    $scope.sharing_setting = "everyone";
                    break;
                case 'private':
                    if (!isLoggedIn) {
                        $location.path("#/list");
                    }
                    $scope.title = "Private templates";
                    $scope.location = "/list/private";
                    $scope.sharing_setting = "private";
                    break;
                case 'tag':
                    var tag = FilterTagService.filterTags[0];

                    if (tag == undefined) {
                        $location.path('/list');
                    }

                    $scope.title = "<i class='fa fa-hashtag'/>" + FilterTagService.filterTags[0] + " templates";
                    $scope.location = "/list/tag";
                    $scope.sharing_setting = "private";
                    break;
                default:
                    $scope.title = "All templates";
                    $scope.location = "/list";
                    $scope.sharing_setting = "private";
                    break;
            }
        });

        // Store the ACL of all templates
        $scope.shareData = {
            sharing: {},
            members: [],
            emails: "",
            message: "",
            acl: []
        };

        $scope.baseUrl = Settings.defaults.baseURL;

        $scope.filteredTemplates = [];
        $scope.templates = [];
        $scope.selectedQuicktexts = [];
        $scope.filterTags = [];
        $scope.limitTemplates = 42; // I know.. it's a cliche
        $scope.showInstallHint = false;

        function loadAccount() {
            SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
                if (!isLoggedIn) {
                    return;
                }
                AccountService.get().then(function (account) {
                    $scope.account = account;

                    if (($scope.account.info.share_all == "true" && (properties.list == "tag" || properties.list == "all"))
                        || properties.list == "shared") {
                        $scope.sharing_setting = "everyone";
                    } else {
                        $scope.sharing_setting = "private";
                    }
                });
            });
        }

        loadAccount();

        $scope.$on('loggedIn', function () {
            loadAccount();
            $rootScope.SyncNow();
        });

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
            TemplateService.quicktexts().then(function (r) {
                $scope.templates = r;
                $rootScope.$broadcast('reload')
            });
        };

        $scope.reloadTemplates();

        // Listen on syncing events
        $scope.$on("templates-sync", function () {
            $scope.reloadTemplates();
            loadAccount();
        });

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

            $formModal.on('hide.bs.modal', function () {
                $timeout(function () {
                    $location.search('id', null);
                });
            });

            $formModal.on('shown.bs.modal', function () {
                $('#qt-title').focus();
            });

            // Share modal
            $shareModal = $('#quicktext-share-modal');

            $shareModal.on('hide.bs.modal', function () {
                $timeout(function () {
                    $location.search('action', null);
                });
            });

            $scope.shareQuicktexts = function (quicktexts, send_email) {
                // Only edit permission for now - meaning that
                QuicktextSharingService.create(quicktexts, $scope.shareData, 'edit', send_email).then(function () {
                    $scope.reloadSharing(quicktexts);
                    $scope.shareData.emails = "";
                    $scope.shareModalSelectizeField[0].selectize.clear();
                    $scope.templateModalSelectizeField[0].selectize.clear();
                    $rootScope.SyncNow();
                });
            };

            $scope.shareQuicktextsWithEveryone = function (quicktexts, send_email) {
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
                $scope.shareQuicktexts(quicktexts, send_email);
            };

            $scope.revokeAccess = function (quicktexts, target_user_id) {
                QuicktextSharingService.delete(quicktexts, target_user_id).then(function () {
                    $scope.reloadSharing(quicktexts);
                });
            };

            $scope.reloadSharing = function (quicktexts) {
                var deferred = $q.defer();
                if (quicktexts.length != 0) {
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
                        deferred.resolve();
                    });
                }
                else {
                    deferred.resolve();
                }
                return deferred.promise;
            };

            $scope.showShareModalListener = function () {
                var deferred = $q.defer();

                $q.all([$scope.reloadSharing($scope.selectedQuicktexts),
                    $scope.initializeMemberSelectize()]).then(deferred.resolve);
                return deferred.promise;
            };

            $scope.initializeMemberSelectize = function () {
                var deferred = $q.defer();

                MemberService.members().then(function (data) {
                    var members = [];

                    data.members.forEach(function (member) {
                        if (member.active) {
                            members.push(member);
                        }
                    });

                    $scope.shareData.members = members;

                    var options = [];

                    _.each(members, function (member) {
                        options.push({
                            'user_id': member.user_id,
                            'email': member.email,
                            'name': member.name
                        });
                    });

                    var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
                        '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

                    var selectize_data = {
                        plugins: ['remove_button'],
                        persist: false,
                        maxItems: null,
                        valueField: 'email',
                        labelField: 'name',
                        searchField: ['name', 'email'],
                        options: options,
                        render: {
                            item: function (item, escape) {
                                return '<div class="email-selectize-item">' +
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
        };

        $rootScope.$on('$includeContentLoaded', initDom);

        // Delete a quicktext. This operation should first delete from the localStorage
        // then it should imedially go to the service and delete on the server
        $scope.deleteQt = function (quicktext) {
            if (quicktext) {
                r = confirm("Are you sure you want to delete '" + quicktext.title + "' template?");
                if (r === true) {
                    TemplateService.delete(quicktext).then(function () {
                        $scope.updateSelectedQuicktexts(quicktext, false);
                    });
                    $scope.reloadTemplates();
                }
            }
        };

        // Delete a list of selected quicktexts.
        $scope.deleteQts = function () {
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

                    $scope.selectedQuicktexts = [];
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

        var selectAllWatcher = function () {
            if ($scope.templates.length > 0) {
                $scope.selectedAll = $scope.selectedQuicktexts.length == $scope.filteredTemplates.length;
            }
        };

        $scope.getSelectedQuicktexts = function () {
            var qt_ids = [];
            for (var qt in $scope.selectedQuicktexts) {
                qt_ids.push($scope.selectedQuicktexts[qt].id);
            }
            return qt_ids;
        };

        $scope.updateSelectedQuicktexts = function (quicktext, checked) {
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
            // apply the sharing setting filter
            $scope.filteredTemplates = $filter('sharingFilter')($scope.filteredTemplates, properties.list);

            $scope.focusIndex = 0;

            if ($scope.filteredTemplates.length < $scope.limitTemplates) {
                $('.load-more').hide();
                $scope.limitTemplates = 42;
            } else {
                $('.load-more').show();
            }
        };

        $scope.$on('toggledFilterTag', function () {
            tag = FilterTagService.filterTags[0];
            $scope.selectedQuicktexts = [];
            $scope.selectedAll = false;

            if (tag != undefined) {
                $scope.title = "<i class='fa fa-hashtag'/>" + tag + " templates";
                filterQuicktexts();
            }
        });

        $scope.loadMore = function () {
            $scope.limitTemplates += 42;
            if ($scope.limitTemplates > $scope.filteredTemplates.length) {
                $(".load-more").hide();
                $scope.limitTemplates = 42;
            }
        };

        $scope.$watch('searchText', filterQuicktexts);
        $scope.$watch('selectedQuicktexts.length', selectAllWatcher);
    });
