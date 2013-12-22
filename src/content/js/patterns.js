/*
 * Patterns
 *
 */

// Observer pattern
var PubSub = {
    observers: [],
    subscribe: function(topic, observer) {
        if (!this.observers[topic]) {
            this.observers[topic] = [];
        }
        this.observers[topic].push(observer);
    },
    unsubscribe: function(topic, observer) {
        if (!this.observers[topic]){
            return;
        }

        var index = this.observers[topic].indexOf(observer);
        if (~index) {
            this.observers[topic].splice(index, 1);
        }
    },
    publish: function(topic) {
        if (!this.observers[topic]) {
            return;
        }

        for (var i = this.observers[topic].length - 1; i >= 0; i--) {
            // Pass all arguments except first one
            this.observers[topic][i].apply(null, Array.prototype.slice.call(arguments, 1));
        }
    }
};
