/* custom toolbar items for textAngular
 */

gApp.config(function ($provide) {
    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', '$timeout', function (taRegisterTool, taOptions, $timeout) {
        // place focus at the end of a contenteditable
        var focusEnd = function (el) {

            el.focus();

            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

        };

        var insertHtml = function (qtvar) {

            // we can't wrap the variable in a html tag
            // because it will cause issues when adding multiple vars
            // one after the other.
            // eg. if adding a br tag after it
            // textAngular will add the second/next inserted var
            // inside (!) the br tag.
            var template = '%var%';
            template = template.replace(/%var%/g, qtvar);

            this.$editor().wrapSelection('inserthtml', template);
        };

        var qtMethods = {};

        qtMethods.InsertSubject = function () {
            insertHtml.call(this, '{{subject}}');
        };

        qtMethods.InsertFirstFromName = function () {
            insertHtml.call(this, '{{from.0.first_name}}');
        };

        qtMethods.InsertFirstFromEmail = function () {
            insertHtml.call(this, '{{from.0.email}}');
        };

        qtMethods.InsertFirstToName = function () {
            insertHtml.call(this, '{{to.0.first_name}}');
        };

        qtMethods.InsertFirstToEmail = function () {
            insertHtml.call(this, '{{to.0.email}}');
        };

        var listTemplate = '';
        listTemplate += '{{#each %list%}}<br>';
        listTemplate += 'Name {{name}}<br>';
        listTemplate += 'First name {{first_name}}<br>';
        listTemplate += 'Last name {{last_name}}<br>';
        listTemplate += 'Email {{email}}<br>';
        listTemplate += '{{/each}}';

        qtMethods.InsertFromList = function () {
            var template = listTemplate.replace(/%list%/g, 'from');

            insertHtml.call(this, template);
        };

        qtMethods.InsertToList = function () {
            var template = listTemplate.replace(/%list%/g, 'to');

            insertHtml.call(this, template);
        };

        qtMethods.InsertCcList = function () {
            var template = listTemplate.replace(/%list%/g, 'cc');

            insertHtml.call(this, template);
        };

        qtMethods.InsertBccList = function () {
            var template = listTemplate.replace(/%list%/g, 'bcc');

            insertHtml.call(this, template);
        };

        var dropMenuTemplate = '<div class="dropdown insert-var-container">';
        dropMenuTemplate += '<button class="btn btn-default dropdown-toggle" data-toggle="dropdown" ng-mouseup="focusHack()">';
        dropMenuTemplate += 'Insert Variable<span class="caret"></span>';
        dropMenuTemplate += '</button>';
        dropMenuTemplate += '<ul class="dropdown-menu">';
        dropMenuTemplate += '<li><a ng-click="InsertFirstToName()" title="First name of the person in the \'To\' field"><strong>To:</strong> First Name</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstToEmail()" title="Email address of the person in the \'To\' field"><strong>To:</strong> Email</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstFromName()" title="First name of the person in the \'From\' field"><strong>From:</strong> First Name</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstFromEmail()" title="Email address of the person in the \'From\' field"><strong>From:</strong> Email</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertSubject()" title="The subject of the e-mail"><strong>Subject</strong></a></li>';
        dropMenuTemplate += '<li class="divider"></li>';
        dropMenuTemplate += '<li><a class="help-block text-muted small" href="http://help.gorgias.io/en/latest/src/04-templates.html" rel="external" target="_blank">Learn more about template variables <i class="fa fa-external-link"></i></a></li>';
        dropMenuTemplate += '</ul>';
        dropMenuTemplate += '</div>';

        // register the tool with textAngular
        taRegisterTool('insertVariable', {
            display: dropMenuTemplate,
            disabled: function () {

                // runs as an init function

                // hack to get around the errors thrown by textAngular
                // because it didn't get to store a pointer to the editor,
                // because it's not focused.
                this.focusHack = function () {

                    var $editor = $('.ta-scroll-window [contenteditable]').get(0);

                    // if the editor was not the focused element
                    // place the focus at the end of the text.
                    // the element reference won't match
                    // but we can compare the element id
                    // because textAngular adds a dynamic id
                    if ($editor.id !== document.activeElement.id) {

                        // focus the editor, to make sure textAngular
                        // has the editor reference
                        $editor.focus();

                        // place focus at the end of the editor
                        // to insert the variable at the end of the text

                        // we need settimeout otherwise textAngular
                        // will place the caret at the begining
                        setTimeout(function () {
                            focusEnd($editor);
                        });

                    }
                };

                var self = this;

                // insert all qtMethods into the scope
                Object.keys(qtMethods).forEach(function (key) {
                    self[key] = qtMethods[key];
                });

                this.isDisabled = function () {
                    return false;
                };

            },
            action: function () {

            }
        });

        return taOptions;
    }]);
});
