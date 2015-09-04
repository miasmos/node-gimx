var messenger = require('./messenger');
var exec = require('child_process').exec;

//TODO support for multiple presses in one press/release call, ex. press('up,down') or press('up down')
//TODO combine multiple presses at the same time into the same exec call
//TODO support for emitting events when a macro completes
//TODO implicit release on button presses after a short time? (would rather press a button than hold it down most of the time)
//TODO release a button if used in succession and release isn't called
class gimx extends messenger {
	constructor(opts={}) {
		super();
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

	press(button, mod) {
		if (this._hasChained) {
			this.tempChain.push(['press', button, mod]);
		} else {
			this.normalizedSend(button, mod);
		}
		return this;
	}

	release(button) {
		if (this._hasChained) {
			this.tempChain.push(['release', button]);
		} else {
			this.normalizedSend(button, 0);
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

			if ((action == 'press' || action == 'release') && !this._isValidButton(value1)) {
				this.log(`Invalid button '${value1}' found in macro ${macroName}.${action}()`, 2);
			}
		}
		this.macros[macroName] = this.tempChain;
		this.tempChain = [];
		console.log(this.macros);
	}

	run(repeat = false) {
		var self = this;
		this._hasChained = false;
		if (this.tempChain[0][0] !== 'macro' || this.tempChain.length < 1) return;
		var macroName = this.tempChain[0][1];
		this.repeat = repeat;

		//parse macro sequence
		for (var i in this.tempChain) {
			let action = this.tempChain[i][0];
			let value1 = this.tempChain[i][1];
			let value2 = this.tempChain[i][2];

			if ((action == 'press' || action == 'release') && !this._isValidButton(value1)) {
				this.log(`Invalid button '${value1}' found in macro ${macroName}.${action}()`, 2);
			}
		}

		parseMacro(this.tempChain);

		function parseMacro(macro) {
			for (var i in macro) {
				let action = macro[i][0];
				let value1 = macro[i][1];
				let value2 = macro[i][2];

				if (action == 'macro') {
					if (!(value1 in self.macros)) {
						self.log(`Invalid macro ${value1} found in macro ${macroName}`, 2);
					}
					parseMacro(self.macros[value1]);
				}

				if (action == 'wait') {
					self.globalTime += value1;
					continue;
				} else if (action == 'macro') {
					continue;
				}

				let key = {
					action: action,
					value1: value1,
					value2: value2,
				};

				if (self.globalTime in self.timeline) {
					self.timeline[self.globalTime].push(key);
				} else {
					self.timeline[self.globalTime] = [key];
					self.timelineIntervals.push(self.globalTime);
				}
			}
		}

		console.log(this.timeline);
		console.log(this.timelineIntervals);
		this.globalTotalTime = this.globalTime;
		this.globalTime = 0;
		this.globalCallback = setInterval(function(){self._tick()}, this.intervalTime);
	}

	normalizedSend(button, mod) {
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

		this.send(button, mod);
	}

	send(button, mod) {
		var lo, hi, range = true;
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
			this.log('Button '+button+' not recognized, ignoring', 1);
			return;
		}

		if (range) {
			if (!(mod >= lo && mod <= hi)) {
				this.log(button+' has a range of '+lo+' to '+hi+', given '+mod+', ignoring', 1);
				return;
			}
		} else {
			if (mod != lo && mod != hi) {
				this.log(button+'must be either '+lo+' or '+hi+', given '+mod+', ignoring', 1);
				return;
			}
		}

		this.lastPressed = button;
		if (!this.debug) {
			this._exec(`${this.path} --event "${button}(${mod})" -d ${this.remote_host}:${this.remote_port}`, button, mod);
		} else {
			this.log(`${this.globalTime}: sent ${button}(${mod})`)
		}
	}

	_isValidButton(button) {
		let buttons = ['lstick x', 'lstick y', 'rstick x', 'rstick y', 
			'acc x', 'acc y', 'acc z', 'gyro', 'select', 'start', 'PS', 'l3', 'r3',
			'up', 'right', 'down', 'left', 'triangle', 'circle', 'cross', 'square', 'l1', 
			'r1', 'l2', 'r2'];
		return buttons.indexOf(button) > -1;
	}

	_tick() {
		if (this.globalTime >= this.timelineIntervals[this.currentTimelineIndex]) {
			var index = this.timelineIntervals[this.currentTimelineIndex].toString();

			for (var i in this.timeline[index]) {
				let action = this.timeline[index][i]['action'];
				let value1 = this.timeline[index][i]['value1'];
				let value2 = this.timeline[index][i]['value2'];

				switch(action) {
					case 'press':
						this.press(value1, value2);
						break;
					case 'release':
						this.release(value1);
						break;
				}
			}

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

	_exec(cmd, btn, mod) {
		var self = this;
		exec(cmd, function(e, out, err) {
			if (e || err) {
				self.emit('sendfailure');
				self.log(e || err, 2);
			}

			self.log('Sent '+btn+'('+mod+') successfully.');
			self.emit('sendsuccess');
		});
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
}

module.exports = gimx;