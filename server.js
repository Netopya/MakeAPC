var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/users/', function(req, res){

  /*var sockets = Object.values(io.sockets.sockets);
  var users = [];

  for(var i = 0; i < sockets.length; i++)
  {
    users.push({
      id: socket[i].id,
      username: sockets[i].username, 
      character: socket[i].character, 
      x: socket[i].x, 
      y: socket[i].y
    });
  }

  var sockets = io.sockets.sockets;*/

  res.json(Object.keys(io.sockets.sockets).map(function(key){
    return {
      id: socket[key].id,
      username: sockets[key].username, 
      character: socket[key].character, 
      x: socket[key].x, 
      y: socket[key].y
    };
  }));
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});

//var users = [];

io.on('connection', function (socket) {

  socket.on('join', function(data){
    //var user = new Object();
    socket.username = data.username;
    socket.character = data.character;
    socket.broadcast.emit('user joined', {
      id: socket.id,
      username: socket.username,
      character: socket.character
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

});