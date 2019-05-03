const { spawn } = require('child_process');
const { watch } = require('gulp');

function pack(cb) {
    var p = spawn('npx', ['webpack']);
    p.stderr.on('data', function (data) {
        console.log(`stderr: ${data}`);
    });
    p.stdout.on('data', function (data) {
        console.log(`stdout: ${data}`);
    });
    p.on('close', function (code) {
        console.log(`npx exit with code ${code}`);
    });
    cb();
}

watch('src/client/**', pack);

exports.default = pack;