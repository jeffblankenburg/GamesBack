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
        console.log("FULL REQUEST = " + JSON.stringify(this.event));

        var failFlag = false;
        if (this.event.request.intent === undefined) failFlag = true;
        else if (this.event.request.intent.slots === undefined) failFlag = true;
        else if (this.event.request.intent.slots.Team === undefined) failFlag = true;
        else if (this.event.request.intent.slots.Team.value === undefined) failFlag = true;
        else if (this.event.request.intent.slots.Team.resolutions === undefined) failFlag = true;
        else if (this.event.request.intent.slots.Team.resolutions.resolutionsPerAuthority[0].status.code != "ER_SUCCESS_MATCH") failFlag = true;
        
        if (failFlag && (this.event.request.token != undefined)) failFlag = false;

        if (!failFlag)
        {
            var slotvalue = "";
            
            if (this.event.request.intent != undefined)
            {
                slotvalue = this.event.request.intent.slots.Team.resolutions.resolutionsPerAuthority[0].values[0].value.name;
            }
            else
            {
                slotvalue = this.event.request.token;
            }
            
            console.log("SLOT VALUE: " + slotvalue);
            if (slotvalue !== undefined)
            {
                var teamname = slotvalue;
                var secondPlace = "";
                httpsGet(slotvalue,  (result) => {
                    console.log("FULL RESULTS = " + JSON.stringify(result));
                    var userTeam = result.standing.find((team) => { return team.last_name.toLowerCase() === teamname.toLowerCase() });
                    
                    var teamConference = result.standing.filter((team) => { return team.conference.toLowerCase() === userTeam.conference.toLowerCase(); });
                    console.log("CONFERENCE TEAMS = " + JSON.stringify(teamConference));
                    var teamDivision = teamConference.filter((team) => { return team.division.toLowerCase() === userTeam.division.toLowerCase(); });
                    console.log("DIVISION TEAMS = " + JSON.stringify(teamDivision));
                    if (userTeam.rank === 1)
                    {
                        secondPlace = teamDivision.find((team) => { return team.rank === 2 });
                        console.log("SECOND PLACE TEAM = " + JSON.stringify(secondPlace));
                    }                    
                    
                    console.log(userTeam);
                    var response = getResponse(userTeam, secondPlace);
                    console.log(getRandomQuestion);
                    this.response.speak(response + getRandomQuestion()).listen(getRandomQuestion());
                    
                    if (this.event.context.System.device.supportedInterfaces.Display)
                    {
                        const makeTextContent = Alexa.utils.TextUtils.makeTextContent;
                        const makePlainText = Alexa.utils.TextUtils.makePlainText;
                        const makeRichText = Alexa.utils.TextUtils.makeRichText;
                        const makeImage = Alexa.utils.ImageUtils.makeImage;
                        
                        var backgroundImage = makeImage("https://m.media-amazon.com/images/G/01/jeffblankenburg/skills/gamesback/mlb/" + getLeague(userTeam.conference.toUpperCase()).toLowerCase().replace(" ", "-") + "._TTH_.png");
                        
                        var builder = new Alexa.templateBuilders.ListTemplate1Builder();

                        var teams = [];
                        for (var i = 0; i< teamDivision.length; i++)
                        {
                            var token = teamDivision[i].first_name + " " + teamDivision[i].last_name;
                            var image = makeImage("https://m.media-amazon.com/images/G/01/jeffblankenburg/skills/gamesback/mlb/" + teamDivision[i].first_name.toLowerCase().replace(" ", "-") + "-" + teamDivision[i].last_name.toLowerCase().replace(" ", "-") + "._TTH_.png", 50, 50, "X_SMALL", token + " Logo");
                            var primaryText = "<font size='4'>" + token + "</font>";
                            var secondaryText = teamDivision[i].won + " - " + teamDivision[i].lost + "  |  " + (teamDivision[i].won/(teamDivision[i].won + teamDivision[i].lost)).toFixed(3).toString().replace("0.", ".") + "  |  STRK: " + teamDivision[i].streak + "  |  L10: " + teamDivision[i].last_ten.replace("-", " - ");
                            var tertiaryText = teamDivision[i].games_back;
                            if (tertiaryText === 0) tertiaryText = "-";
                            var textContent = makeTextContent(makeRichText(primaryText), makePlainText(secondaryText), makePlainText(tertiaryText));
                            var newTeam = {"token": teamDivision[i].last_name.toUpperCase(), "image": image, "textContent": textContent};
                            console.log("NEW TEAM = " + JSON.stringify(newTeam));
                            teams.push(newTeam);
                        }

                        let standingsTemplate = builder.setTitle(getLeague(userTeam.conference.toUpperCase()).toUpperCase() + " " + getDivision(userTeam.division.toUpperCase()).toUpperCase() + " STANDINGS").setToken("STANDINGS").setBackgroundImage(backgroundImage).setListItems(teams).build();
                        console.log("STANDINGS TEMPLATE = " + JSON.stringify(standingsTemplate));
                        this.response.renderTemplate(standingsTemplate);
                        
                    }
                    var cardImage = {smallImageUrl: "https://m.media-amazon.com/images/G/01/jeffblankenburg/skills/gamesback/mlb/" + userTeam.first_name.toLowerCase().replace(" ", "-") + "-" + userTeam.last_name.toLowerCase().replace(" ", "-") + "._TTH_.png", largeImageUrl: "https://m.media-amazon.com/images/G/01/jeffblankenburg/skills/gamesback/mlb/" + userTeam.first_name.toLowerCase().replace(" ", "-") + "-" + userTeam.last_name.toLowerCase().replace(" ", "-") + "._TTH_.png"}
                    this.response.cardRenderer(userTeam.first_name + " " + userTeam.last_name, response, cardImage);
                    this.emit(":responseReady");
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
    "ElementSelected": function () {
        console.log("DISPLAY.ELEMENTSELECTED INTENT!")
        this.emitWithState("GetGamesBack");
        //this.emit(":tell", "Display Dot Element Selected Intent!  Good job, Jeff!");
    },
    "Unhandled": function() {
        console.log("UNHANDLED!");
        console.log("THIS.EVENT = " + JSON.stringify(this.event));
        this.emit(":tell", "Goodbye.");
    }
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function getResponse(data, secondPlace)
{
    if (data.games_back > 0) return "The " + data.first_name + " " + data.last_name + " are " + formatGamesBack(data.games_back) + " in the " + getLeague(data.conference) + " " + getDivision(data.division) + ". They are in " + data.ordinal_rank + " place, with a record of " + data.won + " and " + data.lost + ". ";
    else return "The " + data.first_name + " " + data.last_name + " are currently in first place in the " + getLeague(data.conference) + " " + getDivision(data.division) + ", with a record of " + data.won + " and " + data.lost + ". The " + secondPlace.first_name + " " + secondPlace.last_name + " are " + formatGamesBack(secondPlace.games_back) + ", in second place. ";
}

function formatGamesBack(gamesBack)
{
    if (gamesBack === 0.5) return "a half game back";
    else if (gamesBack.toString().includes(".5")) return gamesBack.toString().replace(".5", " and a half games back");
    else return gamesBack + " games back";
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
    console.log("LEAGUE = " + league);
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