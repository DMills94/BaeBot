const fs = require("fs");
const Discord = require("discord.js");
const { prefix, token, baeID, wiquedID } = require("./config.json")

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands");

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

commandHistory = [];

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
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
    client.user.setActivity(`Stuck? Try ${prefix}help!`);

    let commandHistory = [];
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
        let playNum = 5;
        let top5 = true;

        //If specific top play remove numbers
        if (commandName.includes("top") && commandName.length > 3) {
            playNum = parseInt(commandName.slice(3));
            if (playNum < 1 || playNum > 100) {
                message.channel.send(`Please select a number between 1-100 for \` ${prefix}topx\``);
                return;
            }
            commandName = "top";
            top5 = false;
        }

        //Prefix Commands
        if (!client.commands.has(commandName))
            return;

        const command = client.commands.get(commandName);

        try {
            if (command.name !== "history") {
                let rankingEmojis;
                if (command.name === "top" || command.name === "recent" || command.name === "compare") {
                    rankingEmojis = client.guilds.find("id", "486497815367778304").emojis;
                }
                if (command.name === "top") {
                    command.execute(message, args, playNum, top5, rankingEmojis);
                    console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}]: ${command.name}`);
                }
                else if (command.name === "recent" || command.name === "compare") {
                    command.execute(message, args, rankingEmojis);
                    console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}]: ${command.name}`);
                }
                else {
                command.execute(message, args);
                console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}]: ${command.name}`);
                }

                //Update history
                commandHistory.unshift(uI.slice(prefix.length));
                if (commandHistory.length > 5) {
                    commandHistory.pop();
                }
            } else {
                command.execute(message, args, commandHistory);
                console.log(client, message);
                console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}]: ${command.name}`);
            }



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
        console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}]: recognise beatmap`);
    }
});

//Start Bot
client.login(token);
