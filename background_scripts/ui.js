function initializeOnDomReady(){
    // populate quicktext table
    loadQuicktexts();
    // add new quick text
    var newButton = document.querySelector("#new-quicktext-button")
    if (newButton){
        newButton.addEventListener("click", function(e){
            this.classList.add("hide");
            // clean the form
            document.querySelector("#qt-id").value = "";
            document.querySelector("#qt-title").value = "";
            document.querySelector("#qt-shortcut").value = "";
            document.querySelector("#qt-template").value = "";

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
            var shortcut = document.querySelector("#qt-shortcut");
            var template = document.querySelector("#qt-template");
            var quicktexts = Settings.get('quicktexts');

            if (!title.value){
                alert("Please enter a title");
                title.focus();
                return false;
            }
            if (!template.value){
                alert("Please enter a quicktext");
                template.focus();
                return false;
            }
            if (id.value !== ''){
                var newQuicktexts = [];
                _.each(quicktexts, function(qt){
                    if (qt.id == id.value){
                        qt.title = title.value;
                        qt.shortcut = shortcut.value;
                        qt.template = template.value;
                    }
                    newQuicktexts.push(qt);
                });
                quicktexts = newQuicktexts;
            } else {
                quicktexts.push({
                    'id': hex_md5(title.value + shortcut.value + template.value),
                    'title': title.value,
                    'shortcut': shortcut.value,
                    'template': template.value,
                });
            }
            Settings.set('quicktexts', quicktexts);
            loadQuicktexts();
            document.querySelector("#new-quicktext-button").classList.remove("hide");
            document.querySelector("#quicktext-form").classList.remove("show");
        });
    }

    // search quicktext
    var searchEl = document.querySelector("#search");
    if (searchEl){
        searchEl.addEventListener("keyup", function(){
            // search in title, shortcut and template
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
                if (qt.template.toLowerCase().indexOf(query) !== -1) {return show(qt.id);}
                document.querySelector("#qt-" + qt.id).classList.add("hide");
            });
        });
    }
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
            document.querySelector("#qt-shortcut").value = qt.shortcut;
            document.querySelector("#qt-template").value = qt.template;
            return;
        }
    });
    document.querySelector("#qt-title").focus();
}

function loadQuicktexts(){
    var quicktexts = Settings.get('quicktexts');
    var table = document.querySelector("#quicktexts-table");
    if (!table){
        return;
    }
    var isPopup = table.getAttribute("rel") === 'popup';
    var qtTemplate = '<% _.each(quicktexts, function(qt) { %>\
    <tr id="qt-<%= qt.id %>">\
        <td><%= qt.shortcut %></td>\
        <td><%= qt.title %></td>\
        <td><%= qt.template %></td>\
        <td><a href="#" class="qt-edit" rel="<%= qt.id %>">Edit</a></td>\
        <td><a href="#" class="qt-delete" rel="<%= qt.id %>">Delete</a></td>\
    </tr>\
    <% }); %>';
    if (isPopup) {
        qtTemplate = '<% _.each(quicktexts, function(qt) { %>\
        <tr id="qt-<%= qt.id %>">\
            <td><%= qt.shortcut %></td>\
            <td><%= qt.title %></td>\
            <td><%= qt.template %></td>\
        </tr>\
        <% }); %>'; 
    }
    var compiled = _.template(qtTemplate, {'quicktexts': quicktexts});
    document.querySelector("#quicktexts-table tbody").innerHTML = compiled;

    // Attach event handlers to delete actions
    var deleteActions = document.querySelectorAll(".qt-delete")
    _.each(deleteActions, function(el){
        el.addEventListener("click", deleteClicked);
    });
    var editActions = document.querySelectorAll(".qt-edit")
    _.each(editActions, function(el){
        el.addEventListener("click", editClicked);
    });
    if (isPopup){
        // in the popup when the user clicks a row it inserts the quicktext in 
        // the edit area
        var rows = document.querySelectorAll("#quicktexts-table tbody tr")
        _.each(rows,function(row){
            row.classList.add("clickable");
            row.addEventListener("click", function(e){
                var self = this;
                var id = self.getAttribute("id").split('qt-')[1];
                // send a message to the content script to insert
            });
        });
    }
}

window.addEventListener("DOMContentLoaded", initializeOnDomReady);
