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
		this.macroStates = {};
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
		this.log(`${this.globalTime/1000}s: Stopping all macros`);
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

	isRunning(name) {
		this.log('Not yet implemented', 2);
	}

	run(repeat = false) {
		var self = this;
		this._reset();
		this._hasChained = false;
		if (this.tempChain[0][0] !== 'macro' || this.tempChain.length < 1) return;
		var macroName = this.tempChain[0][1];
		this.repeat = repeat;

		//parse macro sequence
		for (var i in this.tempChain) {
			let action = this.tempChain[i][0];
			let value1 = this.tempChain[i][1];
			let value2 = this.tempChain[i][2];

			if ((action == 'press' || action == 'release' || action == 'hold') && !this._isValidButton(value1)) {
				this.log(`Invalid button '${value1}' found in macro ${macroName}.${action}()`, 2);
			}
		}

		let lastButton, lastAction;
		parseMacro(this.tempChain, macroName);

		function parseMacro(macro, name, level=0) {
			for (var i in macro) {
				let action = macro[i][0];
				let value1 = macro[i][1];
				let value2 = macro[i][2];
				let lastIndex = i == macro.length-1;
				let firstIndex = i == 0;

				//keep track of macro states in timeline
				let macroCompleted, macroStarted;
				macroCompleted = self._isValidMacro(name) && lastIndex ? name : undefined;
				macroStarted = self._isValidMacro(name) && firstIndex ? name : undefined;

				if (macroCompleted) {
					if (!(self.globalTime in self.macroStates)) {self.macroStates[self.globalTime] = {started: [], completed: []}}
					if (self.macroStates[self.globalTime]['completed'].indexOf(macroCompleted) == -1) self.macroStates[self.globalTime]['completed'].push(macroCompleted);
				}
				if (macroStarted) {
					if (!(self.globalTime in self.macroStates)) self.macroStates[self.globalTime] = {started: [], completed: []};
					if (self.macroStates[self.globalTime]['started'].indexOf(macroStarted) == -1) self.macroStates[self.globalTime]['started'].push(macroStarted);
				}

				if (action == 'macro') {
					if (!(value1 in self.macros)) {
						self.log(`Invalid macro ${value1} found in macro ${macroName}`, 2);
					}
					parseMacro(self.macros[value1], value1, level+1);
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
						value2: value2
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

		//remove outer-most macro from 0th macrostate index
		this.macroStates['0']['completed'].splice(0, 1);

		// console.log(this.timeline);
		// console.log(this.macroStates);
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

		this.log(`${this.globalTime/1000}s: Sending ${stringifyButtons(buttons)}`);
		this._exec(`${this.path} ${eventString}-d ${this.remote_host}:${this.remote_port}`);

		function stringifyButtons(b) {
			let ret = ''; for (var i in b) {ret += b[i].button + '(' + b[i].mod + '), '}; return ret.substring(0, ret.length-2);
		}
	}

	_tick() {
		if (this.globalTime >= this.timelineIntervals[this.currentTimelineIndex]) {
			var index = this.timelineIntervals[this.currentTimelineIndex].toString();

			//construct send command
			let temp = [];
			for (var i in this.timeline[index]) {
				temp.push({
					button: this.timeline[index][i]['value1'],
					mod: this.timeline[index][i]['action'] == 'release' ? 0 : this.timeline[index][i]['value2']
				});
			}

			//emit macro start/complete events
			if (index in this.macroStates) {
				for (var j in this.macroStates[index]['started']) {
					let name = this.macroStates[index]['started'][j];
					this.emit('started-macro-'+name);
					this.log(`${this.globalTime/1000}s: Started macro ${name}`);
				}

				for (var j in this.macroStates[index]['completed']) {
					let name = this.macroStates[index]['completed'][j];
					this.emit('completed-macro-'+name);
					this.log(`${this.globalTime/1000}s: Completed macro ${name}`);
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
				this.emit('repeating-macro');
				return;
			} else {
				this._reset();
			}
		}
		this.globalTime += this.intervalTime;
	}

	_exec(cmd) {
		var self = this;

		if (!this.debug) {
			exec(cmd, function(e, out, err) {
				if (e || err) {
					self.emit('sendfailure');
					self.log(e || err, 2);
				}

				self.emit('sendsuccess');
			});
		}
	}

	_reset() {
		this.timeline = {};
		this.timelineIntervals = [];
		this.macroStates = {};1
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