


const { json } = require('express');
var express = require('express');
var app = express();
const fs = require('fs')
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 9000;
var dns = require('dns')
const userC = []
let history 
const IP_BLOCK_TIME = 60000;
const MAX_TRIES = 4;

const ipBlockList = new Map();

app.use((req, res, next) => {
	let hostname 
    let ip = req.ip.replace(/^.*:/, '');
	
    let auth = { login: 'td', password: 'tfjotld' };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (!ipBlockList.has(ip)) {
        ipBlockList.set(ip, {
            attempts: 0,
            blockedUntil: 0
        });
    }

    let ipData = ipBlockList.get(ip);

    if (ipData.blockedUntil > Date.now()) {
		dns.reverse(ip, function(err, domains) {
			console.log(hostname)
	
			res.status(401).send(`Hi your ip is : `+ip+` and your hostname is: `+domains[0]+`, ---- try again in ${Math.ceil((ipData.blockedUntil - Date.now()) / 1000)} seconds.`);

		});
		
        return;
    }

    if (login && password && login === auth.login && password === auth.password) {
        ipBlockList.delete(ip);
        return next();
    }

    ipData.attempts++;

    if (ipData.attempts >= MAX_TRIES) {
        ipData.blockedUntil = Date.now() + IP_BLOCK_TIME;
		console.log(hostname)

        dns.reverse(ip, function(err, domains) {
	
			res.status(401).send(`Hi your ip is : `+ip+` and your hostname is: `+domains[0]+`, ---- try again in ${Math.ceil((ipData.blockedUntil - Date.now()) / 1000)} seconds.`);

		});
    } else {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Hi '+ip+" I see you");
    }
});
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
		// done!
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