'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x5, _x6, _x7) { var _again = true; _function: while (_again) { var object = _x5, property = _x6, receiver = _x7; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x5 = parent; _x6 = property; _x7 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var messenger = require('./messenger');
var exec = require('child_process').exec;

//TODO support for multiple presses in one press/release call, ex. press('up,down') or press('up down')
//TODO support for checking if a macro is running

var gimx = (function (_messenger) {
	_inherits(gimx, _messenger);

	function gimx() {
		var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

		_classCallCheck(this, gimx);

		_get(Object.getPrototypeOf(gimx.prototype), 'constructor', this).call(this);
		var self = this;
		this.debug = opts.debug || false;
		this.remote_port = opts.port || this.debug || this.log("No port specified.", 2);
		this.remote_host = opts.host || this.debug || this.log("No host specified.", 2);
		this.path = opts.path ? '"' + opts.path + 'gimx.exe"' : 'gimx';

		this.macros = {};
		this.timeline = {};
		this.macroStates = {};
		this.timelineIntervals = [];

		this.tempChain = [];
		this._hasChained = false;

		this.globalTime = 0;
		this.currentTimelineIndex = 0;
		this.intervalTime = 10;
		this.globalCallback = setInterval(function () {
			self._tick();
		}, this.intervalTime);
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
		key: 'stop',
		value: function stop() {
			this.log(this.globalTime / 1000 + 's: Stopping all macros');
			this._reset();
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
			this.log('Added macro ' + macroName + ' successfully');
		}
	}, {
		key: 'isRunning',
		value: function isRunning(name) {
			this.log('Not yet implemented', 2);
		}
	}, {
		key: 'run',
		value: function run() {
			var repeat = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

			var self = this;
			this._reset();
			this._hasChained = false;
			if (this.tempChain[0][0] !== 'macro' || this.tempChain.length < 1) return;
			var macroName = this.tempChain[0][1];
			this.repeat = repeat;

			//parse macro sequence
			for (var i in this.tempChain) {
				var action = this.tempChain[i][0];
				var value1 = this.tempChain[i][1];
				var value2 = this.tempChain[i][2];

				if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
					this.log('Invalid button \'' + value1 + '\' found in macro ' + macroName + '.' + action + '()', 2);
				}
			}

			var lastButton = undefined,
			    lastAction = undefined;
			parseMacro(this.tempChain, macroName);

			function parseMacro(macro, name) {
				var level = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

				for (var i in macro) {
					var action = macro[i][0];
					var value1 = macro[i][1];
					var value2 = macro[i][2];
					var _lastIndex = i == macro.length - 1;
					var firstIndex = i == 0;

					//keep track of macro states in timeline
					var macroCompleted = undefined,
					    macroStarted = undefined;
					macroCompleted = self._isValidMacro(name) && _lastIndex ? name : undefined;
					macroStarted = self._isValidMacro(name) && firstIndex ? name : undefined;

					if (macroCompleted) {
						if (!(self.globalTime in self.macroStates)) {
							self.macroStates[self.globalTime] = { started: [], completed: [] };
						}
						if (self.macroStates[self.globalTime]['completed'].indexOf(macroCompleted) == -1) self.macroStates[self.globalTime]['completed'].push(macroCompleted);
					}
					if (macroStarted) {
						if (!(self.globalTime in self.macroStates)) self.macroStates[self.globalTime] = { started: [], completed: [] };
						if (self.macroStates[self.globalTime]['started'].indexOf(macroStarted) == -1) self.macroStates[self.globalTime]['started'].push(macroStarted);
					}

					if (action == 'macro') {
						if (!(value1 in self.macros)) {
							self.log('Invalid macro ' + value1 + ' found in macro ' + macroName, 2);
						}
						parseMacro(self.macros[value1], value1, level + 1);
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

			//remove outer-most macro from 0th macrostate index
			this.macroStates['0']['completed'].splice(0, 1);

			// console.log(this.timeline);
			// console.log(this.macroStates);
			// console.log(this.timelineIntervals);
			this.globalTotalTime = this.globalTime;
			this.globalTime = 0;
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

			this.log(this.globalTime / 1000 + 's: Sending ' + stringifyButtons(buttons));
			this._exec(this.path + ' ' + eventString + '-d ' + this.remote_host + ':' + this.remote_port);

			function stringifyButtons(b) {
				var ret = '';for (var i in b) {
					ret += b[i].button + '(' + b[i].mod + '), ';
				};return ret.substring(0, ret.length - 2);
			}
		}
	}, {
		key: '_tick',
		value: function _tick() {
			if (this.globalTime >= this.timelineIntervals[this.currentTimelineIndex]) {
				var index = this.timelineIntervals[this.currentTimelineIndex].toString();

				//construct send command
				var temp = [];
				for (var i in this.timeline[index]) {
					temp.push({
						button: this.timeline[index][i]['value1'],
						mod: this.timeline[index][i]['action'] == 'release' ? 0 : this.timeline[index][i]['value2']
					});
				}

				//emit macro start/complete events
				if (index in this.macroStates) {
					for (var j in this.macroStates[index]['started']) {
						var _name = this.macroStates[index]['started'][j];
						this.emit('started-macro-' + _name);
						this.log(this.globalTime / 1000 + 's: Started macro ' + _name);
					}

					for (var j in this.macroStates[index]['completed']) {
						var _name2 = this.macroStates[index]['completed'][j];
						this.emit('completed-macro-' + _name2);
						this.log(this.globalTime / 1000 + 's: Completed macro ' + _name2);
					}
				}

				this._normalizedSend(temp);
				this.currentTimelineIndex++;
			}

			//reached end of top-level macro
			if (this.globalTime >= this.globalTotalTime) {
				if (this.repeat) {
					this.globalTime = 0;
					this.currentTimelineIndex = 0;
					this.log('Reached end of top-level macro, repeating');
					this.emit('repeated-macro');
					return;
				} else {
					this._reset();
				}
			}
			this.globalTime += this.intervalTime;
		}
	}, {
		key: '_exec',
		value: function _exec(cmd) {
			var self = this;

			if (!this.debug) {
				exec(cmd, function (e, out, err) {
					if (e || err) {
						self.emit('sendfailure');
						self.log(e || err, 2);
					}

					self.emit('sendsuccess');
				});
			}
		}
	}, {
		key: '_reset',
		value: function _reset() {
			this.timeline = {};
			this.timelineIntervals = [];
			this.macroStates = {};1;
			this.globalTime = 0;
			this.currentTimelineIndex = 0;
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
	}, {
		key: '_isValidButton',
		value: function _isValidButton(button) {
			var buttons = ['lstick x', 'lstick y', 'rstick x', 'rstick y', 'acc x', 'acc y', 'acc z', 'gyro', 'select', 'start', 'PS', 'l3', 'r3', 'up', 'right', 'down', 'left', 'triangle', 'circle', 'cross', 'square', 'l1', 'r1', 'l2', 'r2'];
			return buttons.indexOf(button) > -1;
		}
	}, {
		key: '_isValidMacro',
		value: function _isValidMacro(name) {
			for (var i in this.macros) {
				if (name == i) {
					return true;
				}
			}
			return false;
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
	}]);

	return gimx;
})(messenger);

module.exports = gimx;