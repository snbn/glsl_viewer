const fs = require('fs');
const express = require('express');

var port = 3000;

var app = express();
app.use(express.static('public'));
app.get('/', function (req, res) {
    fs.readFile('public/index.html', function (err, data) {
        if (err) {
            throw err;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(data);
        res.end();
    });
});

var server = app.listen(port, function () {
    var addr = server.address();
    console.log('listening at http://%s:%s', addr.address, addr.port);
});