/* Outlook plugin
 */

App.plugin('outlook', (function() {

    var $editor;
    var $toolbar;
    var $qaBtn;
    var $pageCompose;
    var $iframe;
    var editPageClass = 'gorgias-outlook-editor';
    var editPageTimer;

    var parseName = function(name) {
        name = name.trim();

        var first_name = '';
        var last_name = '';

        var firstSpace = name.indexOf(' ');

        if(firstSpace === -1) {
            firstSpace = name.length;
        }

        first_name = name.substring(0, firstSpace);
        last_name = name.substring(firstSpace + 1, name.length);

        return {
            first_name: first_name,
            last_name: last_name
        }
    };

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: [],
            to: [],
            cc: [],
            bcc: [],
            subject: ''
        };

        var $fromContainer= $('.FromContainer', window.parent.document);
        var fromName = $fromContainer.find('.Name').text();
        var fromAddress = $fromContainer.find('.Address').text();

        var from = {
           name: fromName,
           first_name: '',
           last_name: '',
           email: fromAddress
        };

        // in case we didn't get the name from .fromContainer
        // try to get it from the top right
        if(!fromName || !fromName.trim()) {
            fromName = $('#c_meun', window.parent.document).text();
        };

        var parsedName = parseName(fromName);

        from.first_name = parsedName.first_name;
        from.last_name = parsedName.last_name;

        vars.from.push(from);

        var $toContacts = $('#toCP .cp_Contact', window.parent.document);
        var $contact;
        var email;

        $toContacts.each(function() {
            $contact = $(this).find('a:first');
            email = $contact.next('.hideText').text();

            var name = $contact.text();
            var parsedName = parseName(name);
            var to = {
                name: name,
                first_name: '',
                last_name: '',
                email: email.replace(/["<>;]/gi,'')
            };

            to.first_name = parsedName.first_name;
            to.last_name = parsedName.last_name;

            vars.to.push(to);

        });

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('input[name=fSubject]', window.parent.document);
        $subjectField.val(params.quicktext.subject);

        if(callback) {
            callback(null, response);
        }

    };

    var setBtnPosition = function(textfield) {
        // get the position of the last element in the toolbar
        // and place the button next to it.
        var top = 0;
        var left = 0;
        var $lastToolbarBtn = $toolbar.querySelector('ul li:last-child');
        var toolbarBtnRect = $lastToolbarBtn.getBoundingClientRect();

        top = toolbarBtnRect.top;
        left = toolbarBtnRect.right;

        return {
            top: top,
            left: left
        }
    };

    var setEditPage = function() {
        // check if the editor is rendered,
        // and the active element is not the editor,
        // because outlook usually auto-focuses it.
        if($editor && document.activeElement !== $editor) {
            // focus it to trigger positioning.
            // we need the custom event trick to make sure
            // we bypass browser focus stealing prevention that triggers
            // when using .focus().
            var focus = new Event('focus');
            $editor.dispatchEvent(focus);
        }

        // add the edit page class if it's not already added
        if(!document.body.classList.contains(editPageClass)) {
            document.body.classList.add(editPageClass);
        }
    };

    var domChange = function() {
        $pageCompose = document.getElementById('pageCompose');

        if(editPageTimer) {
            clearTimeout(editPageTimer);
        }

        // if we're on the compose page
        if($pageCompose && $pageCompose.offsetParent !== null) {
            // get the toolbar node
            $toolbar = document.querySelector('.RteToolbar');
            $iframe = document.querySelector('iframe.RichText');

            if($iframe) {
                // get the editor node
                $editor = $iframe.contentWindow.document.querySelector('body.RichText');

                // wait for the page animation to finish
                editPageTimer = setTimeout(setEditPage, 150);
            }
        } else {
            // remove the edit page class if we're not on the edit page
            document.body.classList.remove(editPageClass);
        }
    };

    var focusEditor = function() {
        if($editor && document.activeElement !== $editor) {
            $editor.focus();
        }
    };

    var init = function(params, callback) {
        var outlookUrl = '.mail.live.com/';
        var activateExtension = false;

        // trigger the extension based on url
        if(window.location.href.indexOf(outlookUrl) !== -1) {
            activateExtension = true;

            // use an observer to detect page change
            var observer = new MutationObserver(domChange);
            observer.observe(document.body, {
                attributes: true
            });

            // focus the editor before clicking the qa btn,
            // so we can have a reference of the editor and the focusNode
            // in the extension and can run `getSelectedWord`,
            // when the button is clicked.
            var $qaBtn = document.querySelector('.gorgias-qa-btn');
            if($qaBtn) {
                $qaBtn.addEventListener('mousedown', focusEditor);
            }
        }

        // return true as response if plugin should be activated
        if(callback) {
            // first param is the error
            // second is the response
            callback(null, activateExtension);
        }

    };

    return {
        init: init,
        getData: getData,
        setTitle: setTitle,
        setBtnPosition: setBtnPosition
    }

})());
