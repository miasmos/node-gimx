'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var messenger = require('./messenger');
var exec = require('child_process').exec;

//TODO support for multiple presses in one press/release call, ex. press('up,down') or press('up down')
//TODO support for emitting events when a macro completes

var gimx = (function (_messenger) {
	_inherits(gimx, _messenger);

	function gimx() {
		var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, gimx);

		_get(Object.getPrototypeOf(gimx.prototype), 'constructor', this).call(this);
		this.debug = opts.debug || false;
		this.remote_port = opts.port || this.log("No port specified.", 2);
		this.remote_host = opts.host || this.log("No host specified.", 2);
		this.path = '"' + opts.path + 'gimx.exe"' || 'gimx';

		this.macros = {};
		this.timeline = {};
		this.timelineIntervals = [];

		this.tempChain = [];
		this._hasChained = false;

		this.globalTime = 0;
		this.currentTimelineIndex = 0;
		this.intervalTime = 10;
		this.globalCallback;
		this.repeat = false;
		this.log('Init');
	}

	_createClass(gimx, [{
		key: 'press',
		value: function press(button, mod) {
			if (this._hasChained) {
				this.tempChain.push(['press', button, mod]);
			} else {
				this._normalizedSend([{ button: button, mod: mod }]);
			}
			return this;
		}
	}, {
		key: 'hold',
		value: function hold(button, mod) {
			if (this._hasChained) {
				this.tempChain.push(['hold', button]);
			} else {
				this._normalizedSend([{ button: button, mod: mod }]);
			}
			return this;
		}
	}, {
		key: 'release',
		value: function release(button) {
			if (this._hasChained) {
				this.tempChain.push(['release', button]);
			} else {
				this._normalizedSend([{ button: button, mod: 0 }]);
			}
			return this;
		}
	}, {
		key: 'wait',
		value: function wait(time) {
			if (this._hasChained) {
				this.tempChain.push(['wait', time]);
			} else {
				//nothing
			}
			return this;
		}
	}, {
		key: 'macro',
		value: function macro(name) {
			this.tempChain.push(['macro', name]);
			this._hasChained = true;
			return this;
		}
	}, {
		key: 'add',
		value: function add() {
			this._hasChained = false;
			if (this.tempChain[0][0] !== 'macro' || this.tempChain.length <= 1) return;

			//remove the macro call
			var macroName = this.tempChain[0][1];
			this.tempChain.splice(0, 1);

			//parse macro sequence
			for (var i in this.tempChain) {
				var action = this.tempChain[i][0];
				var value1 = this.tempChain[i][1];
				var value2 = this.tempChain[i][2];

				if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
					this.log('Invalid button \'' + value1 + '\' found in macro ' + macroName + '.' + action + '()', 2);
				}
			}
			this.macros[macroName] = this.tempChain;
			this.tempChain = [];
		}
	}, {
		key: 'run',
		value: function run() {
			var repeat = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

			var self = this;
			this._hasChained = false;
			if (this.tempChain[0][0] !== 'macro' || this.tempChain.length < 1) return;
			var macroName = this.tempChain[0][1];
			this.repeat = repeat;

			console.log(this.macros);

			//parse macro sequence
			for (var i in this.tempChain) {
				var action = this.tempChain[i][0];
				var value1 = this.tempChain[i][1];
				var value2 = this.tempChain[i][2];

				if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
					this.log('Invalid button \'' + value1 + '\' found in macro ' + macroName + '.' + action + '()', 2);
				}
			}

			parseMacro(this.tempChain);
			var lastButton = undefined,
			    lastAction = undefined;

			function parseMacro(macro) {
				for (var i in macro) {
					var action = macro[i][0];
					var value1 = macro[i][1];
					var value2 = macro[i][2];

					if (action == 'macro') {
						if (!(value1 in self.macros)) {
							self.log('Invalid macro ' + value1 + ' found in macro ' + macroName, 2);
						}
						parseMacro(self.macros[value1]);
					}

					if (action == 'wait') {
						self.globalTime += value1;
						continue;
					} else if (action == 'macro') {
						continue;
					}

					//release a button after a short time
					if (action == 'release' && lastAction == 'press' && value1 != lastButton || action !== 'release' && lastAction == 'press') {
						var _key = {
							action: 'release',
							value1: lastButton,
							value2: value2
						};

						var tempTime = self.timelineIntervals[self.timelineIntervals.length - 1] + 10;

						if (tempTime in self.timeline) {
							self.timeline[tempTime].push(_key);
						} else {
							self.timeline[tempTime] = [_key];
							self.timelineIntervals.push(tempTime);
						}
					}

					var key = {
						action: action,
						value1: value1,
						value2: value2
					};
					lastButton = value1;
					lastAction = action;

					if (self.globalTime in self.timeline) {
						self.timeline[self.globalTime].push(key);
					} else {
						self.timeline[self.globalTime] = [key];
						self.timelineIntervals.push(self.globalTime);
					}
				}
			}

			//if the very last action is a press, add a release
			var lastIndex = this.timeline[this.timelineIntervals[this.timelineIntervals.length - 1]];
			lastIndex = lastIndex[lastIndex.length - 1];

			if (lastIndex.action == 'press') {
				var key = {
					action: 'release',
					value1: lastIndex.value1,
					value2: undefined
				};

				self.globalTime += 10;
				self.timeline[self.globalTime] = [key];
				self.timelineIntervals.push(self.globalTime);
			}

			console.log(this.timeline);
			console.log(this.timelineIntervals);
			this.globalTotalTime = this.globalTime;
			this.globalTime = 0;
			this.globalCallback = setInterval(function () {
				self._tick();
			}, this.intervalTime);
		}
	}, {
		key: '_normalizedSend',
		value: function _normalizedSend(buttons) {
			for (var i in buttons) {
				var mod = buttons[i].mod;
				var button = buttons[i].button;

				if (typeof mod === 'undefined') mod = 1;
				if (mod < 0 && mod > 1) {
					this.log('Normalized send requires a mod between 0 and 1, ignoring', 1);
					return;
				}
				if (button == 'lstick x' || button == 'lstick y' || button == 'rstick x' || button == 'rstick y') {
					mod *= 255;mod -= 128;
				} else if (button == 'acc x' || button == 'acc y' || button == 'acc z' || button == 'gyro') {
					mod *= 511;mod -= 256;
				} else if (button == 'select' || button == 'start' || button == 'PS' || button == 'l3' || button == 'r3') {
					if (mod < 1) mod = 0;else mod = 255;
				} else if (button == 'up' || button == 'right' || button == 'down' || button == 'left' || button == 'triangle' || button == 'circle' || button == 'cross' || button == 'square' || button == 'l1' || button == 'r1' || button == 'l2' || button == 'r2') {
					mod *= 255;
				}

				buttons[i].mod = mod;
			}

			this._send(buttons);
		}
	}, {
		key: '_send',
		value: function _send(buttons) {
			var eventString = '';

			for (var i in buttons) {
				var button = buttons[i].button;
				var mod = buttons[i].mod;
				var lo = undefined,
				    hi = undefined,
				    range = true;

				if (button == 'lstick x' || button == 'lstick y' || button == 'rstick x' || button == 'rstick y') {
					lo = -128;hi = 127;
				} else if (button == 'acc x' || button == 'acc y' || button == 'acc z' || button == 'gyro') {
					lo = -512;hi = 511;
				} else if (button == 'select' || button == 'start' || button == 'PS' || button == 'l3' || button == 'r3') {
					lo = 0;hi = 255;range = false;
				} else if (button == 'up' || button == 'right' || button == 'down' || button == 'left' || button == 'triangle' || button == 'circle' || button == 'cross' || button == 'square' || button == 'l1' || button == 'r1' || button == 'l2' || button == 'r2') {
					lo = 0;hi = 255;
				} else {
					this.log('Button ' + button + ' not recognized, ignoring', 1);
					return;
				}

				if (range) {
					if (!(mod >= lo && mod <= hi)) {
						this.log(button + ' has a range of ' + lo + ' to ' + hi + ', given ' + mod + ', ignoring', 1);
						return;
					}
				} else {
					if (mod != lo && mod != hi) {
						this.log(button + ' must be either ' + lo + ' or ' + hi + ', given ' + mod + ', ignoring', 1);
						return;
					}
				}

				eventString += '--event "' + button + '(' + mod + ')" ';
			}

			if (!this.debug) {
				this._exec(this.path + ' ' + eventString + '-d ' + this.remote_host + ':' + this.remote_port);
			} else {
				this.log(this.globalTime + ': ' + this.path + ' ' + eventString + '-d ' + this.remote_host + ':' + this.remote_port);
			}
		}
	}, {
		key: '_isValidButton',
		value: function _isValidButton(button) {
			var buttons = ['lstick x', 'lstick y', 'rstick x', 'rstick y', 'acc x', 'acc y', 'acc z', 'gyro', 'select', 'start', 'PS', 'l3', 'r3', 'up', 'right', 'down', 'left', 'triangle', 'circle', 'cross', 'square', 'l1', 'r1', 'l2', 'r2'];
			return buttons.indexOf(button) > -1;
		}
	}, {
		key: '_tick',
		value: function _tick() {
			if (this.globalTime >= this.timelineIntervals[this.currentTimelineIndex]) {
				var index = this.timelineIntervals[this.currentTimelineIndex].toString();

				var temp = [];
				for (var i in this.timeline[index]) {
					temp.push({
						button: this.timeline[index][i]['value1'],
						mod: this.timeline[index][i]['action'] == 'release' ? 0 : this.timeline[index][i]['value2']
					});
				}

				this._normalizedSend(temp);
				this.currentTimelineIndex++;
			}

			//reached end of top-level macro
			if (this.globalTime >= this.globalTotalTime) {
				if (this.repeat) {
					this.globalTime = 0;
					this.currentTimelineIndex = 0;
					this.log('repeating');
					this.emit('repeat');
					return;
				} else {
					clearInterval(this.globalCallback);
					this.log('done');
				}
			}
			this.globalTime += this.intervalTime;
		}
	}, {
		key: '_hasMultipleButtons',
		value: function _hasMultipleButtons(buttons) {
			var pressed = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

			var temp = undefined;
			var ret = [];
			if (buttons.indexOf(',') > -1) temp = buttons.split(',');else if (buttons.indexOf(' ') > -1) temp = buttons.split(' ');else return false;

			for (var i in temp) {
				ret.push({
					button: temp[i],
					mod: pressed ? 1 : 0
				});
			}
		}
	}, {
		key: '_exec',
		value: function _exec(cmd) {
			var self = this;
			exec(cmd, function (e, out, err) {
				if (e || err) {
					self.emit('sendfailure');
					self.log(e || err, 2);
				}

				self.emit('sendsuccess');
				self.log(self.globalTime + ': ' + cmd);
			});
		}
	}, {
		key: 'log',
		value: function log(msg, level) {
			switch (level) {
				case 1:
					level = "WARNING";
					break;
				case 2:
					level = "ERROR";
					break;
				default:
					level = false;
					break;
			}

			if (level == "ERROR") throw "gimx-node: " + msg;
			console.log(level ? "gimx-node: " + level + " " + msg : "gimx-node: " + msg);
		}
	}]);

	return gimx;
})(messenger);

module.exports = gimx;