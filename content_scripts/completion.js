if (typeof GQ == "undefined") var GQ = function(){};

// autocomplete dialog stuff
GQ.au = {};

GQ.au.active = false;
GQ.au.timeoutId = null;

// get position of carret
GQ.au.getCaret = function(params, el) {
  if (params.selection){
    return params.selection.baseOffset;
  }

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

// create mirror element (mirrors the Textarea and contenteditable).
// we need to do this in order to display the autocomplete dialog
GQ.au.createMirror = function(params, source) {

    var mirrorStyles = [
        // Box Styles.
        'box-sizing', 'height', 'width', 'padding-bottom'
        , 'padding-left', 'padding-right', 'padding-top', 'margin-top',
        'margin-bottom', 'margin-left', 'margin-right',

        // Font stuff.
        , 'font-family', 'font-size', 'font-style'
        , 'font-variant', 'font-weight'

        // Spacing etc.
        , 'word-spacing', 'letter-spacing', 'line-height'
        , 'text-decoration', 'text-indent', 'text-transform'

        // The direction.
        , 'direction'
        ];

    var mirror = document.createElement("div");
    mirror.setAttribute("id", "qt-mirror");
    source.parentElement.appendChild(mirror);

    // all classes
    for (var i = 0, cl; cl = source.classList[i]; i++){
        mirror.classList.add(cl);
    }

    // copy all styles
    for (var i = 0, style; style = mirrorStyles[i]; i++) {
        $(mirror).css(style, $(source).css(style));
    }

    var sourcePos = $(source).position();
    mirror.style.top = sourcePos.top + "px";
    mirror.style.left = sourcePos.left + "px";

    if (!GQ.isContentEditable){
        var caretPos = GQ.au.getCaret(params, source);
        var str = params.value;
        var pre = document.createTextNode(str.substring(0, caretPos));
        var post = document.createTextNode(str.substring(caretPos));
        var caret = document.createElement("span");

        caret.setAttribute('id', 'qt-caret');
        caret.innerHTML = "&nbsp;";

        mirror.appendChild(pre);
        mirror.appendChild(caret);
        mirror.appendChild(post);
        mirror.scrollTop = source.scrollTop + 10;
    } else {
        var doc = document;
        if (params.iFrameDoc){
            doc = params.iFrameDoc;
        }
        var range = doc.createRange();
        range.selectNodeContents(params.base);
        var rects = range.getClientRects();
        var caret = $("<span id='qt-caret' />");
        if (params.iFrameDoc){
            caret.css('position', 'absolute');
        } else {
            caret.css('position', 'fixed');
        }

        if (rects.length){
            caret.css("top", rects[0].top + "px");
            caret.css("left", rects[0].left + "px");
        }
        $(mirror).append(caret);
    }
}

// Show a list of quicktext the user can choose from.
GQ.au.show = function(params, quicktexts, source){
    $("#qt-au-list", params.iFrameDoc).remove();
    $("#qt-mirror", params.iFrameDoc).remove();

    // clear first
    window.clearTimeout(GQ.au.timeoutId);
    GQ.au.timeoutId = window.setTimeout(function() {
        if (params.word.length >= 3 && quicktexts.length) {
            GQ.au.active = true;

            var listEl = $("<ul id='qt-au-list'>")
            var list = "<% _.each(quicktexts, function(qt) { %>\
                <li class='qt-au-item' id='qt-item-<%= qt.id %>'>\
                    <span class='qt-au-item-shortcut'><%= qt.shortcut %></span>\
                    <span class='qt-au-item-title'><%= qt.title %></span>\
                </li>\
            <% }); %>\
            </ul>";
            var content = _.template(list, {quicktexts: quicktexts});
            listEl.html(content);

            mirror = GQ.au.createMirror(params, source);
            var sourcePos = $(source).position();
            var caretPos = $("#qt-caret", params.iFrameDoc).position();

            listEl.css('top', sourcePos.top + caretPos.top + "px");
            listEl.css('left', sourcePos.left + caretPos.left + "px");
            $(source).after(listEl);

            // make the first element active
            $('.qt-au-item:first', params.iFrameDoc).addClass("qt-au-item-active");

            // attach hover events
            $('.qt-au-item', params.iFrameDoc).hover(function(){
                $(".qt-au-item", params.iFrameDoc).removeClass("qt-au-item-active");
                $(this).addClass("qt-au-item-active");
            });
        }
    }, 300); // sleep for a while before showing
};

GQ.au.remove = function(doc) {
    var iframe = document.querySelector('iframe.editable');
    if (iframe){
        doc = iframe.contentDocument;
    }
    $("#qt-au-list", doc).remove();
    GQ.au.active = false;
};

GQ.au.move = function(dir) {
    var doc = document;
    var iframe = document.querySelector('iframe.editable');
    if (iframe){
        doc = iframe.contentDocument;
    }

    var activeEl = $(".qt-au-item-active", doc);
    var nextEl = null;
    if (dir == "up") {
        nextEl = activeEl.prev('.qt-au-item');
    } else if (dir == "down") {
        nextEl = activeEl.next('.qt-au-item');
    }

    if (nextEl.length){
        activeEl.removeClass('qt-au-item-active');
        nextEl.addClass('qt-au-item-active');
    }
};

// Given a quicktext object try to insert it
GQ.au.handleInsertion = function(source, parseWord) {
    window.clearTimeout(GQ.au.timeoutId);
    if (GQ.isContentEditable) {
        if (GQ.attachedIframe){ // we are in an iframe with a contenteditable element
            GQ.handleIframe(source, parseWord,
                function(params, result){
                    var lines = result.split("\n");
                    if (params.base === source) {
                        $(source).append("<div>");
                        params.base = $(source).find('div')[0];
                    }

                    params.base.data = "";
                    _.each(lines, function(line){
                        $(params.base).before($("<div>").html(line));
                    });
                    return result;
                },
                function(params, newCursorPos){
                    //var range = params['iFrameDoc'].createRange();
                    //range.setStart(params['base'], newCursorPos);
                    //range.setEnd(params['base'], newCursorPos);
                    //params['selection'].removeAllRanges();
                    //params['selection'].addRange(range);
                }
            );
        } else { // in the 'new style' editor
            GQ.handleNewStyle(source, parseWord,
                function(params, result){
                    var lines = result.split("\n");
                    if (params.base === source) {
                        $(source).append("<div>");
                        params.base = $(source).find('div')[0];
                    }
                    params.base.data = "";
                    _.each(lines, function(line){
                        $(params.base).before($("<div>").html(line));
                    });
                    return result;
                },
                function(params, newCursorPos){
                    //var range = document.createRange();
                    //range.setStart(params['base'], newCursorPos);
                    //range.setEnd(params['base'], newCursorPos);
                    //params['selection'].removeAllRanges();
                    //params['selection'].addRange(range);
                }
            );
        }
    } else { // old style plaintext editor
        GQ.handlePlainText(source, parseWord,
            function(params, result){
                source.value = result;
                return result;
            },
            function(params, newCursorPos){
                source.setSelectionRange(newCursorPos, newCursorPos);
            }
        );
        var value = source.value;
    }

};

// Given the selected item in the autocomplete dialog replace the word with
// the right quicktext
GQ.au.complete = function(e, source) {
    function parseWord(params, setValue, setPosition){
        var doc = document;
        var iframe = document.querySelector('iframe.editable');
        if (iframe){
            doc = iframe.contentDocument;
        }
        var quicktextId = $(".qt-au-item-active", doc).attr('id').split("qt-item-")[1];
        GQ.settings.get('quicktexts', function(quicktexts){
            _.each(quicktexts, function(qt){
                if (quicktextId === qt.id) { // found quicktext
                    GQ.loadVariables();
                    var before = params.value.substr(0, params.startPosition + 1);
                    var after = params.value.substr(params.endPosition);
                    var compiled = _.template(qt.body, GQ.templateVars);
                    var result = before + compiled + after;
                    result = setValue(params, result);
                    // set the cursor in the correct position
                    var newCursorPos = before.length + result.length;
                    setPosition(params, newCursorPos);
                    return false; // stop the loop
                }
            });
        });
    }
    GQ.au.handleInsertion(source, parseWord);
};

// the tab key was hit so we'll try to find the apropriate quicktext
GQ.au.tab = function (e, source) {
    // XXX: Stop propagation only if matched
    // This is going to be difficult since we fetch de quicktexts asyncronously
    e.preventDefault();
    e.stopPropagation();

    function parseWord(params, setValue, setPosition) {
            // search in settings that we have the right quicktext
            GQ.settings.get('quicktexts', function(quicktexts){
                _.each(quicktexts, function(qt){
                    if (params.word === qt.shortcut) { // found shortcut
                        GQ.loadVariables();
                        // remove the word
                        var before = params.value.substr(0, params.startPosition + 1);
                        var after = params.value.substr(params.endPosition);
                        var compiled = _.template(qt.body, GQ.templateVars);
                        var result = before + compiled + after;
                        result = setValue(params, result);
                        // set the cursor in the correct position
                        var newCursorPos = before.length + result.length;
                        setPosition(params, newCursorPos);
                        return false; // stop the loop
                    }
                });
            });
    };

    GQ.au.handleInsertion(source, parseWord);
};
