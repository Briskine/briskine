gApp.controller('TemplateFormCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams, $location, $timeout, $filter,
              AccountService, TemplateService, SettingsService, FilterTagService) {

        var editor;
        var self = this;
        self.sharing_setting = "private";
        self.send_email = 'false';
        self.extended = false;
        self.showHTMLSource = false;
        self.fileLinks = [];
        //************************Upload file parts*******************
        //bucketName
        var bucketName = window.bucketName || 'mybucket';
        //select the editor body content
        var dropzone = angular.element(document.querySelector('div.editor-wrapper .editor'));

        //attach drag event on editor body content
        dropzone.bind("dragover dragenter", function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            return false;
        });
        //on drop event read data file as url
        dropzone.bind("drop", function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            self.fileloading = true;
            $rootScope.$broadcast('reload'); //TODO find the proper way to update page state;
            //for now accept only one file on drop event
            var file = evt.originalEvent.dataTransfer.files[0];
            self.sendFile(file);
        });
        self.sendFile = function (file) {
          //AccessToken are variables fetching from server and regenerated every hours https://developers.google.com/identity/protocols/OAuth2ServiceAccount#authorizingrequests
          //for now we use unfunctional token just for developpment.
          //TODO make a server request to get the token if !token
          AccessToken = window.AccessToken || {
            access_token : "1/8xbJqaOZXSUZbHLl5EOtu1pxz3fmmetKx9W8CV4t79M", //random unfunctional accesstoken
            token_type : "Bearer",
            expires_in : 3600
          };
          var xhr = new XMLHttpRequest();
          var jsonApiUrl = 'https://www.googleapis.com/upload/storage/v1/b/'+ bucketName + '/o?uploadType=media&name='+ file.name;
          xhr.open('post', jsonApiUrl, true);
          //set authorization header filed with accessToken loaded from server.
          xhr.setRequestHeader("authorization", AccessToken.token_type + ' ' + AccessToken.access_token);
          xhr.send(file);
          xhr.onloadend = function (e) {
            // handle error case and success case here.
            self.fileloading = false;
            if(e.currentTarget.status === '200') {
              file = e.currentTarget.response;
            } else {
              //the request was unsuccessful, generate a link anyway for developpment purpose
              file = {
                name: file.name,
                size: file.size,
                mediaLink: 'https://www.smashingmagazine.com/images/404-errors-reloaded/10.jpg'
              }
            }
            if(!self.selectedTemplate.files) self.selectedTemplate.files = [];
            self.selectedTemplate.files.push(file);
            console.log(self.selectedTemplate);
            TemplateService.update(self.selectedTemplate);
            //$rootScope.$broadcast('reload');
          }
        }
        $scope.onfileSubmit = function (e) {
          console.log(e);
        }
        //remove an attached file
        self.removeAttachment = function(index) {
          self.selectedTemplate.files.splice(index, 1);
          $rootScope.$broadcast('reload');
        }
        //****************END of Upload File Part ********************************************
        var loadEditor = function () {
            self.showHTMLSource = false;
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



        self.toggleHTMLSource = function () {
            self.showHTMLSource = !self.showHTMLSource;
            if (self.showHTMLSource) {
                editor.setText(editor.getHTML());
            } else {
                editor.setHTML(editor.getText());
            }
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
            var members = $scope.shareData.members;

            if (acl.length >= members.length + 1) {
                self.sharing_setting = "everyone";
            } else if (acl.length > 1) {
                self.sharing_setting = "specific";
            } else {
                self.sharing_setting = "private";
            }

            var selectize = $scope.templateModalSelectizeField[0].selectize;
            selectize.clear();

            acl.forEach(function (acl){
                if (acl.target_user_id != $scope.account.id) {
                    selectize.addItem(acl.email);
                }
            });
        };

        // Show the form for adding a new quicktext or creating one; id is the id of the quicktext or "new"
        self.showForm = function (id) {
            var initForm = function() {
                // Where did we open the dialog from.
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

                            if ($scope.location == '/list/tag') {
                                $('#qt-tags')[0].selectize.addItem($.trim(FilterTagService.filterTags[0]));
                            }
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

                self.extended = false;
                $('#template-form-modal').modal('show');
            };

            if (id == "new") {
                self.selectedTemplate = null;

                if ($scope.account) {
                    $scope.initializeMemberSelectize([self.selectedTemplate]).then(function () {
                        self.sharing_setting = angular.copy($scope.sharing_setting);
                        initForm();
                    });
                } else {
                    initForm();
                }

            } else {
                TemplateService.get($routeParams.id).then(function(quicktext){
                    self.selectedTemplate = angular.copy(quicktext);
                    if ($scope.account && quicktext.nosync == 0) {
                        $q.all([$scope.reloadSharing([self.selectedTemplate]), $scope.initializeMemberSelectize([self.selectedTemplate])]).then(function() {
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
        // TODO rewrite this function to accept an attachment as well
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
                if (self.showHTMLSource) {
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
                //post_update is actually for sharing quickText with contributors.
                var post_update = function () {
                    if (self.sharing_setting == 'specific') {
                        var old_emails = [];

                        for (i in $scope.shareData.acl) {
                            if ($scope.shareData.acl[i].permission != 'owner') {
                                old_emails.push({
                                    'email': $scope.shareData.acl[i].email,
                                    'target_user_id': $scope.shareData.acl[i].target_user_id
                                });
                            }
                        }

                        var new_emails = $scope.shareData.emails.split(',');

                        old_emails.forEach(function (acl) {
                            if (new_emails.indexOf(acl.email) == -1 && $scope.account.email != acl.email) {
                                $scope.revokeAccess([self.selectedTemplate], acl.target_user_id)
                            }
                        });

                        $scope.shareQuicktexts([self.selectedTemplate], self.send_email);
                    } else if (self.sharing_setting == 'private') {
                        self.revokeAllAccess([self.selectedTemplate]);
                    } else if (self.sharing_setting == 'everyone') {
                        $scope.shareQuicktextsWithEveryone([self.selectedTemplate], self.send_email);
                    }
                };

                if (self.selectedTemplate.id) {
                    TemplateService.update(self.selectedTemplate, !$scope.account).then(function () {
                        if ($scope.account) {
                            post_update();
                        } else {
                            $scope.reloadTemplates();
                        }
                    });
                } else {
                    TemplateService.create(self.selectedTemplate, !$scope.account, self.sharing_setting === 'private').then(function (t) {
                        if ($scope.account) {
                            post_update();
                        } else {
                            $scope.reloadTemplates();
                        }
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
        };

        self.upgradeNow = function() {
            $rootScope.trackSignup('templateForm');
            $('#template-form-modal').modal('hide');
            $timeout(function() {
                $('#signup-modal').modal('show')
            }, 500);
        };

        /* Check search params to see if adding or editing items */
        var checkRoute = function () {
            // if not the default list
            // new or edit, so show the modal
            if ($routeParams.id) {
                self.showForm($routeParams.id);
            }
        };

        $scope.$on('$routeUpdate', checkRoute);
        checkRoute();
    });
