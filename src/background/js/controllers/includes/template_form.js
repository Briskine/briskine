gApp.controller('TemplateFormCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams, $location, $timeout, $filter,
              AccountService, TemplateService, SettingsService) {

        var editor;
        var self = this;
        self.sharing_setting = "Private";

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
                        self.selectedTemplate.body = editor.getHTML();
                    });
                } else {
                    editor = null;
                }
            });
        };

        self.insertVar = function (variable) {
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

        self.fillUpSelectizeField = function() {
            var acl = $scope.shareData.acl;

            var members = [];

            $scope.shareData.members.forEach(function (member) {
                if (member.active) {
                    members.push(member);
                }
            });

            if (acl.length == members.length + 1) {
                self.sharing_setting = "Share with everyone";
            } else if (acl.length > 1) {
                self.sharing_setting = "Share with...";
            } else {
                self.sharing_setting = "Private";
            }

            var selectize = $scope.templateModalSelectizeField[0].selectize;
            selectize.clear();

            acl.forEach(function (acl){
                if (acl.permission != "owner") {
                    selectize.addItem(acl.email);
                }
            });
        };

        // Show the form for adding a new quicktext or creating one; id is the id of the quicktext or "new"
        self.showForm = function (id) {
            var initForm = function() {
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
                        self.selectedTemplate = angular.copy(defaults);
                        self.selectedTemplate.body = $routeParams.body || '';
                        if (editor) {
                            editor.setHTML(self.selectedTemplate.body);
                        }
                    } else if (id) {
                        // update template
                        TemplateService.get(id).then(function (r) {
                            self.selectedTemplate = angular.copy(r);
                            if (editor) {
                                editor.setHTML(self.selectedTemplate.body);
                            }
                            $.each(self.selectedTemplate.tags.split(','), function (_, tag) {
                                $('#qt-tags')[0].selectize.addItem($.trim(tag));
                            });
                        });
                    }
                });
            };

            if (id == "new") {
                self.selectedTemplate = null;

                if ($scope.account) {
                    $scope.showShareModal([self.selectedTemplate]).then(function () {
                        self.sharing_setting = angular.copy($scope.sharing_setting);
                        initForm();
                    });
                } else {
                    initForm();
                }

            } else {
                TemplateService.get($routeParams.id).then(function(quicktext){
                    self.selectedTemplate = angular.copy(quicktext);

                    if ($scope.account) {
                        $scope.reloadSharing([quicktext]);
                        $scope.showShareModal([self.selectedTemplate]).then(function() {
                            self.fillUpSelectizeField(self.selectedTemplate);
                            initForm();
                        });
                    } else {
                        initForm();
                    }
                });
            }
        };

        // Save a quicktext, perform some checks before
        self.saveQt = function () {
            if (!self.selectedTemplate.title) {
                alert("Please enter a title");
                return false;
            }

            if (!self.selectedTemplate.body) {
                alert("Please enter a body");
                return false;
            }

            if (editor) {
                if ($scope.showHTMLSource) {
                    self.selectedTemplate.body = editor.getText();
                }
            }

            TemplateService.quicktexts().then(function (templates) {
                if (self.selectedTemplate.shortcut) {
                    for (var i in templates) {
                        var qt = templates[i];
                        if (qt.id !== self.selectedTemplate.id && qt.shortcut === self.selectedTemplate.shortcut) {
                            alert("There is another template with the '" + self.selectedTemplate.shortcut + "' keyboard shortcut");
                            return false;
                        }
                    }
                }

                var post_update = function() {
                    if (self.sharing_setting == 'Share with...') {
                        var old_emails = [];

                        for (i in $scope.shareData.acl){
                            if ($scope.shareData.acl[i].permission != 'owner') {
                                old_emails.push({
                                    'email' : $scope.shareData.acl[i].email,
                                    'target_user_id': $scope.shareData.acl[i].target_user_id
                                });
                            }
                        }

                        var new_emails = $scope.shareData.emails.split(',');

                        old_emails.forEach(function(acl){
                            if (new_emails.indexOf(acl.email) == -1){
                                $scope.revokeAccess([self.selectedTemplate], acl.target_user_id)
                            }
                        });

                        $scope.shareQuicktexts([self.selectedTemplate]);
                    } else if (self.sharing_setting == 'Private') {
                        self.revokeAllAccess([self.selectedTemplate]);
                    } else if (self.sharing_setting == 'Share with everyone') {
                        $scope.shareQuicktextsWithEveryone([self.selectedTemplate]);
                    }
                };

                if (self.selectedTemplate.id) {
                    TemplateService.update(self.selectedTemplate).then(function () {
                        post_update();
                    });
                } else {
                    TemplateService.create(self.selectedTemplate).then(function () {
                        post_update();
                    });
                }

                // hide the modal
                $('.modal').modal('hide');
            });

            $scope.selectedAll = false;
        };

        // Duplicate a quicktext, perform some checks before
        self.duplicateQt = function () {
            if (!self.selectedTemplate.title) {
                alert("Please enter a title");
                return false;
            }

            if (!self.selectedTemplate.body) {
                alert("Please enter a body");
                return false;
            }

            // append a (copy) to the title
            var newQt = angular.copy(self.selectedTemplate);
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
                    //$scope.reloadTemplates();
                    //setTimeout(self.showForm(id), 500);
                }
            });
        };

        self.revokeAllAccess = function(quicktexts) {
            $scope.shareData.acl.forEach(function(acl){
                if (acl.permission != 'owner') {
                    $scope.revokeAccess(quicktexts, acl.target_user_id);
                }
            });
            $rootScope.SyncNow();
        }

        /* Check search params to see if adding or editing items */
        var checkRoute = function () {
            // if not the default list
            // new or edit, so show the modal
            if ($routeParams.id) {
                self.showForm($routeParams.id);
            }
        };

        $scope.$on('$routeUpdate', checkRoute);
    });
