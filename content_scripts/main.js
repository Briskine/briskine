if (typeof GQ == "undefined") var GQ = function(){};

GQ.inCompose = false; // are we in a compose field
GQ.attachedIframe = false; // have we attached events to the edit iframe?
GQ.isContentEditable = false; // are we in a contenteditable element

// Handle plain-text compose
GQ.handlePlainText = function(source, parseWord, resultCallback, updateCallback) {
    var value = source.value;
    var startPosition = 0; // where the word begings so we can replace it
    var endPosition = source.selectionStart;
    var res = GQ.getWord(value, endPosition)
    var word = res[0];
    startPosition = res[1];

    if (word) {
        var params = {
            value: value,
            word: word,
            startPosition: startPosition,
            endPosition: endPosition
        };
        parseWord(params, resultCallback, updateCallback);
    }
};

// Handle old-style iFrame editing - this is used in RichText mode
GQ.handleIframe = function(source, parseWord, resultCallback, updateCallback) {
    var startPosition = 0; // where the word begings so we can replace it
    var iFrameDoc = source.parentNode.parentNode;
    var selection = iFrameDoc.getSelection();
    var base = selection.baseNode;
    var value = base.data;
    var endPosition = selection.baseOffset;

    var res = GQ.getWord(value, endPosition)
    var word = res[0];
    startPosition = res[1];
    if (word) {
        var params = {
            value: value,
            word: word,
            base: base,
            iFrameDoc: iFrameDoc,
            selection: selection,
            startPosition: startPosition,
            endPosition: endPosition,
        };
        parseWord(params, resultCallback, updateCallback); 
    }
}

// New style iFrame editing. Just like the oldstyle, but with no iFrame
GQ.handleNewStyle = function(source, parseWord, resultCallback, updateCallback) {
    var startPosition = 0; // where the word begings so we can replace it
    var selection = document.getSelection();
    var base = selection.baseNode;
    var value = base.data;
    var endPosition = selection.baseOffset;

    var res = GQ.getWord(value, endPosition);
    var word = res[0];
    startPosition = res[1];
    if (word) {
        var params = {
            value: value,
            word: word,
            base: base,
            selection: selection,
            startPosition: startPosition,
            endPosition: endPosition,
        };
        parseWord(params, resultCallback, updateCallback);
    }
}

// Check that we are in an iFrame and attach the correct events to it
GQ.attachEventsToIframe = function(){
    var iframe = document.querySelector('iframe.editable');
    if (!GQ.attachedIframe && iframe) {
        iframe.contentDocument.addEventListener("keydown", GQ.onKeydown, true)
        iframe.contentDocument.addEventListener("keyup", GQ.onKeyup, true)
        iframe.contentDocument.addEventListener("focus", GQ.onFocusCapturePhase, true)
        iframe.contentDocument.addEventListener("blur", GQ.onBlurCapturePhase, true)
        GQ.attachedIframe = true;
    }
}

GQ.onFocusCapturePhase = function(e){
    var focusedEl = e.target;
    if (focusedEl.getAttribute('form') == 'nosend' || // Plaintext
        focusedEl.classList.contains('editable')) {//Richtext
        GQ.inCompose = true;
    }
    GQ.isContentEditable = focusedEl.getAttribute("contenteditable") !== null;
}

GQ.onBlurCapturePhase = function(e){
    var focusedEl = e.target;
    if (!(focusedEl.getAttribute('form') == 'nosend' || // Plaintext
        focusedEl.classList.contains('editable'))) {//Richtext
        GQ.inCompose = false;
    }
    GQ.isContentEditable = focusedEl.getAttribute("contenteditable") !== null;

    GQ.au.remove();
    GQ.attachEventsToIframe();
}

GQ.initializeOnDomReady = function(){
    document.addEventListener("keydown", GQ.onKeydown, true);
    document.addEventListener("keyup", GQ.onKeyup, true)
    document.addEventListener("focus", GQ.onFocusCapturePhase, true);
    document.addEventListener("blur", GQ.onBlurCapturePhase, true);
}

$(document).ready(function(){
    GQ.initializeOnDomReady();
});
