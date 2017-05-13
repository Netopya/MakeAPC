// Code related to main page functionality (GUI etc.)

var chatenabled = false;

(function($){
    $.isBlank = function(obj){
    return(!obj || $.trim(obj) === "");
    };
})(jQuery);

var selectedCharacter = "linus";

$(function(){

    game = new Phaser.Game(document.body.clientWidth, 600, Phaser.CANVAS, 'phaser-canvas', { preload: preload, create: create, update: update, render : render });

    // Show the into modal on load
    $("#intro_modal").modal().on('hide.bs.modal', function(e) {
        var name = $("#usernameInput").val();

        if($.isBlank(name))
        {
            e.preventDefault();
            e.stopImmediatePropagation();

            $("#usernameGroup").addClass("has-error");
            $("#usernameHelp").text("You must provide a username");

            return false;
        }
        
        username = cleanInput(name);

        showInstructions();

        join();
    });

    var characterMap = {
        "linus" : "linus.png",
        "luke" : "luke.png",
        "edzel" : "edzel.png",
        "brandon" : "brandon.png"
    };

    // Show a preview when the selected character has changed
    $("#characterSelect").change(function() {
        selectedCharacter = $(this).val();
        $("#characterPreview").attr("src", "images/" + characterMap[selectedCharacter]);
    });

    // Send a messege when the 'Send' button is pressed
    $("#chat-send").click(function(e) {
        sendChatMessege();
    });

    // Register global key presses
    $(document).keypress(function(e) {
        // On enter, toggle between focusing the chatbox and sending a message
        if(e.which == 13) {
            if(chatenabled)
            {
                if($("#chat-box").is(":focus"))
                {
                    sendChatMessege();
                    $("#chat-box").blur();
                }
                else
                {
                    $("#chat-box").focus();
                }
            }
        }
        // When pressing 'e' attempt to interact with an object
        else if((e.which == 69 || e.which == 101) && !$("#chat-box").is(":focus") && chatenabled)
        {
            tryPickup();
        }
    });
});

// Clean the chat message and then send it to the server
function sendChatMessege()
{
    var chat = cleanInput($("#chat-box").val().substring(0, 100));

    if($.isBlank(chat))
        return;

    socket.emit('chat', chat);
    setPlayerMessege(player, chat);
    $("#chat-box").val("");
}

// Show the instructions modal
function showInstructions()
{
    $("#instructions_modal").modal();
}