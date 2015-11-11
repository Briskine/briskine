gApp.controller('ListCtrl',
    function ($scope, $rootScope, $routeParams, $location, $timeout, $filter, TemplateService, SettingsService) {

        var $formModal;
        var editor;

        $scope.filteredTemplates = [];
        $scope.templates = [];
        $scope.tags = [];
        $scope.filterTags = [];
        $scope.limitTemplates = 42; // I know.. it's a cliche
        $scope.showInstallHint = false;

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
            });

            TemplateService.allTags().then(function (r) {
                $scope.tags = r;
            });
        };
        $scope.reloadTemplates();

        $scope.$watch('templates', function () {
            if ($scope.templates && $scope.templates.length) {
                // trigger filterQuicktexts to update filtered templates
                filterQuicktexts();
            }
        });

        // Listen on syncing events
        $scope.$on("templates-sync", function () {
            $scope.reloadTemplates();
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

            if ($scope.settings.editor.enabled) {
                // Initialize editor
                editor = new Quill('.editor-wrapper .editor', {
                    modules: {
                        'toolbar': {container: '.editor-wrapper .toolbar'},
                        'link-tooltip': true
                    },
                    theme: 'snow'
                });
                editor.addModule('image-tooltip', {
                    template: '<input class="input" type="textbox">' +
                    '<div class="preview">' +
                    '<span>Preview</span> </div> ' +
                    '<a href="javascript:;" class="insert btn btn-primary">Insert</a>' +
                    '<a href="javascript:;" class="cancel btn btn-default">Cancel</a>'
                });

                editor.on('text-change', function (delta, source) {
                    if (source === 'user') {
                        $scope.selectedTemplate.body = editor.getHTML();
                    }
                });
            } else {
                editor = null;
            }
            checkRoute();
        };

        /* Check search params to see if adding or editing items
         */
        var checkRoute = function () {
            // if not the default list
            // new or edit, so show the modal
            if ($routeParams.id) {
                $scope.showForm();
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
                });
            }
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

                // hide teh modal
                $('.modal').modal('hide');
            });
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
        $scope.deleteQt = function () {
            if (this.quicktext) {
                r = confirm("Are you sure you want to delete '" + this.quicktext.title + "' template?");
                if (r === true) {
                    TemplateService.delete(this.quicktext).then(function () {
                        $scope.reloadTemplates();
                    });
                }
            }
        };

        $scope.toggleFilterTag = function () {
            var index = $scope.filterTags.indexOf(this.tag);
            if (index === -1) {
                $scope.filterTags.push(this.tag);
            } else {
                $scope.filterTags.splice(index, 1); // remove from tags
            }
        };

        // apply filters to the list of quicktexts
        var filterQuicktexts = function () {
            // apply the text search filter
            $scope.filteredTemplates = $filter('filter')($scope.templates, $scope.searchText);
            // apply the tag serach filter
            $scope.filteredTemplates = $filter('tagFilter')($scope.filteredTemplates, $scope.filterTags);

            $scope.focusIndex = 0;

            if ($scope.filteredTemplates.length < $scope.limitTemplates) {
                $('.load-more').hide();
                $scope.limitTemplates = 42;
            } else {
                $('.load-more').show();
            }
        };

        $scope.loadMore = function () {
            $scope.limitTemplates += 42;
            if ($scope.limitTemplates > $scope.filteredTemplates.length) {
                $(".load-more").hide();
                $scope.limitTemplates = 42;
            }
        };

        $scope.$watch('searchText', filterQuicktexts);
        $scope.$watch('filterTags', filterQuicktexts, true);
    });
