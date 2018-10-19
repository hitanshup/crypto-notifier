const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const request = require('request');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var cheerio = require('cheerio');
var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");


const http = new XMLHttpRequest();
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

var file = "userStack.db";
var exists = fs.existsSync(file);
var db = new sqlite3.Database(file);
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'moneronotifier@gmail.com', // Your email id
        pass: 'sideproject' // Your password
    }
});

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.post('/add', function(req, res) {
    addEmailToDb(req.body.emailId.trim());
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.write("");
    res.end();
});


function initDb() {
    if(!exists) {
        console.log("Creating DB file.");
        fs.openSync(file, "w");
        db.serialize(function() {
            db.run("CREATE TABLE if not exists user_info (info TEXT)");
        });
    }
}

function addEmailToDb(emailId) {
    db.serialize(function() {
        var stmt = db.prepare("INSERT INTO user_info VALUES (?)");
        stmt.run(emailId);
        stmt.finalize();
        db.each("SELECT rowid AS id, info FROM user_info", function(err, row) {
           console.log(row.id + ": " + row.info);
        });
    });
    sendWelcomeEmail(emailId);
}

function sendPriceUpdateEmail() {
    var toList = "";
    db.serialize(function() {
        db.each("SELECT rowid AS id, info FROM user_info", function(err, row) {
           if(row.id === 1) {
                toList = row.info;
           } else {
                toList = toList + ',' + row.info;
           }
        });
    });
    if(toList) { // check if our subscribers list isn't empty
        
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
    url = 'https://min-api.cryptocompare.com/data/price?fsym=XMR&tsyms=USD';

    http.open("GET", url);
    http.send();

    http.onreadystatechange=(e)=>{
        newCurrentPrice = http.responseText
        // TODO: PLEASE CHANGE THIS
        newCurrentPrice = newCurrentPrice.slice(7, 13);
        console.log(newCurrentPrice);
        newExactPrice = newCurrentPrice;
        newCurrentPrice = parseInt(newCurrentPrice)
        console.log(newCurrentPrice)
        if(newCurrentPrice !== currentPrice && !isNaN(newCurrentPrice)) { // update the current price if it has changed
            exactPrice = newExactPrice;
            currentPrice = newCurrentPrice;
            sendPriceUpdateEmail();
        } else if(newExactPrice !== exactPrice) { //update the exact price even if it doesn't change by 1$
            exactPrice = newExactPrice;
        }
    }
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
initDb();

