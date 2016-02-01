gApp.controller('ListCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams, $location, $timeout, $filter,
              AccountService, TemplateService, SettingsService, FilterTagService, QuicktextSharingService,
              MemberService) {

        var $formModal;
        var $shareModal;
        var editor;

        var properties = $route.current.locals.properties;

        $scope.title = "All templates";

        switch(properties.list) {
            case 'shared':
                $scope.title = "Shared templates";
                break
            case 'private':
                $scope.title = "Private templates";
                break
        }

        $scope.shareData = {
            sharing: {},
            members: [],
            emails: [],
            message: ""
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
                if (properties.list == 'all') { return true;}
                else if (properties.list == 'private') { return template.user.id == $scope.account.id; }
                else if (properties.list == 'shared') { return template.user.id != $scope.account.id; }
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
                    $location.path('/list').search({});
                });
            });

            $formModal.on('shown.bs.modal', function () {
                $('#qt-title').focus();
            });

            // Share modal
            $shareModal = $('#quicktext-share-modal');

            $scope.shareQuicktexts = function () {
                // Only edit permission for now - meaning that
                QuicktextSharingService.create($scope.selectedQuicktexts, $scope.shareData, 'edit').then(function () {
                    $scope.reloadSharing();
                    $scope.shareData.emails = "";
                    $scope.selectizeField[0].selectize.clear();
                });
            };

            $scope.revokeAccess = function () {
                QuicktextSharingService.delete($scope.selectedQuicktexts, this.share.target_user_id).then(function () {
                    $scope.reloadSharing();
                });
            };

            $scope.reloadSharing = function () {
                QuicktextSharingService.list($scope.selectedQuicktexts).then(function (result) {
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

            var showShareModal = function () {
                $scope.reloadSharing();

                MemberService.members().then(function (data) {
                    $scope.shareData.members = data.members;

                    var options = [];

                    _.each(data.members, function (member) {
                        if (!member.active) {
                            return;
                        }

                        options.push({
                            'user_id': member.user_id,
                            'email': member.email,
                            'name': member.name
                        });
                    });

                    var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
                        '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

                    $scope.selectizeField = $('#qt-invite-people').selectize({
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
                    });
                });
            };

            $shareModal.on('shown.bs.modal', showShareModal);

            checkRoute();
        };

        var loadEditor = function () {

            $scope.showHTMLSource = false;
            if (editor) { //already loaded
                return;
            }

            SettingsService.get('settings').then(function (settings) {
                if (settings.editor && settings.editor.enabled) {


                    // Initialize editor
                    editor = new Quill('.editor-wrapper .editor', {
                        modules: {
                            'toolbar': {container: '.editor-wrapper .toolbar'},
                            'link-tooltip': true
                        },
                        theme: 'snow'
                    });
                    editor.addModule('image-tooltip', {
                        template: '<input class="input" type="textbox" />' +
                        '<div class="preview">' +
                        '<span>Preview</span> </div> ' +
                        '<a href="javascript:;" class="insert btn btn-primary">Insert</a>' +
                        '<a href="javascript:;" class="cancel btn btn-default">Cancel</a>'
                    });

                    editor.on('text-change', function (delta, source) {
                        $scope.selectedTemplate.body = editor.getHTML();
                    });
                } else {
                    editor = null;
                }
            });
        };

        /* Check search params to see if adding or editing items
         */
        var checkRoute = function () {
            // if not the default list
            // new or edit, so show the modal
            if ($routeParams.id) {
                $scope.showForm();
            } else if ($routeParams.action) {
                $scope.showShareForm();
            }
        };

        $scope.$on('$routeUpdate', checkRoute);
        $rootScope.$on('$includeContentLoaded', initDom);

        // Show the form for adding a new quicktext or creating one
        $scope.showForm = function (id) {
            // Where did we open the dialog from.
            var source = $routeParams.src ? $routeParams.src : "background";
            mixpanel.track("Show edit form", {
                source: source
            });

            loadEditor();

            var selectize = $('#qt-tags')[0].selectize;
            if (selectize) {
                selectize.clear();
            }

            TemplateService.allTags().then(function (tags) {
                var tagOptions = [];
                var tagNames = Object.keys(tags);
                for (var t in tagNames) {
                    if (tagNames.hasOwnProperty(t)) {
                        tagOptions.push({
                            text: tagNames[t],
                            value: tagNames[t]
                        });
                    }
                }

                $('#qt-tags').selectize({
                    plugins: ['remove_button'],
                    delimiter: ',',
                    create: true,
                    persist: true,
                    options: tagOptions,
                    render: {
                        item: function (item, escape) {
                            return '<span class="tag item"><i class="fa fa-hashtag"></i>' + escape(item.text) + '</span>';
                        }
                    }
                });
                var defaults = {
                    'id': '',
                    'remote_id': '',
                    'subject': '',
                    'shortcut': '',
                    'title': '',
                    'tags': '',
                    'body': ''
                };

                id = id ? id : $routeParams.id;

                if (id === 'new') {
                    // new template
                    $scope.selectedTemplate = angular.copy(defaults);
                    $scope.selectedTemplate.body = $routeParams.body || '';
                    if (editor) {
                        editor.setHTML($scope.selectedTemplate.body);
                    }
                } else if (id) {
                    // update template
                    TemplateService.get(id).then(function (r) {
                        $scope.selectedTemplate = angular.copy(r);
                        if (editor) {
                            editor.setHTML($scope.selectedTemplate.body);
                        }
                        $.each($scope.selectedTemplate.tags.split(','), function (_, tag) {
                            $('#qt-tags')[0].selectize.addItem($.trim(tag));
                        });
                    });
                }
            });

            $formModal.modal('show');
        };

        $scope.showHTMLSource = false;
        $scope.toggleHTMLSource = function () {
            $scope.showHTMLSource = !$scope.showHTMLSource;
            if ($scope.showHTMLSource) {
                editor.setText(editor.getHTML());
            } else {
                editor.setHTML(editor.getText());
            }
        };

        $scope.insertVar = function (variable) {
            if (editor) {
                editor.focus();
                var range = editor.getSelection();
                if (range) {
                    editor.insertText(range.start, '{{' + variable + '}}');

                }
            } else {
                var body = $('#qt-body');
                var start = body[0].selectionStart;
                var end = body[0].selectionEnd;

                var val = body.val();

                var startVal = val.slice(0, start);
                var endVal = val.slice(end);

                var newPos = (startVal + "{{" + variable + "}}").length;
                var newVal = startVal + "{{" + variable + "}}" + endVal;

                body.val(newVal);
                body[0].setSelectionRange(newPos, newPos);
                body.focus();
            }
        };

        // Save a quicktext, perform some checks before
        $scope.saveQt = function () {
            if (!$scope.selectedTemplate.title) {
                alert("Please enter a title");
                return false;
            }

            if (!$scope.selectedTemplate.body) {
                alert("Please enter a body");
                return false;
            }

            if (editor) {
                if ($scope.showHTMLSource) {
                    $scope.selectedTemplate.body = editor.getText();
                }
            }

            TemplateService.quicktexts().then(function (templates) {
                if ($scope.selectedTemplate.shortcut) {
                    for (var i in templates) {
                        var qt = templates[i];
                        if (qt.id !== $scope.selectedTemplate.id && qt.shortcut === $scope.selectedTemplate.shortcut) {
                            alert("There is another template with the '" + $scope.selectedTemplate.shortcut + "' keyboard shortcut");
                            return false;
                        }
                    }
                }
                if ($scope.selectedTemplate.id) {
                    TemplateService.update($scope.selectedTemplate).then(function () {
                        $scope.reloadTemplates();
                    });
                } else {
                    TemplateService.create($scope.selectedTemplate).then(function () {
                        $scope.reloadTemplates();
                    });
                }

                // hide the modal
                $('.modal').modal('hide');
            });

            $scope.selectedAll = false;
        };

        // Save a quicktext, perform some checks before
        $scope.duplicateQt = function () {
            if (!$scope.selectedTemplate.title) {
                alert("Please enter a title");
                return false;
            }

            if (!$scope.selectedTemplate.body) {
                alert("Please enter a body");
                return false;
            }

            // append a (copy) to the title
            var newQt = angular.copy($scope.selectedTemplate);
            newQt.title = newQt.title + " (copy)";
            if (newQt.shortcut) {
                newQt.shortcut = newQt.shortcut + "-copy";
            }
            $('.modal').on('hidden.bs.modal', function () {
                $('#duplicate-alert-box').addClass('hide');
            });

            TemplateService.create(newQt).then(function (id) {
                if (typeof id !== 'undefined') {
                    $('#duplicate-alert-box').removeClass('hide');
                    $scope.reloadTemplates();
                    $scope.showForm(id);
                }
            });
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
            if (FilterTagService.filterTags.length > 0) {
                $scope.title = "<i class='fa fa-hashtag'/>" + FilterTagService.filterTags[0] + " templates";
            } else {
                $scope.title = "All templates";
            }
            filterQuicktexts();
        });

        $rootScope.$broadcast('toggledFilterTag');

        $scope.loadMore = function () {
            $scope.limitTemplates += 42;
            if ($scope.limitTemplates > $scope.filteredTemplates.length) {
                $(".load-more").hide();
                $scope.limitTemplates = 42;
            }
        };

        $scope.$watch('searchText', filterQuicktexts);
    });
