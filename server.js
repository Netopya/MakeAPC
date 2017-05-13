var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var components = ['case', 'cpu', 'gpu', 'motherboard', 'psu', 'ram', 'ssd'];
var spawnedComponents = {};
var componentNum = 0;
var lastScore;

// Get a random integer between to values inclusively
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Define the initial 35 components
for(var j = 0; j < 5; j++)
{
  for(var i = 0; i < components.length; i++)
  {
    var id = (componentNum++).toString();
    spawnedComponents[id] = {
      id: id, 
      component: components[i], 
      x: getRandomInt(-2000, 2000),
      y: getRandomInt(-2000, 2000)
    };
  }
}

// Every second check if there are less than 35 components
// and spawn a new component if this is not the case
var spawner = setInterval(function() {
  if(Object.keys(spawnedComponents).length < 35)
  {
    var componentVal = getRandomInt(0, components.length - 1);
    var id = (componentNum++).toString();
    spawnedComponents[id] = {
      id: id, 
      component: components[componentVal], 
      x: getRandomInt(-2000, 2000),
      y: getRandomInt(-2000, 2000)
    };

    io.sockets.emit('spawn component', spawnedComponents[id]);
  }
}, 1000);

// Route the public directory
app.use(express.static(__dirname + '/public'));

// Return the main page
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

// Get a list of spawned components
app.get('/components/', function(req, res){
  res.json(Object.keys(spawnedComponents).map(function(key){
    return spawnedComponents[key];
  }));;
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});

// Determine whether a list of scores matches another list of scores
function scoreArraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i].username !== b[i].username || a[i].score !== b[i].score) return false;
  }
  return true;
}

io.on('connection', function (socket) {

  // When a user joins
  socket.on('join', function(data){

    // Create the user
    socket.username = data.username.substring(0, 100);
    socket.character = data.character;
    socket.x = data.x;
    socket.y = data.y;
    socket.score = 0;

    // Notify other sockets
    socket.broadcast.emit('user joined', {
      id: socket.id,
      username: socket.username,
      character: socket.character,
      x: socket.x,
      y: socket.y
    });

    // Since we show only the top 5 scores, if there are
    // 5 or less players, we need to update the top scores table
    var usersockets = io.sockets.sockets;

    if(Object.keys(usersockets).length < 6)
    {
      var userScores = Object.keys(usersockets).map(function(key){
        return {
          username: usersockets[key].username, 
          score: usersockets[key].score
        };
      }).sort(function(a, b){
        return b.score - a.score;
      });

      io.sockets.emit('score updated', userScores);
      lastScore = userScores;
    }
  });

  // Broadcast a player's location when they move
  socket.on('move', function(data){
    
    socket.x = data.x;
    socket.y = data.y;

    socket.broadcast.emit('user moved', {
      id: socket.id,
      x: socket.x,
      y: socket.y
    });
  });


  // Broadcast a player leaving the game
  socket.on('disconnect', function () {
    socket.broadcast.emit('user left', {
        id: socket.id
      });
  });

  // Broadcast a player's chat messege
  socket.on('chat', function(data) {
    var chat = data.substring(0, 100);
    socket.broadcast.emit('user messege', {
      id: socket.id,
      messege: chat
    });
  });

  // When player requests to pickup an item,
  // ensure the item exists and fulfill the request
  socket.on('pickup', function(data) {
    if(spawnedComponents[data])
    {
      delete spawnedComponents[data];
      socket.emit('pickup accept', data);
      socket.broadcast.emit('component picked up', {id: data, player: socket.id});
    }
  });

  // When a component is dropped on the ground, 
  // respawn the component and notify users who dropped it
  socket.on('drop', function(data){
    spawnedComponents[data.id] = data;

    socket.broadcast.emit('component dropped', {component: data, player: socket.id});
  });

  // Broadcast a player consuming a component
  socket.on('let go', function() {
    socket.broadcast.emit('component let go', socket.id);
  });

  // When a user builds a computer, update their score
  // and determine whether this effects the score listing
  // of the top 5 players
  socket.on('build', function(data) {
    socket.score = data;

    var usersockets = io.sockets.sockets;

    var userScores = Object.keys(usersockets).map(function(key){
      return {
        username: usersockets[key].username, 
        score: usersockets[key].score
      };
    }).sort(function(a, b){
      return b.score - a.score;
    }).slice(0,5);

    // If the top scores have changed, notify all users
    if(!scoreArraysEqual(lastScore, userScores))
    {
      io.sockets.emit('score updated', userScores);
      lastScore = userScores;
    }   

  });
});