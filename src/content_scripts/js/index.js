/*
  This is the index file which is loaded first after patterns
  All declarations are done here
*/

var GQ = {
  data: {
    inCompose: false      // true when textarea element is focused
  , composeElement: null  // reference to compose DOM element
  , gmailView: ''         // it may be standard or basic HTML
  }
}

GQ.init = function() {
  document.addEventListener("keydown", GQ.onKeydown, true);
  document.addEventListener("keyup", GQ.onKeyup, true)
  document.addEventListener("blur", GQ.onBlur, true);
  document.addEventListener("focus", GQ.onFocus, true);
}

$(function(){
  GQ.init()
})
