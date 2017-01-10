const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const request = require('request');
var cheerio = require('cheerio');

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
var currentPrice = -1;
var exactPrice = -1;

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'moneronotifier@gmail.com', // Your email id
        pass: 'pass' // Your password
    }
});

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


function sendPriceUpdateEmail() {
    var toList = "";
    if(userStack) { // check if our subscribers list isn't empty
        for(i = 0; i < userStack.length; i++) {
            if(i === 0) {
                toList = userStack[i]; 
            } else {
                toList = toList + ',' + userStack[i];
            }
        }
    var text = "The price of Monero has been changed to" + exactPrice.toString() + " usd.";
    var mailOptions = {
        from: 'moneronotifier@gmail.com', // sender address
        to: toList, // list of receivers
        subject: 'Monero Update', // Subject line
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
       }
    });
    }
}

function startCronJob() {
    cron.schedule('* * * * *', function(){
      updateMoneroValue();  
      console.log('running a task every minute');
    });
}


//returns the current value of monero
function updateMoneroValue() {
    url = 'https://www.coingecko.com/en/price_charts/monero/usd';

    request(url, function(error, res, html){
        if(!error){
            var $ = cheerio.load(html);
            var newCurrentPrice, newExactPrice;

            newCurrentPrice = $('.col-xs-10 > .table-responsive > .table').children().last().children().first().children().first().next().next().text();
            newExactPrice = newCurrentPrice;
            newCurrentPrice = (newCurrentPrice.split('.')[0]).trim();
            newCurrentPrice = newCurrentPrice.substring(1, newCurrentPrice.length)
            newCurrentPrice = parseInt(newCurrentPrice);
            console.log(currentPrice);
            console.log(newCurrentPrice);
            if(newCurrentPrice !== currentPrice) {
                exactPrice = newExactPrice;
                currentPrice = newCurrentPrice;
                sendPriceUpdateEmail();
            }
        }
    });
}


function sendWelcomeEmail(emailId) {
    var text = 'Welcome to moneronotifier, the current price of monero is' + exactPrice.toString() + 'usd.';

    var mailOptions = {
	    from: 'moneronotifier@gmail.com', // sender address
	    to: emailId, // list of receivers
	    subject: 'Monero Update', // Subject line
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
	   }
	});
}

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

app.listen(port, function () {
    console.log('crypto-notifier listening on port ' + port + '.');
});

updateMoneroValue();
startCronJob();
