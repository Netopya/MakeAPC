// Script file for gameplay related code

//  The Google WebFont Loader will look for this object, so create it before loading the script.
WebFontConfig = {
    //  The Google Fonts we want to load (specify as many as you like in the array)
    google: {
        families: ['Revalia', 'Ubuntu Mono']
    }

};

var player;
var cursors;
var lastTouchedComponent;
var workbench;
var game;

var junk = ['pap', 'creep', 'lmg', 'pika1', 'pika2', 'poke', 'rd', 'mario', 'obama', 'lamp', 'banana', 'turnip', 'cone', 'computer'];

var socket;
var username;
var users = {};
var components = {};
var style = { font: "14px Arial", fill: "#ff0044", align: "center" };
var foundComponents = {};

function preload() {
    game.stage.backgroundColor = '#ffff99';

    // Load all media assets
    game.load.image('linus', 'images/linus.png');
    game.load.image('luke', 'images/luke.png');
    game.load.image('edzel', 'images/edzel.png');
    game.load.image('brandon', 'images/brandon.png');


    game.load.image('pap', 'images/junk/6bca32b7cc73414.png');
    game.load.image('creep', 'images/junk/20110203083336Creeper_2631349.jpg');
    game.load.image('lmg', 'images/junk/lmg.png');
    game.load.image('pika1', 'images/junk/pikachu_pixel_art_by_hiyorie-da0emtc.jpg');
    game.load.image('pika2', 'images/junk/Pikachu-minecraft-pixel-art.jpg');
    game.load.image('poke', 'images/junk/piq_10145_400x400.png');
    game.load.image('rd', 'images/junk/piq_37211_400x400.png');
    game.load.image('mario', 'images/junk/piq_45958_400x400.png');
    game.load.image('obama', 'images/junk/piq_95620_400x400.png');
    game.load.image('lamp', 'images/junk/piq_360280_400x400.png');
    game.load.image('banana', 'images/junk/pixel-art-banana_1987406.jpg');
    game.load.image('turnip', 'images/junk/pixel-art-turnip_1987413.jpg');
    game.load.image('cone', 'images/junk/Road-Cone-icon.png');
    game.load.image('computer', 'images/junk/SwanComputer_Assembled.png');

    game.load.image('case', 'images/components/case.jpg');
    game.load.image('cpu', 'images/components/cpu.jpg');
    game.load.image('gpu', 'images/components/gpu.jpg');
    game.load.image('motherboard', 'images/components/mother.jpg');
    game.load.image('psu', 'images/components/psu.jpg');
    game.load.image('ram', 'images/components/ram.jpg');
    game.load.image('ssd', 'images/components/ssd.jpg');

    game.load.image('workbench', 'images/workbench.jpg');

    // Load the Google WebFont Loader script
    game.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
}    

function create() {
    game.world.setBounds(-2000, -2000, 4000, 4000);

    cursors = game.input.keyboard.createCursorKeys();      

    // Draw in the background images
    for(var j = 0; j < 5; j++)  
    {
        for(var i = 0; i < junk.length; i++)
        {
            game.add.sprite(game.world.randomX, game.world.randomY, junk[i]);
        }
    }

    // Create the workbench
    var workbenchGroup = game.add.group();
    workbenchGroup.x = game.width / 2;
    workbenchGroup.y = game.height / 2;
    var workbenchSprite = game.add.sprite(0, 0, 'workbench');
    workbenchGroup.add(workbenchSprite);

    workbench = {workbench: workbenchGroup, sprite: workbenchSprite};
}

function update() {

    if(!player)
        return;

    var localplayer = player.player;

    // Move the player, the player should move faster if they are not centered with the camera
    if (cursors.up.isDown)
    {
        game.camera.y -= 4;
        localplayer.y -= localplayer.worldPosition.y > game.height / 2 ? 8 : 4;
    }
    else if (cursors.down.isDown)
    {
        game.camera.y += 4;
        localplayer.y += localplayer.worldPosition.y < game.height / 2 ? 8 : 4;
    }

    if (cursors.left.isDown)
    {
        game.camera.x -= 4;
        localplayer.x -= localplayer.worldPosition.x > game.width / 2 ? 8 : 4;
    }
    else if (cursors.right.isDown)
    {
        game.camera.x += 4;
        localplayer.x += localplayer.worldPosition.x < game.width / 2 ? 8 : 4;
    }

    // If the player has moved, notify the server
    if(cursors.up.isDown || cursors.down.isDown || cursors.left.isDown || cursors.right.isDown)
    {
        socket.emit('move', {x: localplayer.x, y: localplayer.y});
    }

    if(!player.holding)
    {
        // If the player is not holding something, check if they can interact with a component
        var candidateComponents = Object.values(components).map(function(component){
            return {
                component: component, 
                // Calculate the distance squared to each component
                distance: Phaser.Math.distanceSq(localplayer.x, localplayer.y, component.component.x + component.sprite.width / 2, component.component.y + component.sprite.height / 2)
            };
        }).reduce(function(last, current){
            // Find the closest component
            return last.distance < current.distance ? last : current;
        }, {distance: Infinity});

        // Reject the component if it is too far away
        if(candidateComponents.distance > 15000)
            candidateComponents = undefined;


        // If we've touched a new component (or newly not touching anything), invalidate the old component
        if(lastTouchedComponent && (!candidateComponents || lastTouchedComponent != candidateComponents.component))
        {
            lastTouchedComponent.text.visible = false;
            lastTouchedComponent = undefined;
        }

        // If touching a component, show its status text
        if(candidateComponents)
        {
            candidateComponents.component.text.visible = true; 
            lastTouchedComponent = candidateComponents.component;
        }

        // Hide workbench text and show player status text
        workbench.touching = false;
        workbench.text.visible = false;
        player.status.visible = true;
    }
    else
    {
        // Calculate the distance to the workbench is the player is holding a component
        var distance = Phaser.Math.distanceSq(localplayer.x, localplayer.y, workbench.workbench.x + workbench.sprite.width / 2, workbench.workbench.y + workbench.sprite.height / 2);

        // Depending on whether the player is close enough, change text visibility appropriately
        if(distance < 40000)
        {
            workbench.touching = true;
            workbench.text.visible = true;
            player.status.visible = false;
        }
        else
        {
            workbench.touching = false;
            workbench.text.visible = false;
            player.status.visible = true;
        }
    }
}

function render() {

}

// Set the chat messege for a player with an associated timeout to hide the messege
function setPlayerMessege(player, messege)
{
    player.chat.setText(messege);
    
    if(player.chattimer)
        clearTimeout(player.chattimer);

    player.chattimer = setTimeout(function() {
        player.chat.setText("");
    }, 5000);
}

// Create a player with 3 text fields
function createPlayer(name, character, x, y, local)
{
    var userplayer = game.add.group();
    userplayer.x = x;
    userplayer.y = y;
    var sprite = game.add.sprite(0, 0, character);
    userplayer.add(sprite);

    // The username text field
    var text = game.add.text(sprite.width / 2, sprite.height + 11, name);
    formatText(text, local);

    text.anchor.setTo(0.5);
    userplayer.add(text);

    // Text field to indicate what the player is holding
    var status = game.add.text(sprite.width / 2, sprite.height + 30, "");
    formatText(status, local);
    status.anchor.setTo(0.5);
    userplayer.add(status);

    // Text field to show a player's chat messege
    var chat = game.add.text(sprite.width / 2, -10, "");
    formatText(chat, local);
    chat.anchor.setTo(0.5);
    userplayer.add(chat);


    return {player: userplayer, chat: chat, status: status};
}

function formatText(text, local)
{
    text.align = 'center';
    text.font = 'Ubuntu Mono';
    text.fontSize = 16;
    text.fill = local ? '#0000ff' : '#ff0000';
    text.stroke = '#000000'
    text.strokeThickness = 2;
}

// Spawn a component into the game with placeholder text fields
function spawnComponent(id, x, y, component)
{
    var componentGroup = game.add.group();
    componentGroup.x = x;
    componentGroup.y = y;
    var sprite = game.add.sprite(0, 0, component);
    componentGroup.add(sprite);

    var text = game.add.text(sprite.width / 2, -10, "Press e to pickup " + component);
    formatText(text, true);
    text.anchor.setTo(0.5);
    text.visible = false;
    componentGroup.add(text);

    components[id] = {id: id, component: componentGroup, text: text, sprite: sprite, name: component};
}

// Call to join into a game
function join() {      

    socket = io();

    // Load the players already in the game
    var usersPromise = $.getJSON("/users/", function(data){
        $.each(data, function(index, value){

            if(!value.username)
                return;

            var userplayer = createPlayer(value.username, value.character, value.x, value.y, false);
            userplayer.socket = value;
            users[value.id] = userplayer;

            console.log(value.username + ' is in the game!');
        });
    });

    // Load the components in the game
    var componentsPromise = $.getJSON("/components/", function(data){
        $.each(data, function(index, value){
            spawnComponent(value.id, value.x, value.y, value.component);
        });
    });

    // Create the workbench and associated text fields
    var workbenchTitle = game.add.text(workbench.sprite.width / 2, -10, "Your Workbench!");
    formatText(workbenchTitle, true);
    workbenchTitle.anchor.setTo(0.5);
    workbench.workbench.add(workbenchTitle);
    
    var workbenchText = game.add.text(workbench.sprite.width / 2, workbench.sprite.height + 11, "Press e to add part to your computer");
    formatText(workbenchText, true);
    workbenchText.anchor.setTo(0.5);
    workbenchText.visible = false;
    workbench.workbench.add(workbenchText);
    workbench.text = workbenchText;

    var workbenchStatus = game.add.text(workbench.sprite.width / 2, workbench.sprite.height + 30, "Your already have that component!");
    formatText(workbenchStatus, true);
    workbenchStatus.anchor.setTo(0.5);
    workbenchStatus.visible = false;
    workbench.workbench.add(workbenchStatus);
    workbench.status = workbenchStatus;

    // When the users and components have been loaded, create the player to join the game
    $.when(usersPromise, componentsPromise).done(function(v1, v2){
        joinLoaded();
    });

    
}

// Create the local player and associate socket io functions
function joinLoaded()
{
    // Create the local player
    player = createPlayer(username, selectedCharacter, game.width / 2, game.height / 2, true);
    player.score = 0;

    // Notify the server of the user joining the game
    socket.emit('join', {username: username, character: selectedCharacter, x: player.player.x, y: player.player.y});

    // When a user has joined, create a new player
    socket.on('user joined', function(data){
        var userplayer = createPlayer(data.username, data.character, data.x, data.y, false);
        userplayer.socket = data;
        users[data.id] = userplayer;

        console.log(data.username + ' joined the game!');
    });

    // When a user as moved, update their coordinates
    socket.on('user moved', function(data){
        var userplayer = users[data.id];

        // If the user could not be found, return for now
        if(!userplayer)
            return;

        userplayer.player.x = data.x;
        userplayer.player.y = data.y;

    });

    // When a user disconnects, remove the user
    socket.on('user left', function(data){
        var user = users[data.id];

        if(!user)
            return;

        console.log(user.socket.username + ' left the game!');

        user.player.destroy();
        delete users[data.id];
    });

    // When a user sends a chat messege, set the player's messege
    socket.on('user messege', function(data){
        setPlayerMessege(users[data.id], data.messege);
    });

    // When the server allows us to pick up an item
    socket.on('pickup accept', function(data) {

        // Remove the touched component and add it to the player
        lastTouchedComponent = undefined;
        player.holding = components[data];

        // Update the GUI if it is new
        if(!foundComponents[components[data].name])
            $("#indicator-" + components[data].name).removeClass("list-group-item-danger").addClass("list-group-item-warning");

        player.status.setText("Holding " + components[data].name + " (e to drop)");

        // Remove the component from the ground
        components[data].component.destroy();
        delete components[data];
    });

    // When a user picks up a component, update their status text and remove the component
    // from the ground
    socket.on('component picked up', function(data) {
        users[data.player].status.setText("Holding " + components[data.id].name);
        components[data.id].component.destroy();
        delete components[data.id];
    });

    // When a user drops a component on the ground, update their status text
    // and spawn the component
    socket.on('component dropped', function(data){
        users[data.player].status.setText("");
        spawnComponent(data.component.id, data.component.x, data.component.y, data.component.component);
    });

    // Spawn a new component on the ground
    socket.on('spawn component', function(data){
        spawnComponent(data.id, data.x, data.y, data.component);
    });

    // Update a user's status text when they consume an item
    socket.on('component let go', function(data){
        users[data].status.setText("");
    });

    // When the scores have been updated, refresh the scorebox
    socket.on('score updated', function(data){
        $("#user-scores").empty();
        $.each(data, function(index, value){
            $("#user-scores").append('<li class="list-group-item">' + value.username +'<span class="badge">' + value.score + '</span></li>');
        });
    });

    chatenabled = true;
}

// Attempt to interact with an object
function tryPickup()
{
    // If the user is touching a component and not holding anything
    // ask the server if they can pick it up
    if(lastTouchedComponent && !player.holding)
    {
        socket.emit('pickup', lastTouchedComponent.id);
    }
    // If the player is holding a component
    else if(player.holding)
    {
        // If the player is at the workbench and the component was not previously added, add the part to the build
        if(workbench.touching && !foundComponents[player.holding.name])
        {
            // Add the part
            foundComponents[player.holding.name] = true;

            // Update the GUI
            $("#indicator-" + player.holding.name).removeClass("list-group-item-warning").addClass("list-group-item-success");

            // Let the serve know that the part has been consumed
            socket.emit('let go');

            // Update the player's text
            player.status.setText("");
            player.holding = undefined;

            // If all 7 components have been found
            if(Object.keys(foundComponents).length >= 7)
            {
                // Update the score and notify the server
                player.score++;

                socket.emit('build', player.score);

                // Update the GUI
                $("#local-score-display").text(player.score);

                // Reset components
                foundComponents = {};
                $("#component-indicators li").removeClass("list-group-item-success").addClass("list-group-item-danger");
            }
        }
        // If the player is at the workbench but the component was previously added,
        // Notify the user that they can't place the component again
        else if(workbench.touching && foundComponents[player.holding.name])
        {
            workbench.status.visible = true;
        
            if(workbench.statusTimer)
                clearTimeout(workbench.statusTimer);

                workbench.statusTimer = setTimeout(function() {
                workbench.status.visible = false;
            }, 5000);
        }
        // If the player is not at the workbench, drop the component on the ground
        else
        {
            // Notify the server
            socket.emit('drop', {
                id: player.holding.id,
                component: player.holding.name,
                x: player.player.x,
                y: player.player.y
            });

            // Spawn the component on the ground locally
            spawnComponent(player.holding.id, player.player.x, player.player.y, player.holding.name);

            // Update the GUI
            if(!foundComponents[player.holding.name])
                $("#indicator-" + player.holding.name).removeClass("list-group-item-warning").addClass("list-group-item-danger");

            player.status.setText("");
            player.holding = undefined; 
        }
    }
}

// Helper function to clean input
function cleanInput (input) {
    return $('<div/>').text(input).text();
}