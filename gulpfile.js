const fs = require('fs');
const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const tsify = require('tsify');
const less = require('gulp-less');

function bundleScript() {
    return browserify('src/client/script/app.ts', { debug: true })
        .plugin(tsify)
        .transform(babelify)
        .bundle().pipe(fs.createWriteStream('public/js/bundle.js'));
}

function compileLess() {
    return gulp.src('src/client/style/app.less')
        .pipe(less())
        .pipe(gulp.dest('public/css'));
}

function copyCss() {
    return gulp.src('node_modules/normalize.css/normalize.css').pipe(gulp.dest('public/css'));
}

function copyHtml() {
    return gulp.src('src/client/index.html').pipe(gulp.dest('public'));
}

function copyShader() {
    return gulp.src('src/client/shader/*').pipe(gulp.dest('public/shader'));
}

const all = gulp.parallel(copyCss, copyShader, compileLess, copyHtml, bundleScript);

gulp.watch('src/client/script/*.ts', bundleScript);
gulp.watch('src/client/shader/*', copyShader);
gulp.watch('src/client/style/*', compileLess);
gulp.watch('src/client/*.html', copyHtml);

exports.default = all;