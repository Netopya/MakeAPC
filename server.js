var express = require('express');
var app = express();
var http = require('http').Server(app);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
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

});