const fs = require('fs');
const gulp = require('gulp');
const browserify = require('browserify');
const babelify = require('babelify');
const tsify = require('tsify');
const less = require('gulp-less');
const { resolve } = require('path');

const srcDir = resolve(__dirname, 'src', 'client');

function bundleScript() {
    return browserify(resolve(srcDir, 'script', 'app.ts'), { debug: true })
        .plugin(tsify)
        .transform(babelify)
        .bundle().pipe(fs.createWriteStream('public/js/bundle.js'));
}

function compileLess() {
    return gulp.src(resolve(srcDir, 'style', 'app.less'))
        .pipe(less())
        .pipe(gulp.dest('public/css'));
}

function copyCss() {
    return gulp.src('node_modules/normalize.css/normalize.css').pipe(gulp.dest('public/css'));
}

function copyHtml() {
    return gulp.src(resolve(srcDir, 'view', 'index.html')).pipe(gulp.dest('public'));
}

function copyShader() {
    return gulp.src(resolve(srcDir, 'shader', '*')).pipe(gulp.dest('public/shader'));
}

const all = gulp.parallel(copyCss, copyShader, compileLess, copyHtml, bundleScript);

gulp.watch(resolve(srcDir, 'script', '*.ts'), bundleScript);
gulp.watch(resolve(srcDir, 'shader', '*'), copyShader);
gulp.watch(resolve(srcDir, 'style', '*'), compileLess);
gulp.watch(resolve(srcDir, 'view', '*.html'), copyHtml);

exports.default = all;