/*
  _  _    ___    ___   
 | \| |  / __|  / _ \  
 | .` | | (_ | | (_) | 
 |_|\_|  \___|  \___/  
_|"""""_|"""""_|"""""| 
"`-0-0-"`-0-0-"`-0-0-' 

Number
Guessing
Online

By Thomas
futuristicblanket.com
License: MIT

*/

//Import the express framework into this node.js environment
var express = require("express");
//Import the body parser framework into this node.js environment
var bodyParser = require("body-parser");
//Import a library that enables me to merge two objects together
var objectAssign = require("object-assign");

//Create a new variable called app and give it the express object as contents. This means we now have a clone of the express object that we can modify without messing any things up.
var app = express();

//Have our express app use the body-parser (makes is easier to handle the information from post requests)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Array stores all users
var users = {};
//Variable to create ids
var userz = 0;
//ID of users in the game
var inGame = [];
//If a game is in progress?
var game = false;
//Is game being played?
var gamePlayed = false;
//Has the game finished and winner is being annoounced?
var gameWon = false;
//Time until the next game
var timeUntilNextGame = 20;
//Time the game has been running
var timeDone = 0;
//The number being guessed
var theNumber = 0;
//The time until the next game starts while the winner is announced
var timeUntilNext = 0;
//Variables for the winner
var winnerName = "";
var winnerTime = 0;
var winnerTries = 0;

//Allow Cross Origin Requests to the server. This means you can create your owb browser client to access the api without having to use a disable CORS plugin.
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//Triggered when user posts to domain.com/register. Used to register a username.
app.post("/register", function(req, res){
    //Convert data to JavaScript object
    var responce = req.body;
    //Create variable for responce
    var responceJson = {"id": "", success: true, "error": "", "errorCode": ""};
    //Create string version of ID
    var userzString = userz.toString();
    //Create object to add data to
    var theObject = {};
    //Make sure that the JSON has a id property and return error if username is missing.
    if (!("username" in responce)) {
        responceJson.success = false;
        responceJson.error = "No key in JSON caled username!";
        responceJson.errorCode = "1";
    }
    //Check that the username key has string data, return error if it dosen't.
    else if (typeof responce.username !== "string") {
        responceJson.success = false;
        responceJson.error = "Username is not a string!";
        responceJson.errorCode = "4";
    }
    //Check to make sure username is not too short
    else if (responce.username.length < 3) {
        responceJson.success = false;
        responceJson.error = "Username is too short!";
        responceJson.errorCode = "2";
    }
    //Check to make sure username is not too long
    else if (responce.username.length > 12) {
        responceJson.success = false;
        responceJson.error = "Username is too long!";
        responceJson.errorCode = "3";
    }
    //If username is correct length then add to list of registered users
    else {
        responceJson.success = true;
        responceJson.id = userzString;
        responceJson.errorCode = "0";
        theObject[userzString] = {
                                "username": "",
                                "id": "",
                                "time": 0
                                };
        theObject[userzString].username = responce.username;
        theObject[userzString].id = userz;
        theObject[userzString].time = Date.now() / 1000 | 0;
        objectAssign(users, theObject);
        userz++;
    }
    //Return the id for the user or error is something went wrong.
    res.json(responceJson);
    //Finish the request
    res.end();
});

//Triggered when user posts to domain.com/status. Used to check how the client should be behaving.
app.post("/status", function(req, res){
    //Create variable for data submitted by user
    var responce = req.body;
    //Create variable for JSON to be sent back to client
    var responceJson = {
            "status": "",
            "timeRemaining": 0,
            "error": "",
            "errorCode": "",
            "winner": {
                "username": "",
                "tries": 0,
                "time": 0,
                "number": 0
            }
        };
    //Check that the id key exists and its value's data type is a string. If it is then return a status
    if ("id" in responce && (typeof responce.id === "string")) {
        var id = responce.id;
        if ((inGame.indexOf(id) === -1) && id in users) {
            if (gamePlayed || gameWon) {
                //Returned if a game is currently being played that the user is not involved in.
                responceJson.status = "busy";
                responceJson.errorCode = "0";
            }
            else if (!(gamePlayed) && !(gameWon)){
                //Returned if the game is in the 40 second gap where users can join the game.
                responceJson.status = "open";
                responceJson.errorCode = "0";
            }
        }
        else if (!(id in users)) {
            //Returned if the id submitted was not found in the database
            responceJson.status = "notRegistered";
            responceJson.errorCode = "0";
        }
        else if (game && gamePlayed) {
            //Returned if the user is currently in a game being played. If the client gets this responce than they should be guessing.
            responceJson.status = "inProgress";
            responceJson.errorCode = "0";
            responceJson.timeRemaining = 60 - timeDone;
        }
        else if (game && !(gamePlayed) && gameWon) {
            //Returned if the game is over but the game isn't waiting for users to join yet either. This also returns which user won.
            responceJson.status = "finished";
            responceJson.errorCode = "0";
            responceJson.winner.username = winnerName;
            responceJson.winner.time = winnerTime;
            responceJson.winner.tries = winnerTries;
            responceJson.winner.number = theNumber;
        }
        else if (!(game) && !(gamePlayed) && !(gameWon) && (inGame.indexOf(id) >= 0)) {
            //Returned if the user is currently in a game but the game hasn't started yet.
            responceJson.status = "waiting";
            responceJson.timeRemaining = timeUntilNextGame;
            responceJson.errorCode = "0";
        }
    }
    else {
        if (!("id" in responce)) {
            //Returned if the JSON submitted has no key called id.
            responceJson.status = "error";
            responceJson.error = "No key called id in javascript object!";
            responceJson.errorCode = "1";
        }
        else if (!(typeof responce.id === "string")) {
            //Returned if they key id dosen't have a string as it's value.
            responceJson.status = "error";
            responceJson.error = "id is not a string";
            responceJson.errorCode = "2";
        }
    }
    //Send user status or error
    res.json(responceJson);
    //End request
    res.end();
});

//Triggered when user posts to domain.com/joinGame. Used to indicate to the server that the client wants to play a game of Guess The Number.
app.post("/joinGame", function(req, res){
    // Create a variable with the data submitted by client
    var responce = req.body;
    //Create a javascript object for the responce
    var responceJson = {"success": true, "error": "", "errorCode": "", "timeUntilStart": 0};
    //Check that the data submitted has an id key
    if (!("id" in responce)) {
        responceJson.success = false;
        responceJson.error = "No key in JSON called id";
        responceJson.errorCode = "1";
    }
    //Check that the id has a string value
    else if (!(typeof responce.id === "string")) {
        responceJson.success = false;
        responceJson.error = "id is not a string";
        responceJson.errorCode = "5";
    }
    else {
        //Make sure that the id exists on the list of users
        if (!(responce.id in users)) {
            responceJson.success = false;
            responceJson.error = "That id is not recognised!";
            responceJson.errorCode = "6";
        }
        //Check if the user is already in a game
        else if ((responce.id in users) && (inGame.indexOf(responce.id) >= 0)) {
            responceJson.success = false;
            responceJson.error = "Already in a game";
            responceJson.errorCode = "2";
            responceJson.timeUntilStart = timeUntilNextGame;
        }
        //Make sure the game isn't full
        else if ((responce.id in users) && (inGame.indexOf(responce.id) === -1) && (inGame.length > 4)) {
            responceJson.success = false;
            responceJson.error = "The game is full, please wait!";
            responceJson.errorCode = "3";
        }
        //Make sure there is no game happening right now
        else if (gamePlayed && (inGame.indexOf(responce.id) === -1) || gameWon && (inGame.indexOf(responce.id) === -1)) {
            responceJson.success = false;
            responceJson.error = "A game is currently in progress!";
            responceJson.errorCode = "4";
        }
        //If everything is good add them into the current game
        else if ((responce.id in users) && (inGame.indexOf(responce.id) === -1) && (inGame.length < 5) && (gamePlayed == false) && (gameWon == false)) {
            responceJson.success = true;
            responceJson.timeUntilStart = timeUntilNextGame;
            inGame.push(responce.id);
            responceJson.errorCode = "0";
        }
    }
    //Send the responce back
    res.json(responceJson);
    //End the request
    res.end();
});

//Triggered when a user posts to domain.com/guess. Used to submit your guess for the number.
app.post("/guess", function(req, res) {
    //Create a variable for the users request
    var responce = req.body;
    //Create a js object for the information to be returned
    var responceJson = {"timeRemaing": 0,
                        "result": "",
                        "resultCode": "",
                        "success": false,
                        "error": "",
                        "errorCode": ""
                       };
    //Make sure that both guess and id keys exist
    responce.guess = Number(responce.guess);
    if (!("id" in responce) || !("guess" in responce)) {
        responceJson.success = false;
        responceJson.error = "No key for guess and/or id in JSON!";
        responceJson.errorCode = "1";
    }
    //Also check that if they do exist they are the correct datatype
    else if (!(typeof responce.id == "string") || !(typeof responce.guess == "number")) {
        responceJson.success = false;
        responceJson.error = "id is not a string and/or guess is not a number";
        responceJson.errorCode = "4";
    }
    else {
        //Create varaibles for the users id and guess
        var id = responce.id;
        var guess = responce.guess;
        //Also check the user exists
        if (!(id in users)) {
            responceJson.success = false;
            responceJson.error = "This id is not registered";
            responceJson.errorCode = "5";
        }
        //Check the user is in a game
        else if (inGame.indexOf(id) === -1) {
            responceJson.success = false;
            responceJson.error = "Your not in a game";
            responceJson.errorCode = "2";
        }
        //Check user is in a game and the game is being played
        else if ((inGame.indexOf(id) >= 0) && gamePlayed) {
            /*
            Result Codes!
            0 = Correct
            1 = Lower
            2 = Higher
            3 = Game Over
            */
            //If the user gets the correct answer then let them know, also reset the game!
            if (theNumber == guess) {
                responceJson.timeRemaing = 0;
                responceJson.result = "Correct, you got it right, the answer was " + theNumber.toString() + "!";
                responceJson.resultCode = "0";
                responceJson.success = true;
                responceJson.errorCode = "0";
                gamePlayed = false;
                timeUntilNext = 10;
                winnerTime = timeDone;
                winnerTries = 0;
                winnerName = users[id].username;
                timeDone = 0;
                gameWon = true;
            }
            //If the number guessed is lower than the answer...
            else if (guess > theNumber) {
                responceJson.timeRemaing = 60 - timeDone;
                responceJson.result = "Lower!";
                responceJson.resultCode = "1";
                responceJson.success = true;
                responceJson.errorCode = "0";
            }
            //If the number gessed is higher than the answer...
            else if (guess < theNumber) {
                responceJson.timeRemaing = 60 - timeDone;
                responceJson.result = "Higher!";
                responceJson.resultCode = "2";
                responceJson.success = true;
                responceJson.errorCode = "0";
            }
        }
        //Let user know the game has finished
        else if (gameWon && !(gamePlayed)) {
            responceJson.timeRemaing = 0;
            responceJson.result = "Too late, the number was " + theNumber;
            responceJson.resultCode = "3";
            responceJson.success = true;
            responceJson.errorCode = "0";
        }
        //If their is no game let user know
        else if (!(gamePlayed)) {
            responceJson.success = false;
            responceJson.error = "There is no game right now";
            responceJson.errorCode = "3";
        }
    }
    //Return the responce
    res.json(responceJson);
    //Return the responce
    res.end();
});

//Get the number being guessed. Used as a little cheat. This endpoint is not documented in the documentation, so only people who read the source code can get this little hint.
app.get("/number", function(req, res) {
    var responceJson = {"number": ""};
    responceJson.number = theNumber.toString();
    res.json(responceJson);
    res.end();
});

//Function that handles the timing of the server. Will count down time until game starts and how much time is left in a game.
function update() {
    //Check if it's time to setup a new game
    if ((timeUntilNextGame === 0) && !(gamePlayed) && !(gameWon)) {
        //If their are users in the game then lets go
        if (inGame.length > 0) {
            //New game setup
            //Generate number between 1 and 500
            theNumber = Math.floor((Math.random() * 500) + 1);
            game = true;
            gamePlayed = true;
            timeDone = 0;
            timeDone++;
        }
        //Otherwise reset the timer!
        else {
            timeUntilNextGame = 20;
        }
    }
    //If 60 seconds passed with no correct answer reset game
    else if (timeDone >= 60 && gamePlayed) {
        //Game run out of time with not answer
        gamePlayed = false;
        gameWon = true;
        game = true;
        winnerName = "nobody";
        winnerTime = 60;
        winnerTries = 0;
        timeUntilNext = 10;
    }
    //Countdown time while winner is announced
     else if (game && !(gamePlayed) && (gameWon) && (timeUntilNext >= 1)) {
        //Take time off countdown to next game wait
        timeUntilNext--;
    }
    //If the game is being played then add time to the timer
    else if (gamePlayed) {
        //Add time to amount of time game has been going
        timeDone++;
    }
    //If we are waiting then take time off the timer
    else if (!(game) && !(gamePlayed) && !(gameWon) && (timeUntilNextGame >= 1)) {
        //Take time off countdown
        timeUntilNextGame--;
    }
    //When the time the winner is announced finishes start accecpting people to join the game again.
    else if ((game) && !(gamePlayed) && (gameWon) && (timeUntilNext === 0)) {
        game = false;
        gameWon = false;
        gamePlayed = false;
        timeUntilNextGame = 20;
        //Reset the time of all users who played
        for (var i = 0; i < inGame.length; i++) {
            users[inGame[i]].time = Date.now() / 1000 | 0;
        };
        inGame = [];
    }
};

//Function is triggered every minute. Scans through all registered users and removes all that have been inactive for more than 5 minutes
function deleteInactiveUsers() {
    //Get ids of all users in array
    var usersArray = Object.keys(users);
    //Cycle through array
    for (var i = 0; i < usersArray.length; i++) {
        var difference = (Date.now() / 1000 | 0) - users[usersArray[i]].time;
        //If the difference between current time and time user was last active is more than 5 minutes exterminate them :P
        if (difference >= 300) {
            delete users[i];
        }
    }
};

//Runs the update function for server timing every second.
setInterval(update, 1000);
//Removes all inactive users every minute.
setInterval(deleteInactiveUsers, 60000);

//Lets clients access the api on port 80.
app.listen(process.env.PORT || 80);

//Informs the user running the script that the server is working!
console.log("Server running @ 127.0.0.1:80");