var gimx = require('./main.js');
var g = new gimx({
	path: 'C:\\Program Files\\GIMX\\',
	host: '127.0.0.1',
	port: '51914'
});

g.on('sendsuccess', function() {
	console.log('yay!');
});

g.on('sendfailure', function() {
	console.log('aww');
});

g.press('cross');
g.press('lstick x');
g.press('acc x');
g.press('select');

g.release('cross');