'use strict';

var Alexa = require('alexa-sdk');
var https = require('https');
var util = require('util');
var APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

var config = {
    "access_token" : "de1dfb9b-bbba-409e-a4ba-47e42458751c",
    "user_agent_contact" : "erikberg@jeffblankenburg.com",
    "time_zone" : "America/New_York",
    "version" : "1.0"
};
var userAgent = util.format('xmlstats-exnode/%s (%s)', config.version, config.user_agent_contact);

const handlers = {
    "LaunchRequest": function () {
        this.emit(":ask", "I can tell you how many games back your favorite base ball team is.  Which team would you like to know about?  ", "Which team would you like to know about?");
    },
    
    "GetGamesBack": function () {
        console.log("FULL REQUEST = " + JSON.stringify(this.event.request));
        if (this.event.request.intent.slots.Team.resolutions.resolutionsPerAuthority[0].status.code === "ER_SUCCESS_MATCH")
        {
            var slotvalue = this.event.request.intent.slots.Team.resolutions.resolutionsPerAuthority[0].values[0].value.name;
            console.log("SLOT VALUE: " + slotvalue);
            if (slotvalue !== undefined)
            {
                var teamname = slotvalue;
                httpsGet(slotvalue,  (result) => {
                    var userTeam = result.standing.find((team) => { return team.last_name.toLowerCase() === teamname.toLowerCase() });
                    console.log(userTeam);
                    var response = getResponse(userTeam);
                    console.log(getRandomQuestion);
                    this.emit(":ask", response + getRandomQuestion(), getRandomQuestion());
                }
                );
            }
        }
        else
        {
            this.emit(":ask", "I'm sorry, I don't think " + this.event.request.intent.slots.Team.value + " is a baseball team. " + getRandomQuestion(), getRandomQuestion());
        }
    },
    'NewYork': function () {
        var NYresponse = ["There are two teams in New York.  Which team did you want?", "Did you want the Yankees or the Mets?", "Did you want the Mets or the Yankees?"]
        var random = getRandom(0, NYresponse.length-1);
        this.emit(':ask', NYresponse[random], NYresponse[random]);
    },
    'Chicago': function () {
        var CHIresponse = ["There are two teams in Chicago.  Which team did you want?", "Did you want the White Sox or the Cubs?", "Did you want the Cubs or the White Sox?"]
        var random = getRandom(0, CHIresponse.length-1);
        this.emit(':ask', CHIresponse[random], CHIresponse[random]);
    },
    'LosAngeles': function () {
        var LAresponse = ["There are two teams in Los Angeles.  Which team did you want?", "Did you want the Angels or the Dodgers?", "Did you want the Dodgers or the Angels?"]
        var random = getRandom(0, LAresponse.length-1);
        this.emit(':ask', LAresponse[random], LAresponse[random]);
    },
    'Socks': function () {
        var SOXresponse = ["There are two teams called the Sox.  Which team did you want?", "Did you want the Red Sox or the White Sox?", "Did you want the White Sox or the Red Sox?"]
        var random = getRandom(0, SOXresponse.length-1);
        this.emit(':ask', SOXresponse[random], SOXresponse[random]);
    },
    'AMAZON.YesIntent': function () {
        this.emit(':ask', getRandomQuestion(), getRandomQuestion());
    },
    'AMAZON.NoIntent': function () {
        this.emit(':tell', "Goodbye.");
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', "You can ask me about any baseball team, and I will tell you how many games from first place they are.  Which team would you like to know about?", "Which team would you like to know about?");
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', "Goodbye.");
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', "Goodbye.");
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function getResponse(data)
{
    if (data.games_back > 0) return "The " + data.first_name + " " + data.last_name + " are " + data.games_back.toString().replace(".5", " and a half") + " games back in the " + getLeague(data.conference) + " " + getDivision(data.division) + ". They are in " + data.ordinal_rank + " place, with a record of " + data.won + " and " + data.lost + ". ";
    else return "The " + data.first_name + " " + data.last_name + " are currently in first place in the " + getLeague(data.conference) + " " + getDivision(data.division) + ", with a record of " + data.won + " and " + data.lost + ". ";
}

function getRandomQuestion()
{
    var questions = ["Which team would you like to know about?", "Can I tell you about another team?", "Which team would you like to know about next?"];
    var random = getRandom(0, questions.length-1);
    return questions[random];
}

function getRandom(min, max)
{
    return Math.floor(Math.random() * (max-min+1)+min);
}

function getLeague(league)
{
    if (league === "AL") return "American League";
    else return "National League";
}

function getDivision(division)
{
    if (division === "W") return "West";
    else if (division === "C") return "Central";
    else return "East";
}

function httpsGet(myData, callback) {
    var options = {
        host: "erikberg.com",
        port: 443,
        path: "/mlb/standings.json",
        headers: {
            'User-Agent' : userAgent
        },
        method: 'GET',
    };

    var req = https.request(options, res => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', chunk => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            var data = JSON.parse(returnData);
            callback(data);
        });
    });
    req.end();
}