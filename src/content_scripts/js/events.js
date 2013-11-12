/*
	PubSub events
*/

PubSub.subscribe('focus', function(action, element, gmailView) {
	if (action === 'on') {
		GQ.data.inCompose = true
		GQ.data.composeElement = element
		GQ.data.gmailView = gmailView
	} else if (action === 'off') {
		// Disable only focused areas
		if (GQ.data.composeElement == element) {
			GQ.data.inCompose = false
			GQ.data.composeElement = null
			GQ.data.gmailView = ''
		}
	}
})

/*
	Events handling
*/

GQ.onKeyup = function(e) {
	// console.log(e)
}

GQ.onKeydown = function(e) {
	// console.log(e)
}

GQ.onFocus = function(e) {
	var target = e.target

	// Disable any focus as there may be only one focus on a page
	PubSub.publish('focus', 'off', target)

	// Check if it is the compose element
	if (target.type === 'textarea' && target.getAttribute('name') === 'body') {
		PubSub.publish('focus', 'on', target, 'basic html')
	} else if (target.classList.contains('editable') && target.getAttribute('contenteditable')) {
		PubSub.publish('focus', 'on', target, 'standard')
	}
}

GQ.onBlur = function(e) {
	PubSub.publish('focus', 'off', e.target)
}
