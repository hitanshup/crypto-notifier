const express = require('express');
const bodyParser = require('body-parser')
var nodemailer = require('nodemailer');

const app = express();

const port = 90;
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static('bower_components'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// var router = express.Router();
// app.use('/sayHello', router);
// router.post('/', handleSayHello); // handle the route at yourdomain.com/sayHello

var userStack = [];

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

app.get('/favicon.ico', function(req, res) {
    res.send(204);
});

app.post('/add', function(req, res) {
    var resultOfAdding = addUserToList(req.body.emailId.trim());
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    if(resultOfAdding === 0) {
    	console.log(userStack);
    	res.write("success");
    } else {
    	console.log(resultOfAdding);
    	res.write("fail");
    }
    res.end();
});

// adds the emailId to the list of users
function addUserToList(emailId) {
	if(userStack.indexOf(emailId) === -1) { // if the email doesn't exists in the stack 
		console.log("in");
		userStack.push(emailId);
		sendWelcomeEmail(emailId);
		return 0; //success
	} 
	return -1; // fail
}

function sendWelcomeEmail(emailId) {
    // Not the movie transporter!
    var text = 'Welcome to moneronotifier';
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'moneronotifier@gmail.com', // Your email id
            pass: 'pass' // Your password
        }
    });

    var mailOptions = {
	    from: 'moneronotifier@gmail.com', // sender address
	    to: emailId, // list of receivers
	    subject: 'Email Example', // Subject line
	    text: text //, // plaintext body
	    // html: '<b>Hello world ✔</b>' // You can choose to send an HTML body instead
	};
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        console.log(error);
	        // res.json({yo: 'error'});
	    } else{
	        console.log('Message sent: ' + info.response);
	        // res.json({yo: info.response});
	    };
	});
}

app.listen(port, function () {
    console.log('crypto-notifier listening on port ' + port + '.');
});