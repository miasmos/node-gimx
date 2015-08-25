var exec = require('child_process').exec;

var gimx = function(opts) {
	if (!opts) opts = {};
	this.remote_port = opts.port || this.log("No port specified.", 2);
	this.remote_host = opts.host || this.log("No host specified.", 2);
	this.path = '"' + opts.path + 'gimx.exe"' || 'gimx';
	this.subscribers = [];
	this.lastPressed = undefined;
	this.log('Init');
}

gimx.prototype.release = function(button) {
	//not usually necessary, all other buttons are released when a press event is sent
	this.normalizedSend(button, 0);
}

gimx.prototype.press = function(button) {
	this.normalizedSend(button);
}

gimx.prototype.normalizedSend = function(button, mod) {
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

gimx.prototype.send = function(button, mod) {
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
	this._exec(this.path+' --event "'+button+'('+mod+')" -d '+this.remote_host+':'+this.remote_port, button, mod);
}

gimx.prototype._exec = function(cmd, btn, mod) {
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


gimx.prototype.log = function(msg, level) {
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

gimx.prototype.on = function(e, cb, context) {
	this.subscribers[e] = this.subscribers[e] || [];
	this.subscribers[e].push({
	    callback: cb,
	    context: context
	});
}

gimx.prototype.off = function(e, context) {
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

gimx.prototype.emit = function(e) {
	var sub, subs, i = 0, args = Array.prototype.slice.call(arguments, 1);
	if ((subs = this.subscribers[e])) {
	    while (i < subs.length) {
	        sub = subs[i];
	        sub.callback.apply(sub.context || this, args);
	        i++;
	    }
	}
}

module.exports = gimx;