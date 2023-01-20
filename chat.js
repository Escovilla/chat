const { json } = require('express');
var express = require('express');
var app = express();
const fs = require('fs')
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 9000;
var dns = require('dns')

const webpush = require('web-push');
const bodyParser = require('body-parser');


const userC = []
let history 
app.use(bodyParser.json());

server.listen(port, function() {
	console.log('Server listening at port %d', port);
});

fs.readFile('public/history.txt', 'utf8', (err, data) => {
	if (err) {
	  console.error(err);
	  return;
	}
	history= data
  });

const publicVapidKey = "BNwhAYBJCkzL10R5odueSiDkMzI8IeNLGp8lnsstedgJyqD1Xt1G5tJScxxSgltB1XIuCCZGAL4aAki0_7o_L7o";
const privateVapidKey = "8KAd_QpqpowLf9w9h_LxkWjC8BVxEhmuRUxaCW4WVIk";

webpush.setVapidDetails("mailto:escovillanico5j@gmail.com", publicVapidKey, privateVapidKey);
app.post('/subscribe', (req, res) => {
	const subscription = req.body;
	res.status(201).json({});
	const payload = JSON.stringify({ title: "Welcome", body: "Human" });
	webpush.sendNotification(subscription, payload).catch(console.log);
})

app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;

io.on('connection', function(socket) {
	var addedUser = false;
	fs.readFile('public/history.txt', 'utf8', (err, data) => {
		if (err) {
			console.error(err);
			return;
		}
		history= data
	});
	socket.on('new message', function(data) {
		
		let historyap = {
			username: socket.username,
			message: data
		};
		fs.appendFile('public/history.txt', "@@"+JSON.stringify(historyap)+"", err => {
			if (err) {
			  console.error(err);
			}
		  });
		socket.broadcast.emit('new message', {
			username: socket.username,
			message: data
		});
	});

	socket.on('add user', function(username) {
		

		if (addedUser) return;
		socket.username = username;
		
		++numUsers;
		addedUser = true;
		socket.emit('login', {
			numUsers: numUsers,
            history: history
		});
		socket.broadcast.emit('user joined', {
			username: socket.username,
			numUsers: numUsers
		});	
		userC.push(username);
		socket.broadcast.emit('online', userC);

		socket.emit('online', userC);
		
	});
	//  == [] ? "You" : userC

	socket.on('typing', function() {
		socket.broadcast.emit('typing', {
			username: socket.username
		});
	});

	socket.on('stop typing', function() {
		socket.broadcast.emit('stop typing', {
			username: socket.username
		});
	});

	socket.on('disconnect', function() {
		if (addedUser) {
			--numUsers;

			socket.broadcast.emit('user left', {
				username: socket.username,
				numUsers: numUsers
			});
			const index = userC.indexOf(socket.username);
			if (index > -1) { // only splice array when item is found
				userC.splice(index, 1); // 2nd parameter means remove one item only
			  }
			socket.broadcast.emit('online', userC);
			
		}
	});
});   
