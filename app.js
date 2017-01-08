const express = require('express');

const app = express();

const port = 80;
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static('bower_components'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

app.listen(port, function () {
    console.log('crypto-notifier listening on port ' + port + '.');
});