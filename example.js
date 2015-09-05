var gimx = require('./build/main.js');
var g = new gimx({
	path: 'C:\\Program Files\\GIMX\\',
	host: '127.0.0.1',
	port: '51913',
	debug: true
});

g.on('completed-macro-test', function() {
	console.log('test complete');
});

g.on('started-macro-test', function() {
	console.log('test started');
});

g.macro('leftright')
	.press('left').press('right').wait(200)
	.add()

g.macro('test')
	.macro('leftright').wait(3400)
	.press('cross')
	.add();

g.macro('test').run();

setTimeout(
	function(){
		console.log(g.isRunning('test'));
	}
, 3000);

