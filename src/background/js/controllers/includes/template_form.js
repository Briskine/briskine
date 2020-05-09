/* globals alert */
import angular from 'angular';
import $ from 'jquery';
import jQuery from 'jquery';
import tinymce from 'tinymce';

import Config from '../../config';
import store from '../../../../store/store-client';

export default function TemplateFormCtrl ($route, $q, $scope, $rootScope, $routeParams, $location, $window, $timeout, $filter,
              AccountService, TemplateService, SettingsService, FilterTagService) {
        'ngInject';

        var self = this;
        self.sharing_setting = "private";
        self.send_email = 'false';
        self.extended = false;
        self.showHTMLSource = false;
        self.isLoggedIn = $rootScope.isLoggedIn;

        // fields that show up under `show more fields`
        var extraFields = [
            'subject',
            'to',
            'cc',
            'bcc'
        ];

        // used by extra fields button,
        // if any extra fields are hidden.
        // shown by default.
        self.extraFields = true;

        // checks if a field has content,
        // and should be visible.
        self.extraFieldContent = function (field) {
            return (typeof field === 'string');
        };

        // check if any extra fields are hidden
        var checkHiddenExtraFields = function () {
            return extraFields.some(function (field) {
                return !self.extraFieldContent(self.selectedTemplate[field]);
            });
        };

        // clean empty extra fields, for backwards compatibility.
        // (eg. quicktexts saved with empty subject)
        var cleanExtraFields = function (qt) {
            extraFields.some(function (field) {
                if (typeof qt[field] === 'string' && qt[field].trim() === '') {
                    delete qt[field];
                }
            });

            return qt;
        };

        self.showExtraFields = function () {
            // add blank content
            extraFields.forEach(function (field) {
                if (!self.extraFieldContent(self.selectedTemplate[field])) {
                    self.selectedTemplate[field] = '';
                }
            });

            self.extraFields = false;
        };

        var loadEditor = function () {

            if (tinymce.activeEditor){
                tinymce.activeEditor.remove();
            }

            self.showHTMLSource = false;
            SettingsService.get('settings').then(function (settings) {
                if (settings.editor && settings.editor.enabled) {
                    tinymce.init({
                        /* replace textarea having class .tinymce with tinymce editor */
                        selector: "textarea.tinymce",
                        menubar:false,
                        statusbar: false,
                        autoresize_bottom_margin : 0,
                        autoresize_min_height: 190,
                        autoresize_on_init: true,
                        forced_root_block : 'div',
                        theme: 'modern',
                        plugins: 'autoresize autolink image link media table advlist lists textcolor code',
                        toolbar: 'formatselect | bold italic underline | forecolor backcolor | link image | table | alignleft aligncenter alignright alignjustify  | numlist bullist outdent indent  | removeformat code | insertVariable',
                        setup: function(editor) {
                            editor.addButton('insertVariable', {
                                type: 'menubutton',
                                text: 'Insert Variable',
                                icon: false,
                                menu: [
                                    { text: 'To: First Name', onclick: function() {self.insertVar('to.first_name');}},
                                    { text: 'To: Email', onclick: function() {self.insertVar('to.email');}},
                                    { text: 'From: First Name', onclick: function() {self.insertVar('from.first_name');}},
                                    { text: 'From: Email', onclick: function() {self.insertVar('from.email');}},
                                    { text: 'Subject', onclick: function() {self.insertVar('subject');}},
                                    { text: 'Date: Next week', onclick: function() {self.insertVar('date \'+7\' \'days\' \'DD MMMM\'');}},
                                    { text: 'Date: Last week', onclick: function() {self.insertVar('date \'-7\' \'days\' \'YYYY-MM-DD\'');}},
                                    { text: 'Random choice', onclick: function() {self.insertVar('choice \'Hello, Hi, Hey\'');}},
                                    { text: 'Extract domain', onclick: function() {self.insertVar('domain to.email');}},
                                    { text: 'Learn more about template variables', onclick: function() {
                                        window.open(`${Config.helpUrl}/templates/templates#template_variables`);
                                    }},
                                ]
                            });

                        }
                    });
                    $(document).on('focusin', function(e) {
                        if ($(e.target).closest(".mce-window").length) {
                            e.stopImmediatePropagation();
                        }
                    });
                } else {
                    jQuery.each(jQuery('textarea[data-autoresize]'), function() {
                        var offset = this.offsetHeight - this.clientHeight;

                        var resizeTextarea = function(el) {
                            jQuery(el).css('height', 'auto').css('height', el.scrollHeight + offset + 10);
                        };
                        jQuery(this).on('keyup input', function() { resizeTextarea(this); }).removeAttr('data-autoresize');
                    });
                }
            });
        };

        self.toggleHTMLSource = function () {
            self.showHTMLSource = !self.showHTMLSource;
            if (self.showHTMLSource) {
                tinymce.activeEditor.getContent({format : 'html'});
            } else {
                tinymce.activeEditor.getContent({format : 'text'});
            }
        };

        self.insertVar = function (variable) {

            if (tinymce.activeEditor) {
                tinymce.activeEditor.focus();
                tinymce.activeEditor.execCommand('mceInsertContent', false, '{{' + variable + '}}');
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

            // members does not include current user
            if (acl.length >= members.length + 1) {
                self.sharing_setting = "everyone";
            } else if (acl.length > 1) {
                self.sharing_setting = "specific";
            } else {
                self.sharing_setting = "private";
            }

            var selectize = $scope.templateModalSelectizeField[0].selectize;
            selectize.clear();

            // ADDS VALUES, NOT OPTIONS
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
                        },
                        onChange: function (tags) {
                            $timeout(() => {
                                self.selectedTemplate.tags = tags;
                            });
                        }
                    });

                    var defaults = {
                        'id': '',
                        'remote_id': '',
                        'shortcut': '',
                        'title': '',
                        'tags': '',
                        'body': '',
                        'attachments': []
                    };

                    id = id ? id : $routeParams.id;

                    if (id === 'new') {
                        // new template
                        self.selectedTemplate = angular.copy(defaults);
                        self.selectedTemplate.body = $routeParams.body || '';
                        if (tinymce.activeEditor) {
                            setTimeout(function(){ tinymce.activeEditor.setContent(self.selectedTemplate.body); }, 100);

                            if ($scope.location == '/list/tag') {
                                $('#qt-tags')[0].selectize.addItem($.trim(FilterTagService.filterTags[0]));
                            }
                        }

                        // do we need to show the `show more fields` btn
                        self.extraFields = checkHiddenExtraFields();
                    } else if (id) {
                        // update template
                        TemplateService.get(id).then(function (r) {

                            self.selectedTemplate = angular.copy(cleanExtraFields(r));
                            if (tinymce.activeEditor) {
                                setTimeout(function(){ tinymce.activeEditor.setContent(self.selectedTemplate.body); }, 100);

                            }

                            // get tags from template service, to be cleaned-up.
                            var tags = TemplateService.tags(self.selectedTemplate);
                            $.each(tags, function (_, tag) {
                                $('#qt-tags')[0].selectize.addItem($.trim(tag));
                            });

                            self.extraFields = checkHiddenExtraFields();
                        });
                    }
                });

                self.extended = false;
                var $templateFormModal = $('#template-form-modal');
                // HACK changes to jQuery.show in 3.x conflict with Bootstrap 3.x Modal.
                // these prevent setting display: block on the modal sometimes
                // when trying to open the modal from the url directly
                // (eg. when clicking New Template in the Templates Dialog).
                $templateFormModal.css('display', 'block');
                $templateFormModal.modal('show');
            };

            if (id == "new") {
                self.selectedTemplate = {};

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

                    if ($scope.account && quicktext.nosync == 0 && $rootScope.currentSubscription && $rootScope.currentSubscription.active) {
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
        self.saveQt = function () {
            if (!self.selectedTemplate.title) {
                alert("Please enter a title");
                return false;
            }
            if (tinymce.activeEditor) {
                self.selectedTemplate.body = tinymce.activeEditor.getContent({format : 'html'});
            }
            var editorContent = self.selectedTemplate.body;
            editorContent = editorContent.replace(/<(.|\n)*?>/g, '');
            if (editorContent.trim() == '')
            {
                alert("Please enter a body");
                return false;
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

                var post_update = function (selectedTemplate) {
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
                                $scope.revokeAccess([selectedTemplate], acl.target_user_id);
                            }
                        });

                        $scope.shareQuicktexts([selectedTemplate], self.send_email);
                    } else if (self.sharing_setting == 'private') {
                        self.revokeAllAccess([selectedTemplate]);
                    } else if (self.sharing_setting == 'everyone') {
                        $scope.shareQuicktextsWithEveryone([selectedTemplate], self.send_email);
                    }
                };

                if (self.selectedTemplate.id) {
                    TemplateService.update(self.selectedTemplate, !$scope.account).then(function (template) {
                        if ($scope.account) {
                            post_update(template);
                        } else {
                            $scope.reloadTemplates();
                        }
                    });
                    $scope.reloadTemplates();
                } else {
                    TemplateService.create(self.selectedTemplate, !$scope.account, self.sharing_setting === 'private').then(function (template) {
                        if ($scope.account) {
                            post_update(template);
                        } else {
                            $scope.reloadTemplates();
                        }
                    });
                    $scope.reloadTemplates();
                }

                // hide the modal
                $('.modal').modal('hide');

                SettingsService.get('hints').then(function (hints) {
                    if (hints && hints.postInstall && $routeParams.id === 'new' && $routeParams.src === 'tutorial') {
                        $('#post-install-modal').modal('show');
                    }
                });
            });

            $scope.selectedAll = false;

            // remove pending attachments
            manageAttachments();
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

            TemplateService.create(newQt).then(function (template) {
                if (template && typeof template.id !== 'undefined') {
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
        };

        self.upgradeNow = function() {
            $rootScope.trackSignup('templateForm');
            $rootScope.openSubscribe();
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

        // attachments
        var attachmentsQueue = [];
        $scope.$on('$routeUpdate', () => {
            // cleanup queue on template close
            attachmentsQueue = [];
        });

        self.attachmentStatus = {
            status: 'idle',
            message: ''
        };

        self.fileSelected = (files) => {
            self.attachmentStatus = {
                status: 'uploading'
            };

            return store.addAttachments({
                files: files
            }).then((res) => {
                // update template
                self.selectedTemplate.attachments = (self.selectedTemplate.attachments || []).concat(res);

                self.attachmentStatus = {
                    status: 'idle'
                };

                $rootScope.$broadcast('reload');
            }).catch((err = {}) => {
                $timeout(() => {
                    self.attachmentStatus = {
                        status: 'error',
                        message: err.message || err
                    };
                });
            });
        };

        self.removeAttachment = function (attachment) {
            self.selectedTemplate.attachments = self.selectedTemplate.attachments.filter((a) => {
                return a.url !== attachment.url;
            });
            $rootScope.$broadcast('reload');

            // schedule removal
            attachmentsQueue = attachmentsQueue.concat(
                Object.assign({
                    action: 'remove'
                }, attachment)
            );
        };

        // remove attachments
        var manageAttachments = function () {
            var removals = attachmentsQueue.filter((a) => a.action === 'remove');
            return store.removeAttachments({
                attachments: removals
            });
        };

        self.showFreeWarning = function () {
            return (
                $scope.reachedFreeLimit() &&
                $routeParams.id === 'new'
            );
        };
    }
