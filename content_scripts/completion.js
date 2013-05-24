if (typeof GQ == "undefined") var GQ = function(){};

// Given an element and the selection in that element set the X-Y position 
// relative to that element
GQ.setAutocompletePos = function(elem, listEl){
    var box = elem.getBoundingClientRect();
    listEl.style.top = box.top + 20 +  "px";
    listEl.style.left = box.left + "px";
}

// Show a list of quicktext the user can choose from.
GQ.showAutoCompleteDialog = function(word, quicktexts, root_elem){
    GQ.removeAutocompleteList();

    var container = document.querySelector("body");
    if (word.length >= 3 && quicktexts.length) {
        var listEl = document.createElement("ul");
        listEl.setAttribute('id', 'qt-au-list');
        var list = "<% _.each(quicktexts, function(qt) { %>\
            <li class='qt-au-item'><%= qt.shortcut %> - <%= qt.title %></li>\
        <% }); %>\
        </ul>";
        var content = _.template(list, {quicktexts: quicktexts});
        listEl.innerHTML = content;
        GQ.setAutocompletePos(root_elem, listEl);
        container.appendChild(listEl);
    }
}

GQ.removeAutocompleteList = function() {
    // remove autocomplete list
    var listEl = document.querySelector("#qt-au-list");
    if (listEl){
        listEl.parentNode.removeChild(listEl);
    }
}
