/*
  Keycodes:
     9 Tab
    13 Enter
    27 Escape
    38 Key up
    40 Key down
*/

App.autocomplete.onKeyDown = function (e) {
  // Press tab while in compose and autocomplete is not active
  if (App.data.inCompose && !App.autocomplete.active && e.keyCode == 9) {
    e.preventDefault()
    e.stopPropagation()

    App.autocomplete.onKey(e.keyCode, e)
  }

  // Press control keys when autocomlete is active
  if (App.autocomplete.active && ~[13, 38, 40].indexOf(e.keyCode)) {
    e.preventDefault()
    e.stopPropagation()

    App.autocomplete.onKey(e.keyCode)
  }

  // Only prevent propagation as we'll handle escape on keyup
  // because well have to set autocomplete.active as false and it will propagate on keyup
  if (App.autocomplete.active && e.keyCode == 27) {
    e.preventDefault()
    e.stopPropagation()
  }
}

App.autocomplete.onKeyUp = function(e) {
  // Allways prevent tab propagation
  if (App.data.inCompose && e.keyCode == 9) {
      e.preventDefault()
      e.stopPropagation()
  }

  if (App.autocomplete.active) {
    // Just prevent propagation
    if (~[13, 27, 38, 40].indexOf(e.keyCode)) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Escape
    if (e.keyCode == 27) {
      App.autocomplete.onKey(e.keyCode)
    }
  }
}

App.autocomplete.onKey = function(key, e) {
  switch(key) {
    // Tab
    case 9:
      this.checkWord(e)
      console.log($(e.target))
      this.focusNext(e.target)
    break
    // Enter
    case 13:
      this.selectActive()
    break
    // Escape
    case 27:
      this.close()
    break
    // Key up
    case 38:
      this.changeSelection('prev')
    break
    // Key down
    case 40:
      this.changeSelection('next')
    break;
  }
}

App.autocomplete.checkWord = function(e) {

}

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

App.autocomplete.selectActive = function() {

}

App.autocomplete.close = function() {

}

App.autocomplete.changeSelection = function(direction) {

}

