const fs = require('fs');
const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const tsify = require('tsify');

function bundleScript() {
    return browserify('src/client/script/app.ts')
        .plugin(tsify)
        .transform(babelify)
        .bundle().pipe(fs.createWriteStream('public/out/bundle.js'));
}

function copyHtml() {
    return gulp.src('src/client/index.html').pipe(gulp.dest('public'));
}

function copyCss() {
    return gulp.src('src/client/style/app.css').pipe(gulp.dest('public/css'));
}

function copyShader() {
    return gulp.src('src/client/shader/*').pipe(gulp.dest('public/shader'));
}

const all = gulp.parallel(copyShader, copyCss, copyHtml, bundleScript);

exports.default = all;