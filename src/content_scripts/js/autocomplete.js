var mirrorStyles = [
    // Box Styles.
    'box-sizing', 'height', 'width', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'margin-top',
    'margin-bottom', 'margin-left', 'margin-right'
    // Font stuff.
    , 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight'
    // Spacing etc.
    , 'word-spacing', 'letter-spacing', 'line-height', 'text-decoration', 'text-indent', 'text-transform'
    // The direction.
    , 'direction'
    ]
  , KEY_TAB = 9
  , KEY_ENTER = 13
  , KEY_ESCAPE = 27
  , KEY_UP = 38
  , KEY_DOWN = 40

App.autocomplete.isActive = false
App.autocomplete.$dropdown = null
App.autocomplete.isEmpty = null


App.autocomplete.onKeyDown = function (e) {
  // Press tab while in compose and tab pressed
  if (App.data.inCompose && e.keyCode == KEY_TAB) {
    if (App.autocomplete.isActive) {
      // Simulate closing
      App.autocomplete.onKey(KEY_ESCAPE)
      // Do not prevent default
    } else {
      e.preventDefault()
      e.stopPropagation()

      App.autocomplete.onKey(e.keyCode, e)
    }
  }

  // Press control keys when autocomplete is active
  if (App.autocomplete.isActive && ~[KEY_ENTER, KEY_UP, KEY_DOWN].indexOf(e.keyCode)) {
    e.preventDefault()
    e.stopPropagation()

    App.autocomplete.onKey(e.keyCode)
  }

  // Only prevent propagation as we'll handle escape on keyup
  // because well have to set autocomplete.active as false and it will propagate on keyup
  if (App.autocomplete.isActive && e.keyCode == KEY_ESCAPE) {
    e.preventDefault()
    e.stopPropagation()
  }
}

App.autocomplete.onKeyUp = function(e) {
  // Allways prevent tab propagation
  if (App.data.inCompose && e.keyCode == KEY_TAB) {
    e.preventDefault()
    e.stopPropagation()
  }

  if (App.autocomplete.isActive) {
    // Just prevent propagation
    if (~[KEY_ENTER, KEY_ESCAPE, KEY_UP, KEY_DOWN].indexOf(e.keyCode)) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Escape
    if (e.keyCode == KEY_ESCAPE) {
      App.autocomplete.onKey(e.keyCode)
    }
  }
}

App.autocomplete.onKey = function(key, e) {
  switch(key) {
    case KEY_TAB:
      this.checkWord(e)
    break
    case KEY_ENTER:
      this.selectActive()
    break
    case KEY_ESCAPE:
      this.close()
    break
    case KEY_UP:
      this.changeSelection('prev')
    break
    case KEY_DOWN:
      this.changeSelection('next')
    break
  }
}

App.autocomplete.checkWord = function(e) {
  // Display loading
  this.dropdownCreate(e)

  // Search for matches

  // Display matches
  App.settings.get('quicktexts', function(elements){
    App.autocomplete.dropdownPopulate(elements)
  });
}

App.autocomplete.dropdownCreate = function(e) {
  var cursorPositon = this.getCursorPosition(e)

  // Add loading dropdown
  this.$dropdown = $('<ul id="qt-dropdown" class="qt-dropdown"><li class="default">Loading...</li></ul>').insertAfter(e.target)
  this.$dropdown.css({
    top: (cursorPositon.absolute.top + cursorPositon.absolute.height) + 'px'
  , left: (cursorPositon.absolute.left + cursorPositon.absolute.width) + 'px'
  })

  this.isActive = true
  this.isEmpty = true
}

App.autocomplete.dropdownPopulate = function(elements) {
  if (elements.length) {
    var listElements = "\
          <% _.each(elements, function(element) { %>\
            <li class='qt-item' id='qt-item-<%= element.id %>'>\
              <span class='qt-shortcut'><%= element.shortcut %></span>\
              <span class='qt-title'><%= element.title %></span>\
            </li>\
          <% }); %>"
      , content = _.template(listElements, {elements: elements});

    this.$dropdown.html(content)
    this.isEmpty = false
  } else {
    this.$dropdown.html('<li class="default">No results found.<br>Press Esc to close this window.<br>Press Tab to jump to Send button.</li>')
    this.isEmpty = true
  }
}

/*
  Moves focus from editable content to Send button
*/
App.autocomplete.focusNext = function(element) {
  if (App.data.gmailView === 'standard') {
    var button = $(element).closest('table').parent().closest('table').find('[role=button][tabindex="1"]')
  } else if (App.data.gmailView == 'basic html') {
    var elements = $(element).closest('table').find('input,textarea,button')
      , button = elements.eq(elements.index(element)+1)
  }

  if (button.length) {
    button.focus()
  }
}

App.autocomplete.getCursorPosition = function(e) {
  var position = {
        start: 0
      , end: 0
      , absolute: {
          left: 0
        , top: 0
        }
      , element: null
      }

  // Working with textarea
  // Create a mirror element, copy textarea styles
  // Insert text until until selectionEnd
  // Insert a virtual cursor and find its position
  if (App.data.gmailView === 'basic html') {
    position.element = e.target
    position.start = position.element.selectionStart
    position.end = position.element.selectionEnd

    var $mirror = $('<div id="qt-mirror" class="qt-mirror"/>').addClass(position.element.className)
      , $source = $(position.element)
      , $sourcePosition = $source.position()

    // copy all styles
    for (var i = 0, style; style = mirrorStyles[i]; i++) {
      $mirror.css(style, $source.css(style))
    }

    // set absolute position
    $mirror.css({top: $sourcePosition.top + 'px', left: $sourcePosition.left + 'px'})

    // copy content
    $mirror.html($source.val().substr(0, position.end).split("\n").join('<br>'))
    $mirror.append('<span id="qt-caret"/>')

    // insert mirror
    $mirror.insertAfter($source)

    position.absolute = $('#qt-caret').offset()

    $mirror.remove()

  // Working with editable div
  // Insert a virtual cursor, find its position
  // http://stackoverflow.com/questions/16580841/insert-text-at-caret-in-contenteditable-div
  } else if (App.data.gmailView === 'standard') {
    var selection = window.getSelection()
      , range = selection.getRangeAt(0)

    position.element = selection.baseNode
    position.start = range.startOffset
    position.end = range.endOffset

    range.collapse(false)   // collapse at end
    range.deleteContents()

    // Add virtual caret
    range.insertNode(range.createContextualFragment('<span id="qt-caret"></span>'))

    // Virtual caret
    var $caret = $('#qt-caret')

    if ($caret.length) {
      // Set caret back at old position
      range = range.cloneRange()
      range.setStartAfter($caret[0])
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)

      position.absolute = $caret.offset()

      // Remove virtual caret
      $caret.remove()
    }
  }

  return position
}

App.autocomplete.selectActive = function() {

}

App.autocomplete.close = function() {
  this.$dropdown.remove()
  this.$dropdown = null

  this.isActive = false
  this.isEmpty = null
}

App.autocomplete.changeSelection = function(direction) {

}

