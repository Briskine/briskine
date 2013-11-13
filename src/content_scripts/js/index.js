/*
  This is the index file which is loaded first after patterns
  All declarations are done here
*/

var App = {
  data: {
    inCompose: false      // true when textarea element is focused
  , composeElement: null  // reference to compose DOM element
  , gmailView: ''         // it may be standard or basic html
  }
, autocomplete: {
    active: false
  }
}

App.init = function() {
  document.addEventListener("blur", App.onBlur, true)
  document.addEventListener("focus", App.onFocus, true)
  document.addEventListener("keydown", App.onKeyDown, true)
  document.addEventListener("keyup", App.onKeyUp, true)
}

$(function(){
  App.init()
})
