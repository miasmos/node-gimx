class messenger	{
	constructor() {
		this.subscribers = [];
	}
	
	on(e, cb, context) {
		this.subscribers[e] = this.subscribers[e] || [];
		this.subscribers[e].push({
		    callback: cb,
		    context: context
		});
	}

	off(e, context) {
		var i, subs, sub;
		if ((subs = this.subscribers[e])) {
		  i = subs.length - 1;
		  while (i >= 0) {
		      sub = this.subscribers[e][i];
		      if (sub.context === context) {
		          this.subscribers[e].splice(i, 1);
		      }
		      i--;
		  }
		}
	}

	emit(e) {
		var sub, subs, i = 0, args = Array.prototype.slice.call(arguments, 1);
		if ((subs = this.subscribers[e])) {
		    while (i < subs.length) {
		        sub = subs[i];
		        sub.callback.apply(sub.context || this, args);
		        i++;
		    }
		}
	}
}

module.exports = messenger;