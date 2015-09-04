var gimx = require('./build/main.js');
var g = new gimx({
	path: 'C:\\Program Files\\GIMX\\',
	host: '127.0.0.1',
	port: '51913',
	debug: true
});

/*g.on('sendsuccess', function() {
	console.log('yay!');
});

g.on('sendfailure', function() {
	console.log('aww');
});

g.press('left');*/

g.macro('left')
	.press('left').wait(200).release('left')
	.add();

g.macro('cross')
	.press('cross').wait(200).release('cross')
	.add();

g.macro('restartapp')
	.press('PS').wait(2000)
	.press('cross').wait(100).release('cross').wait(1000)
	.press('cross').wait(100).release('cross').wait(2500)
	.press('cross')
	.add();

g.macro('restartapp').wait(100).macro('left').macro('left').macro('cross').run();