"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var messenger = (function () {
	function messenger() {
		_classCallCheck(this, messenger);

		this.subscribers = [];
	}

	_createClass(messenger, [{
		key: "on",
		value: function on(e, cb, context) {
			this.subscribers[e] = this.subscribers[e] || [];
			this.subscribers[e].push({
				callback: cb,
				context: context
			});
		}
	}, {
		key: "off",
		value: function off(e, context) {
			var i, subs, sub;
			if (subs = this.subscribers[e]) {
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
	}, {
		key: "emit",
		value: function emit(e) {
			var sub,
			    subs,
			    i = 0,
			    args = Array.prototype.slice.call(arguments, 1);
			if (subs = this.subscribers[e]) {
				while (i < subs.length) {
					sub = subs[i];
					sub.callback.apply(sub.context || this, args);
					i++;
				}
			}
		}
	}]);

	return messenger;
})();

module.exports = messenger;