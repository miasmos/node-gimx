var gulp = require('gulp'),
	babel = require('gulp-babel'),
	minify = require('gulp-minify'),
	jshint = require('gulp-jshint');

gulp.task('js', function() {
	var b = babel();
	var j = jshint();
	return gulp.src('src/*.js')
		.pipe(j.on('error', function(e){console.log(e.plugin+": "+e.message); j.end()}))
		.pipe(b.on('error', function(e){console.log(e.plugin+": "+e.message); b.end()}))
		.pipe(minify())
		.pipe(gulp.dest('build'));
});

gulp.task('default', function() {
	gulp.watch('src/*.js', ['js']);
});