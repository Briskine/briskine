/* custom toolbar items for textAngular
 */

gqApp.config(function ($provide) {

    $provide.decorator('taOptions', [ 'taRegisterTool', '$delegate', '$timeout', 
    function(taRegisterTool, taOptions, $timeout) {
        
        //var $editor;
        
        var insertHtml = function(qtvar) {
            var template = '<span class="editor-qt-variable">%var%</span><br><br>';
            template =  template.replace(/%var%/g, qtvar);
            
            this.$editor().wrapSelection('inserthtml', template);
        };
        
        var qtMethods = {};
    
        qtMethods.InsertSubject = function() {
            insertHtml.call(this, '{{ subject }}');
        };
        
        qtMethods.InsertFirstFromName = function() {
            insertHtml.call(this, '{{from.0.name}}');
        };
        
        qtMethods.InsertFirstFromEmail = function() {
            insertHtml.call(this, '{{from.0.email}}');
        };
        
        qtMethods.InsertFirstToName = function() {
            insertHtml.call(this, '{{to.0.name}}');
        };
        
        qtMethods.InsertFirstToEmail = function() {
            insertHtml.call(this, '{{to.0.email}}');
        };
        
        var listTemplate = '';
        listTemplate += '{{#each %list%}}<br>';
        listTemplate += '- Name {{name}}<br>';
        listTemplate += '- First name {{first_name}}<br>';
        listTemplate += '- Last name {{last_name}}<br>';
        listTemplate += '- Email {{email}}<br>';
        listTemplate += '{{/each}}';
        
        qtMethods.InsertFromList = function() {
            var template = listTemplate.replace(/%list%/g, 'from');
            
            insertHtml.call(this, template);
        };
        
        qtMethods.InsertToList = function() {
            var template = listTemplate.replace(/%list%/g, 'to');
            
            insertHtml.call(this, template);
        };
        
        qtMethods.InsertCcList = function() {
            var template = listTemplate.replace(/%list%/g, 'cc');
            
            insertHtml.call(this, template);
        };
        
        qtMethods.InsertBccList = function() {
            var template = listTemplate.replace(/%list%/g, 'bcc');
            
            insertHtml.call(this, template);
        };

        var dropMenuTemplate = '<div class="dropdown insert-var-container">';
        dropMenuTemplate += '<button class="btn btn-default dropdown-toggle" data-toggle="dropdown" ng-mouseup="focusHack()">';
        dropMenuTemplate += 'Insert variable<span class="caret"></span>';
        dropMenuTemplate += '</button>';
        dropMenuTemplate += '<ul class="dropdown-menu">';
        dropMenuTemplate += '<li><a ng-click="InsertSubject()">Subject</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstFromName()">First FROM Name</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstFromEmail()">First FROM Email</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstToName()">First TO Name</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFirstToEmail()">First TO Email</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertFromList()">FROM List</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertToList()">TO List</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertCcList()">CC List</a></li>';
        dropMenuTemplate += '<li><a ng-click="InsertBccList()">BCC List</a></li>';
        dropMenuTemplate += '</ul>';
        dropMenuTemplate += '</div>';
        
        // register the tool with textAngular
        taRegisterTool('insertVariable', {
            display: dropMenuTemplate,
            disabled: function() {
                
                // runs as an init function
                
                // hack to get around the errors thrown by textAngular
                // because it didn't get to store a pointer to the editor,
                // because it's not focused.
                this.focusHack = function() {
                    $('.ta-scroll-window [contenteditable]')[0].focus();
                };
                
                var self = this;
                
                // insert all qtMethods into the scope
                Object.keys(qtMethods).forEach(function(key) {
                    self[key] = qtMethods[key];
                });
                
                this.isDisabled = function() {
                    return false;
                };

            },
            action: function(){}
        });
        
        return taOptions;
    
    }]);
    

    
});
