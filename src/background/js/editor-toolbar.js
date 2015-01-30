/* custom toolbar items for textAngular
 */

gqApp.config(function ($provide) {

    $provide.decorator('taOptions', [ 'taRegisterTool', '$delegate',
    function(taRegisterTool, taOptions) {
        
        var templateVar = function(variable) {
            var template = '<span class="editor-qt-variable">%var%</span><br><br>';
            
            return template.replace(/%var%/g, variable);
        };
        
        // register the tool with textAngular
        taRegisterTool('subject', {
            buttontext: 'Subject',
            action: function(){
                this.$editor().wrapSelection('inserthtml', templateVar('{{ subject }}'));
            }
        });
        
        taRegisterTool('firstFromName', {
            buttontext: 'First FROM Name',
            action: function(){
                this.$editor().wrapSelection('inserthtml', templateVar('{{from.0.name}}'));
            }
        });
        
        taRegisterTool('firstFromEmail', {
            buttontext: 'First FROM Email',
            action: function(){
                this.$editor().wrapSelection('inserthtml', templateVar('{{from.0.email}}'));
            }
        });
        
        taRegisterTool('firstToName', {
            buttontext: 'First TO Name',
            action: function(){
                this.$editor().wrapSelection('inserthtml', templateVar('{{to.0.name}}'));
            }
        });
        
        taRegisterTool('firstToEmail', {
            buttontext: 'First TO Email',
            action: function(){
                this.$editor().wrapSelection('inserthtml', templateVar('{{from.0.email}})'));
            }
        });
        
        var listTemplate = '';
        listTemplate += '{{#each %list%}}<br>';
        listTemplate += '- Name {{name}}<br>';
        listTemplate += '- First name {{first_name}}<br>';
        listTemplate += '- Last name {{last_name}}<br>';
        listTemplate += '- Email {{email}}<br>';
        listTemplate += '{{/each}}';
        
        taRegisterTool('fromList', {
            buttontext: 'FROM List',
            action: function(){
                var template = listTemplate.replace(/%list%/g, 'from');
                
                this.$editor().wrapSelection('inserthtml', templateVar(template));
            }
        });
        
        taRegisterTool('toList', {
            buttontext: 'TO List',
            action: function(){
                var template = listTemplate.replace(/%list%/g, 'to');
                
                this.$editor().wrapSelection('inserthtml', templateVar(template));
            }
        });
        
        taRegisterTool('ccList', {
            buttontext: 'CC List',
            action: function(){
                var template = listTemplate.replace(/%list%/g, 'cc');
                
                this.$editor().wrapSelection('inserthtml', templateVar(template));
            }
        });
        
        taRegisterTool('bccList', {
            buttontext: 'BCC List',
            action: function(){
                var template = listTemplate.replace(/%list%/g, 'bcc');
                
                this.$editor().wrapSelection('inserthtml', templateVar(template));
            }
        });
        
        return taOptions;
    
    }]);
    

    
});
