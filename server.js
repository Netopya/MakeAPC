var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Get a list of connected users
app.get('/users/', function(req, res){
  var usersockets = io.sockets.sockets;

  res.json(Object.keys(usersockets).map(function(key){
    return {
      id: usersockets[key].id,
      username: usersockets[key].username, 
      character: usersockets[key].character, 
      x: usersockets[key].x, 
      y: usersockets[key].y
    };
  }));
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});


io.on('connection', function (socket) {

  socket.on('join', function(data){
    socket.username = data.username;
    socket.character = data.character;
    socket.x = data.x;
    socket.y = data.y;

    socket.broadcast.emit('user joined', {
      id: socket.id,
      username: socket.username,
      character: socket.character,
      x: socket.x,
      y: socket.y
    });
  });

  socket.on('move', function(data){
    
    socket.x = data.x;
    socket.y = data.y;

    socket.broadcast.emit('user moved', {
      id: socket.id,
      x: socket.x,
      y: socket.y
    });
  });

  socket.on('disconnect', function () {
    socket.broadcast.emit('user left', {
        id: socket.id
      });
  });

  socket.on('chat', function(data) {
    var chat = data.substring(0, 100);
    socket.broadcast.emit('user messege', {
      id: socket.id,
      messege: chat
    });
  });
});