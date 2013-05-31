if (typeof GQ == "undefined") var GQ = function(){};

GQ.getOffset = function(el) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

// get position of carret
GQ.getCaret = function(el) {
  if (el.selectionStart) {
    return el.selectionStart;
  } else if (document.selection) {
    el.focus();

    var r = document.selection.createRange();
    if (r == null) {
      return 0;
    }

    var re = el.createTextRange(),
        rc = re.duplicate();
    re.moveToBookmark(r.getBookmark());
    rc.setEndPoint('EndToStart', re);

    return rc.text.length;
  }

  return 0;
}


// Show a list of quicktext the user can choose from.
GQ.showAutoCompleteDialog = function(word, quicktexts, source){
    var listEl = document.querySelector("#qt-au-list");
    var mirror = document.querySelector("#qt-mirror");
    var caret = document.querySelector("#qt-caret");
    var mirrorStyles = [
        // Box Styles.
        'box-sizing', 'height', 'width', 'padding-bottom'
        , 'padding-left', 'padding-right', 'padding-top'

        // Font stuff.
        , 'font-family', 'font-size', 'font-style' 
        , 'font-variant', 'font-weight'

        // Spacing etc.
        , 'word-spacing', 'letter-spacing', 'line-height'
        , 'text-decoration', 'text-indent', 'text-transform' 

        // The direction.
        , 'direction'
        ];

    GQ.removeAutocompleteList(listEl);
    GQ.removeAutocompleteList(mirror);
    GQ.removeAutocompleteList(caret);

    mirror = document.createElement("div");
    mirror.setAttribute("id", "qt-mirror");
    source.parentElement.appendChild(mirror);

    var styles = {};
    for (var i = 0, style; style = mirrorStyles[i]; i++) {
        mirror.style.setProperty(style, source.style.getPropertyValue(style));
    }
    for (var i = 0, cl; cl = source.classList[i]; i++){
        mirror.classList.add(cl);
    }

    var sourcePos = GQ.getOffset(source);
    mirror.style.top = sourcePos.top + "px";

    var caretPos = GQ.getCaret(source)
        , str      = source.value
        , pre      = document.createTextNode(str.substring(0, caretPos))
        , post     = document.createTextNode(str.substring(caretPos))
        , caret     = document.createElement("span");
    caret.setAttribute('id', 'qt-caret');
    caret.innerHTML = "&nbsp;";

    mirror.appendChild(pre);
    mirror.appendChild(caret);
    mirror.appendChild(post);

    mirror.scrollTop = source.scrollTop + 10;

    if (word.length >= 3 && quicktexts.length) {

        var listEl = document.createElement("ul");
        listEl.setAttribute('id', 'qt-au-list');
        var list = "<% _.each(quicktexts, function(qt) { %>\
            <li class='qt-au-item'><%= qt.shortcut %> - <%= qt.title %></li>\
        <% }); %>\
        </ul>";
        var content = _.template(list, {quicktexts: quicktexts});
        var position = GQ.getOffset(document.querySelector("#qt-caret"));

        listEl.innerHTML = content;
        listEl.style.top = position.top + "px";
        listEl.style.left = position.left + "px";
        source.parentElement.appendChild(listEl);
    }
}

GQ.removeAutocompleteList = function(el) {
    if (el){
        el.parentNode.removeChild(el);
    }
}
