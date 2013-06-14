function initializeOnDomReady(){
    // populate quicktext table
    loadQuicktexts();

    // Extension settings
    function boolFieldHandler(field){
        var input = document.getElementById(field);
        if (input){
            var autocompleteEnabled = Settings.get(field);
            if (autocompleteEnabled) {
                input.setAttribute("checked", "checked");
            }
            input.addEventListener("change", function(e){
                Settings.set(field, this.checked);
            });
        }
    }
    boolFieldHandler("autocompleteEnabled");
    boolFieldHandler("tabcompleteEnabled");

    // add new quick text
    var newButton = document.querySelector("#new-quicktext-button")
    if (newButton){
        newButton.addEventListener("click", function(e){
            this.classList.add("hide");
            // clean the form
            document.querySelector("#qt-id").value = "";
            document.querySelector("#qt-title").value = "";
            document.querySelector("#qt-subject").value = "";
            document.querySelector("#qt-shortcut").value = "";
            document.querySelector("#qt-tags").value = "";
            document.querySelector("#qt-body").value = "";

            var formDiv = document.querySelector("#quicktext-form");
            formDiv.classList.add("show")
            document.querySelector("#qt-title").focus();
        });
    }
    // submit add/edit quicktext
    var submitButton = document.querySelector("#qt-submit");
    if (submitButton){
        submitButton.addEventListener("click", function(e){
            e.preventDefault();
            var id = document.querySelector("#qt-id");
            var title = document.querySelector("#qt-title");
            var subject = document.querySelector("#qt-subject");
            var shortcut = document.querySelector("#qt-shortcut");
            var tags = document.querySelector("#qt-tags");
            var body = document.querySelector("#qt-body");
            var quicktexts = Settings.get('quicktexts');

            if (!title.value){
                alert("Please enter a title");
                title.focus();
                return false;
            }
            if (!body.value){
                alert("Please enter a quicktext");
                body.focus();
                return false;
            }
            if (id.value !== ''){
                var newQuicktexts = [];
                _.each(quicktexts, function(qt){
                    if (qt.id == id.value){
                        qt.title = title.value;
                        qt.subject= subject.value;
                        qt.shortcut = shortcut.value;
                        qt.tags = tags.value;
                        qt.body = body.value;
                    }
                    newQuicktexts.push(qt);
                });
                quicktexts = newQuicktexts;
            } else {
                quicktext = {
                    'title': title.value,
                    'subject': subject.value,
                    'shortcut': shortcut.value,
                    'tags': tags.value,
                    'body': body.value
                };
                quicktext.id = get_id(quicktext);
                quicktexts.push(quicktext);
            }
            Settings.set('quicktexts', quicktexts);
            syncQuicktexts();

            var dialog = document.querySelector("#dialog-container");
            if (dialog){
                window.close();
            }
            loadQuicktexts();
            document.querySelector("#new-quicktext-button").classList.remove("hide");
            document.querySelector("#quicktext-form").classList.remove("show");
        });
    }

    // search quicktext
    var searchEl = document.querySelector("#search");
    if (searchEl){
        searchEl.addEventListener("keyup", function(){
            // search in title, shortcut and body
            var self = this;
            var query = self.value.toLowerCase();
            var quicktexts = Settings.get('quicktexts');
            function show(id){
                var row = document.querySelector("#qt-" + id);
                row.classList.remove("hide");
            };

            _.each(quicktexts, function(qt){
                if (qt.title.toLowerCase().indexOf(query) !== -1) {return show(qt.id);}
                if (qt.shortcut.toLowerCase().indexOf(query) !== -1) {return show(qt.id);}
                if (qt.tags.toLowerCase().indexOf(query) !== -1) {return show(qt.id);}
                if (qt.body.toLowerCase().indexOf(query) !== -1) {return show(qt.id);}
                document.querySelector("#qt-" + qt.id).classList.add("hide");
            });
        });
    }

    var syncButton = document.querySelector("#sync-button");
    if (syncButton){

        syncButton.addEventListener("click", function(){
            if (syncButton.innerHTML == 'Stop syncronization'){
                syncButton.innerHTML = 'Start syncronization';
                Settings.set('syncEnabled', false);
            } else {
                syncButton.innerHTML = 'Stop syncronization';
                Settings.set('syncEnabled', true); 
            }
            // If we are logged in the we should try getting the quicktexts from the website directly
            try {
                syncQuicktexts();
            } catch (e) {
                if (e.message.indexOf("Invalid JSON") !== -1) {
                    // this probably means that the user is not logged in
                    window.location =  Settings.get('baseURL') + "registration"
                } else {
                    throw e;
                }
            }
        });
    }

    var sharingButton = document.querySelector("#sharing-button");
    if (sharingButton){
        sharingButton.addEventListener("click", function(){
            window.location = Settings.get('baseURL') + 'quicktexts';
        });
    }

    var deleteAllButton = document.querySelector("#delete-all-button");
    if (deleteAllButton){
        deleteAllButton.addEventListener("click", function(){
            var r = confirm("Are you sure you want to delete all Quicktexts?\n\nNote: they will NOT be deleted from the syncronization server.");
            if (r === true){
                Settings.set("quicktexts", []);
                loadQuicktexts();
            }
        });
    }
}

function syncQuicktexts(){
    if (Settings.get("syncEnabled") === false){
        return;
    }
    // first we get the quicktexts from the sync server
    result = ajax.getJSON(Settings.get("apiBaseURL") + "sync");
    if (result.status == 0){
        quicktexts = []; // the list that we'll populate
        existing_quicktexts = Settings.get("quicktexts");
        new_ids = [];

        // add all remote quicktexts to the list
        _.each(result.quicktexts, function(remote_qt) {
            remote_qt.id = get_id(remote_qt);// give a id to the remote qt
            new_ids.push(remote_qt.id);
            quicktexts.push(remote_qt);
        });

        // if we don't have the local quicktexts in the remote quicktexts
        // we add them to the list
        _.each(existing_quicktexts, function(local_qt) {
            if (new_ids.indexOf(local_qt.id) === -1){
                quicktexts.push(local_qt)
            }
        })
        Settings.set("quicktexts", quicktexts);
    }
    // now we try to send the quicktexts back to the server for syncronization
    ajax.post(Settings.get("apiBaseURL") + "sync", Settings.get("quicktexts"), function(res){
        //console.log(res);
    });
    loadQuicktexts();
}
// get the unique id for the quicktext in question
function get_id(qt){
    return hex_md5(qt.title + qt.subject + qt.shortcut + qt.tags + qt.body);
}

// delete quicktexts
function deleteClicked(e){
    var self = this;
    var id = self.getAttribute("rel");
    var quicktexts = Settings.get('quicktexts');
    Settings.set('quicktexts', _.filter(quicktexts, function(qt){
        return qt.id != id;
    }));
    document.querySelector("#qt-" + id).remove();
}

function editClicked(e){
    var self = this;
    var id = self.getAttribute("rel");
    var quicktexts = Settings.get('quicktexts');
    // hide add new quicktext
    document.querySelector("#new-quicktext-button").classList.add("hide");
    _.each(quicktexts, function(qt){
        if (qt.id == id) {
            var formDiv = document.querySelector("#quicktext-form");
            formDiv.classList.add('show');
            document.querySelector("#qt-id").value = qt.id;
            document.querySelector("#qt-title").value = qt.title;
            document.querySelector("#qt-subject").value = qt.subject;
            document.querySelector("#qt-tags").value = qt.tags;
            document.querySelector("#qt-shortcut").value = qt.shortcut;
            document.querySelector("#qt-body").value = qt.body;
            return;
        }
    });
    document.querySelector("#qt-title").focus();
}

function loadQuicktexts(){
    var table = document.querySelector("#quicktexts-table");
    if (!table){
        return;
    }
    var quicktexts = Settings.get('quicktexts');
    var isPopup = $('body').hasClass('ispopup');
    var qtTemplate = '<% _.each(quicktexts, function(qt) { %>\
    <tr id="qt-<%= qt.id %>" key="qt-<%= qt.key %>">\
        <td class="title-cell"><%= qt.title %></td>\
        <td class="subject-cell"><%= qt.subject %></td>\
        <td class="shortcut-cell"><%= qt.shortcut %></td>\
        <td class="tags-cell"><%= qt.tags %></td>\
        <td class="body-cell"><div class="body-container"><%= qt.body %></div></td>\
        <td class="edit-cell"><a href="#" class="qt-edit" rel="<%= qt.id %>">Edit</a></td>\
        <td class="delete-cell"><a href="#" class="qt-delete" rel="<%= qt.id %>">Delete</a></td>\
    </tr>\
    <% }); %>';

    filtered = [];
    _.each(quicktexts, function(qt){
        qt.title= _.str.truncate(qt.title, 30);
        qt.subject = _.str.truncate(qt.subject, 30);
        qt.shortcut = _.str.truncate(qt.shortcut, 15);
        qt.tags = _.str.truncate(qt.tags, 20);
        qt.body = _.str.truncate(qt.body, 100);
        filtered.push(qt);
    });
    var compiled = _.template(qtTemplate, {'quicktexts': filtered});
    $("#quicktexts-table tbody").html(compiled);
    if (isPopup){
        $("#quicktexts-table tbody tr").click(function(){
            // A quicktext item was clicked. Insert it into the compose area
            var id = $(this).attr("id").split("qt-")[1];
            insertQuicktext(id);
        });
    }

    // Attach event handlers to delete actions
    var deleteActions = document.querySelectorAll(".qt-delete")
    _.each(deleteActions, function(el){
        el.addEventListener("click", deleteClicked);
    });
    var editActions = document.querySelectorAll(".qt-edit")
    _.each(editActions, function(el){
        el.addEventListener("click", editClicked);
    });
}

window.addEventListener("DOMContentLoaded", initializeOnDomReady);
