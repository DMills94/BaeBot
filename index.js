const fs = require("fs");
const Discord = require("discord.js");
const { prefix, token, baeID, wiquedID } = require("./config.json")

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands");
const functions = require("./commands/exportFunctions.js");

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

commandHistory = [];

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(`Stuck? Try ${prefix}help!`);

    if (client.user.id === "438366424805933056") {
        client.channels.get("476676731755823105").fetchMessage("476680709428346880")
            .then(message => {
                currentTime = new Date();
                date = currentTime.toDateString();
                time = currentTime.toTimeString();
                message.edit(`I am online! Last refresh on **${date}** at **${time}**`);
            })
            .catch(err => {
                console.log(err);
            });
    }

    let commandHistory = [];
    const rankingEmojis = client.guilds.find("id", "486497815367778304").emojis;

    updateTop100(rankingEmojis);
    setInterval(updateTop100, 300000)
});

client.on("error", err => {
    console.log(err);
})

//Recording incoming messages
client.on("message", message => {
    //Bot ignores self
    if (message.author.bot)
        return;

    //Record message
    uI = message.content.toLowerCase();

    //Check for Prefix
    if (uI.startsWith(prefix)) {

        const args = uI.slice(prefix.length).split(" ");
        let commandName = args.shift();
        let playNum;
        let top5 = true;

        //If specific top play remove numbers
        if (commandName.includes("top") && commandName.length > 3) {
            playNum = parseInt(commandName.slice(3));
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${prefix}topx\``);
            };
            commandName = "top";
            top5 = false;
        }
        else if (commandName.includes("top")) {
            playNum = 5;
        };

        if (commandName.includes("rb") && commandName.length > 2) {
            playNum = parseInt(commandName.slice(2));
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${prefix}rbx\``);
            };
            commandName = "rb";
        }
        else if (commandName.includes("rb")) {
            playNum = 1;
        };

        //Prefix Commands
        if (!client.commands.has(commandName)) {
            return message.channel.send("Sorry that's not command I have :( \nIf you need help try ` `help`!");
        }

        const command = client.commands.get(commandName);

        try {
            if (command.name !== "history") {
                const rankingEmojis = client.guilds.find("id", "486497815367778304").emojis;

                command.execute(message, args, rankingEmojis, playNum, top5);

                //Update history
                commandHistory.unshift(uI.slice(prefix.length));
                if (commandHistory.length > 5) {
                    commandHistory.pop();
                }
            } else {
                command.execute(message, args, commandHistory);
            }

            logCommand(message, command.name);

        } catch (error) {
            console.error(error);
            message.reply("There was an error with that command! Details: " + error);
        }
    }

    //No-Prefix Commands

    if (message.isMentioned(client.user)) {
        if (message.author.id === wiquedID) {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            const emoteArray = Array.from(client.emojis);
            const randomEmote = emoteArray[Math.floor(Math.random() * emoteArray.length) + 1][1]
            message.channel.send(`${randomEmote}`);
        }
    }

    if (uI.includes(":pepehands:")) {
        const emoji = client.emojis.find("name", "PepeHands");
        message.react(emoji);
    }

    if (uI.startsWith("goodbye") || uI.startsWith("good bye")) {
        if (message.author.id === wiquedID) {
            message.reply(`cya thot! \:middle_finger:`);
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            const konCha = client.emojis.find("name", "KonCha");
            message.reply(`cya! ${konCha}`)
        };
    };

    if (uI === "good bot" || uI === "goodbot") {
        if (message.author.id === baeID) {
            message.channel.send("S...senpai owo")
        }
        else if (message.author.id === wiquedID) {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            const itsbaeChamp = client.emojis.find("name", "itsbaeChamp");
            message.channel.send(`Thanks! ${itsbaeChamp}`);
        }
    };

    if (uI === "bad bot" || uI === "badbot") {
        if (message.author.id === wiquedID) {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            message.channel.send("I am sorry :( If i am not working correctly please contact my owner `@Bae#3308`");
        }
    };

    if (uI.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i)) {
        client.commands.get("recognise beatmap").execute(message, uI);
        logCommand(message, "Recognise Beatmap");
    }
});

const logCommand = (message, command) => {
    currentTime = new Date();
    date = currentTime.toDateString().slice(4,10);
    time = currentTime.toTimeString().slice(0,9);
    console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}] for [${message.author.username}#${message.author.discriminator}]: ${command} on ${date} at ${time}`);
}

async function updateTop100(rankingEmojis) {
    const newScoresDuplicates = await functions.getTrackedUsersTop100();
    const newScores = newScoresDuplicates.filter((object, index) =>
        index === newScoresDuplicates.findIndex((obj) => (
            obj.date === object.date
        ))
    )
    if (newScores.length > 0) {
        console.log("New scores detected...posting");
        client.commands.get("postnew").execute(newScores, rankingEmojis, client.channels);
    };
}

//Start Bot
client.login(token);
