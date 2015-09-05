var messenger = require('./messenger');
var exec = require('child_process').exec;

//TODO support for multiple presses in one press/release call, ex. press('up,down') or press('up down')
//TODO support for checking if a macro is running

class gimx extends messenger {
	constructor(opts={}) {
		super();
		let self = this;
		this.debug = opts.debug || false;
		this.remote_port = opts.port || this.debug || this.log("No port specified.", 2);
		this.remote_host = opts.host || this.debug || this.log("No host specified.", 2);
		this.path = opts.path ? '"' + opts.path + 'gimx.exe"' : 'gimx';

		this.macros = {};
		this.timeline = {};
		this.timelineIntervals = [];

		this.tempChain = [];
		this._hasChained = false;

		this.globalTime = 0;
		this.currentTimelineIndex = 0;
		this.intervalTime = 10;
		this.globalCallback = setInterval(function(){self._tick()}, this.intervalTime);
		this.repeat = false;
		this.log('Init');
	}

	press(button, mod) {
		if (this._hasChained) {
			this.tempChain.push(['press', button, mod]);
		} else {
			this._normalizedSend([{button: button, mod: mod}]);
		}
		return this;
	}

	hold(button, mod) {
		if (this._hasChained) {
			this.tempChain.push(['hold', button]);
		} else {
			this._normalizedSend([{button: button, mod: mod}]);
		}
		return this;
	}

	release(button) {
		if (this._hasChained) {
			this.tempChain.push(['release', button]);
		} else {
			this._normalizedSend([{button: button, mod: 0}]);
		}
		return this;
	}

	wait(time) {
		if (this._hasChained) {
			this.tempChain.push(['wait', time]);
		} else {
			//nothing
		}
		return this;
	}

	macro(name) {
		this.tempChain.push(['macro', name]);
		this._hasChained = true;
		return this;
	}

	stop() {
		this.log('Stopping all macros');
		this._reset();
	}

	add() {
		this._hasChained = false;
		if (this.tempChain[0][0] !== 'macro' || this.tempChain.length <= 1) return;

		//remove the macro call
		var macroName = this.tempChain[0][1];
		this.tempChain.splice(0, 1);

		//parse macro sequence
		for (var i in this.tempChain) {
			let action = this.tempChain[i][0];
			let value1 = this.tempChain[i][1];
			let value2 = this.tempChain[i][2];

			if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
				this.log(`Invalid button '${value1}' found in macro ${macroName}.${action}()`, 2);
			}
		}
		this.macros[macroName] = this.tempChain;
		this.tempChain = [];
		this.log(`Added macro ${macroName} successfully`)
	}

	run(repeat = false) {
		var self = this;
		this._reset();
		this._hasChained = false;
		if (this.tempChain[0][0] !== 'macro' || this.tempChain.length < 1) return;
		var macroName = this.tempChain[0][1];
		this.repeat = repeat;

		this.log(`Running macro ${macroName}`);
		// console.log(this.macros);

		//parse macro sequence
		for (var i in this.tempChain) {
			let action = this.tempChain[i][0];
			let value1 = this.tempChain[i][1];
			let value2 = this.tempChain[i][2];

			if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
				this.log(`Invalid button '${value1}' found in macro ${macroName}.${action}()`, 2);
			}
		}

		parseMacro(this.tempChain, macroName);
		let lastButton, lastAction;

		function parseMacro(macro, name) {
			let curMacroName = macro[0][1];

			for (var i in macro) {
				let action = macro[i][0];
				let value1 = macro[i][1];
				let value2 = macro[i][2];
				let lastIndex = i == macro.length;
				let macroCompleted = self._isValidMacro(name) && lastIndex ? name : undefined;

				if (action == 'macro') {
					if (!(value1 in self.macros)) {
						self.log(`Invalid macro ${value1} found in macro ${macroName}`, 2);
					}
					parseMacro(self.macros[value1], curMacroName);
				}

				if (action == 'wait') {
					self.globalTime += value1;
					continue;
				} else if (action == 'macro') {
					continue;
				}

				//release a button after a short time
				if ((action == 'release' && lastAction == 'press' && value1 != lastButton) || (action !== 'release' && lastAction == 'press')) {
					let key = {
						action: 'release',
						value1: lastButton,
						value2: value2,
						complete: macroCompleted
					};

					let tempTime = self.timelineIntervals[self.timelineIntervals.length-1] + 10;

					if (tempTime in self.timeline) {
						self.timeline[tempTime].push(key);
					} else {
						self.timeline[tempTime] = [key];
						self.timelineIntervals.push(tempTime);
					}
				}

				let key = {
					action: action,
					value1: value1,
					value2: value2,
					complete: macroCompleted
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
		let lastIndex = this.timeline[this.timelineIntervals[this.timelineIntervals.length-1]];
		lastIndex = lastIndex[lastIndex.length-1];

		if (lastIndex.action == 'press') {
			let key = {
				action: 'release',
				value1: lastIndex.value1,
				value2: undefined
			}

			self.globalTime += 10;
			self.timeline[self.globalTime] = [key];
			self.timelineIntervals.push(self.globalTime);
		}

		console.log(this.timeline);
		// console.log(this.timelineIntervals);
		this.globalTotalTime = this.globalTime;
		this.globalTime = 0;
	}

	_normalizedSend(buttons) {
		for (var i in buttons) {
			let mod = buttons[i].mod;
			let button = buttons[i].button;

			if (typeof mod === 'undefined') mod = 1;
			if (mod < 0 && mod > 1) {
				this.log('Normalized send requires a mod between 0 and 1, ignoring', 1);
				return;
			}
			if (button == 'lstick x' || button == 'lstick y' || button == 'rstick x' || button == 'rstick y') {
				mod *= 255; mod -= 128;
			} else if (button == 'acc x' || button == 'acc y' || button == 'acc z' || button == 'gyro') {
				mod *= 511; mod -= 256;
			} else if (button == 'select' || button == 'start' || button == 'PS' || button == 'l3' || button == 'r3') {
				if (mod < 1) mod = 0;
				else mod = 255;
			} else if (button == 'up' || button == 'right' || button == 'down' || button == 'left' || button == 'triangle' || button == 'circle' || 
				button == 'cross' || button == 'square' || button == 'l1' || button == 'r1' || button == 'l2' || button == 'r2') {
				mod *= 255;
			}

			buttons[i].mod = mod;
		}

		this._send(buttons);
	}

	_send(buttons) {
		let eventString = '';

		for (var i in buttons) {
			let button = buttons[i].button;
			let mod = buttons[i].mod;
			let lo, hi, range = true;

			if (button == 'lstick x' || button == 'lstick y' || button == 'rstick x' || button == 'rstick y') {
				lo = -128; hi = 127;
			} else if (button == 'acc x' || button == 'acc y' || button == 'acc z' || button == 'gyro') {
				lo = -512; hi = 511;
			} else if (button == 'select' || button == 'start' || button == 'PS' || button == 'l3' || button == 'r3') {
				lo = 0; hi = 255; range = false;
			} else if (button == 'up' || button == 'right' || button == 'down' || button == 'left' || button == 'triangle' || button == 'circle' || 
				button == 'cross' || button == 'square' || button == 'l1' || button == 'r1' || button == 'l2' || button == 'r2') {
				lo = 0; hi = 255;
			} else {
				this.log(`Button ${button} not recognized, ignoring`, 1);
				return;
			}

			if (range) {
				if (!(mod >= lo && mod <= hi)) {
					this.log(`${button} has a range of ${lo} to ${hi}, given ${mod}, ignoring`, 1);
					return;
				}
			} else {
				if (mod != lo && mod != hi) {
					this.log(`${button} must be either ${lo} or ${hi}, given ${mod}, ignoring`, 1);
					return;
				}
			}

			eventString += `--event "${button}(${mod})" `;
		}

		if (!this.debug) {
			this._exec(`${this.path} ${eventString}-d ${this.remote_host}:${this.remote_port}`);
		} else {
			this.log(`${this.globalTime}: ${this.path} ${eventString}-d ${this.remote_host}:${this.remote_port}`);
		}
	}

	_tick() {
		if (this.globalTime >= this.timelineIntervals[this.currentTimelineIndex]) {
			var index = this.timelineIntervals[this.currentTimelineIndex].toString();

			let temp = [];
			for (var i in this.timeline[index]) {
				temp.push({
					button: this.timeline[index][i]['value1'],
					mod: this.timeline[index][i]['action'] == 'release' ? 0 : this.timeline[index][i]['value2']
				});

				let complete = this.timeline[index][i].complete;
				if (this.timeline[index][i].complete) this.emit('completed-macro-'+complete);
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
				this._reset();
			}
		}
		this.globalTime += this.intervalTime;
	}

	_exec(cmd) {
		var self = this;
		exec(cmd, function(e, out, err) {
			if (e || err) {
				self.emit('sendfailure');
				self.log(e || err, 2);
			}

			self.emit('sendsuccess');
			self.log(`${self.globalTime}: ${cmd}`);
		});
	}

	_reset() {
		this.timeline = {};
		this.timelineIntervals = [];
		this.globalTime = 0;
		this.currentTimelineIndex = 0;
	}

	log(msg, level) {
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

		if (level == "ERROR") throw "gimx-node: "+msg;
		console.log(level ? "gimx-node: "+ level + " " + msg : "gimx-node: " + msg);
	}

	_isValidButton(button) {
		let buttons = ['lstick x', 'lstick y', 'rstick x', 'rstick y', 
			'acc x', 'acc y', 'acc z', 'gyro', 'select', 'start', 'PS', 'l3', 'r3',
			'up', 'right', 'down', 'left', 'triangle', 'circle', 'cross', 'square', 'l1', 
			'r1', 'l2', 'r2'];
		return buttons.indexOf(button) > -1;
	}

	_isValidMacro(name) {
		for (var i in this.macros) {
			if (name == i) {
				return true;
			}
		}
		return false;
	}
	
	_hasMultipleButtons(buttons, pressed=true) {
		let temp;
		let ret = [];
		if (buttons.indexOf(',') > -1) temp = buttons.split(',');
		else if (buttons.indexOf(' ') > -1) temp = buttons.split(' ');
		else return false;

		for (var i in temp) {
			ret.push({
				button: temp[i],
				mod: pressed ? 1 : 0
			});
		}
	}
}

module.exports = gimx;