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
                    if (typeof tag === 'undefined') {
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

        $scope.filteredTemplates = [];
        $scope.templates = [];
        $scope.filterTags = FilterTagService.filterTags;
        $scope.properties = properties;
        $scope.limitTemplates = 42; // I know.. it's a cliche
        $scope.showSubscribeHint = false;
        $scope.hasSelected = false;
        $scope.searchOptions = {};
        $scope.gmailLink = 'https://mail.google.com/mail/?view=cm&fs=1&to=someone@example.com&su=I%20love%20Gorgias!&body=Hey!%0A%0ACheck%20out%20this%20awesome%20Chrome%20extension%20that%20I%20found%3A%0A%0Ahttps%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Fgorgias-templates-email-t%2Flmcngpkjkplipamgflhioabnhnopeabf%0A%0AIt%20helps%20me%20type%20much%20faster%20with%20templates%20on%20the%20web!'

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

        // Hide Subject and Tags fields by default
        $scope.settings = {};
        SettingsService.get('settings').then(function (settings) {
            $scope.settings = settings;
            $scope.subjectEnabled = settings.fields.subject;
            $scope.tagsEnabled = settings.fields.tags;

            // Setup search
            if (settings.qaBtn.fuzzySearch === false) {
                $scope.searchOptions.threshold = 0
            }
            $scope.searchOptions.caseSensitive = !!settings.qaBtn.caseSensitiveSearch
        });

        $scope.showPostInstall = function () {
            SettingsService.get('hints').then(function (hints) {
                if (hints) {
                    $scope.hints = hints;
                    // show the post install modal only if we're not just after tutorial (there will be 2 modals open)
                    if (hints.postInstall && $routeParams.id !== 'new' && $routeParams.src !== 'tutorial') {
                        $('#post-install-modal').modal('show');
                    }
                    if (hints.subscribeHint && $scope.templates.length > 7) {
                        SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
                            if (!isLoggedIn) {
                                $scope.showSubscribeHint = true;
                            }
                        });
                    }
                }
            });
        };

        $scope.closeHint = function (hintType) {
            SettingsService.get('hints').then(function (hints) {
                $scope.hints[hintType] = false;
                hints[hintType] = false;
                SettingsService.set('hints', hints);
            });
            return true;
        };

        $scope.toggleField = function (field, enabled) {
            SettingsService.get('settings').then(function (settings) {
                settings.fields[field] = enabled;
                SettingsService.set('settings', settings);
            });
        };

        $scope.reloadTemplates = function () {
            TemplateService.quicktexts().then(function (r) {
                $scope.templates = r;
                $scope.filterTemplates();
                $rootScope.$broadcast('reload')
            });
        };

        $scope.reloadTemplates();

        // Listen on syncing events
        $scope.$on("templates-sync", function () {
            $scope.reloadTemplates();
            loadAccount();
        });

        // need to use a separate map for the selected state,
        // instead of quicktext.select,
        // so sync doesn't uncheck templates on refresh.
        $scope.selectedQuickTexts = {}
        var getSelectedQuickTexts = function () {
            return $scope.filteredTemplates.filter(function (qt) {
                return $scope.selectedQuickTexts[qt.id] === true
            })
        }

        // make getSelectedQuickTexts public,
        // so we can use it in other places (eg. ShareFormCtrl)
        $scope.getSelectedQuickTexts = getSelectedQuickTexts

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
                    store.syncNow();
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

                $q.all([$scope.reloadSharing(getSelectedQuickTexts()),
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
                        $scope.reloadTemplates();
                        $scope.checkHasSelected();
                    });
                    $scope.reloadTemplates();
                }
            }
        };

        // Delete a list of selected quicktexts.
        $scope.deleteQts = function () {
            var selectedTemplates = getSelectedQuickTexts();
            if (selectedTemplates.length > 0) {
                if (selectedTemplates.length > 1) {
                    r = confirm("Are you sure you want to delete " + selectedTemplates.length + " templates?");
                } else {
                    r = confirm("Are you sure you want to delete '" + selectedTemplates[0].title + "' template?");
                }

                if (r === true) {
                    for (var qt in selectedTemplates) {
                        TemplateService.delete(selectedTemplates[qt]);
                        $scope.templates.splice($scope.templates.indexOf(selectedTemplates), 1);
                    }
                    $scope.reloadTemplates();
                    removeSelected();
                }
            }
        };

        // Check if any template is selected
        $scope.checkHasSelected = function () {
            $scope.hasSelected = !!getSelectedQuickTexts().length;
        };

        // Uncheck all selected templates
        var removeSelected = function () {
            $scope.selectedQuickTexts = {};
            $scope.hasSelected = false;
        };

        // Clear all checkboxes when input changes
        $scope.clearSelectedTemplates = function () {
            removeSelected();
            $scope.selectedAll = false;
            $scope.hasSelected = false;
        };

        // Check/Uncheck all checkboxes
        $scope.toggleSelectAll = function () {
            removeSelected();
            if ($scope.selectedAll) {
                _.each($scope.filteredTemplates, function (qt) {
                    $scope.selectedQuickTexts[qt.id] = true;
                });
            }
            $scope.checkHasSelected();
        };

        $scope.$on('toggledFilterTag', function () {
            tag = FilterTagService.filterTags[0];
            $scope.selectedAll = false;

            if (tag != undefined) {
                $scope.title = "<i class='fa fa-hashtag'/>" + tag + " templates";
            }
            $scope.filterTemplates();
        });

        $scope.loadMore = function () {
            $scope.limitTemplates += 42;
        };

        $scope.filterTemplates = _.throttle(function () {
            // tags
            var matchedTemplates = $filter('tagFilter')($scope.templates, $scope.filterTags);

            // sharing filter
            matchedTemplates = $filter('sharingFilter')(matchedTemplates, $scope.properties.list);

            // fuzzy search
            matchedTemplates = $filter('fuzzy')(matchedTemplates, $scope.searchText, $scope.searchOptions);

            $scope.filteredTemplates = matchedTemplates;

            SettingsService.get('settings').then(function (settings) {
                if (settings.is_sort_template_list) {
                  // Sort the filtered templates in alphabetically order
                  $scope.filteredTemplates = $filter('orderBy')($scope.filteredTemplates, 'title')
                }
            });
        }, 50);

        $scope.exportTemplates = function () {
            var now = new Date();
            var filename = 'gorgias-templates-' + now.toISOString() + '.csv' ;
            var itemsNotFormatted = $scope.templates;
            var itemsFormatted = [];

            // format the data
            itemsNotFormatted.forEach(function(item){
                itemsFormatted.push({
                    id: item.remote_id || '',
                    title: item.title || '',
                    shortcut: item.shortcut || '',
                    subject: item.subject || '',
                    tags: item.tags || '',
                    cc: item.cc || '',
                    bcc: item.bcc || '',
                    to: item.to || '',
                    body: item.body || '',
                });
            });

            var exporter = Export.create({
                filename: filename
            });
            exporter.downloadCsv(itemsFormatted);
        };

        $scope.getTags = function (template) {
            return TemplateService.tags(template);
        };

        $scope.openSubscribe = function () {
            store.openSubscribePopup();
        };
    });
