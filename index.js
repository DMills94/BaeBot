const fs = require('fs');
const Discord = require('discord.js');
const {prefix, token} = require('./config.json')

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands');

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

commandHistory = [];

client.on('ready', () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.channels.get("476676731755823105").fetchMessage("476680709428346880")
        .then(message => {
            currentTime = new Date();
            date = currentTime.toDateString();
            time = currentTime.toTimeString();
            message.edit(`I am online! Last refresh on **${date}** at **${time}**`);
        })
        .catch(console.error);
    client.user.setActivity("Stuck? Try `help!");

    let commandHistory = [];
});

client.on('error', () => {
    client.channels.get("476676731755823105").fetchMessage("476680709428346880")
        .then(message => {
            message.edit("Offline!");
        })
        .catch(console.error);
})

//Recording incoming messages
client.on('message', message => {
    //Bot ignores self
    if (message.author.bot)
        return;

    //Record message
    uI = message.content.toLowerCase();

    //Check for Prefix
    if (uI.startsWith(prefix)) {

        const args = uI.slice(prefix.length).split(" ");
        const commandName = args.shift();

        //Prefix Commands
        if (!client.commands.has(commandName))
            return;

        const command = client.commands.get(commandName);

        try {
            if (command.name !== "history") {
                command.execute(message, args);
                console.log(`[EXECUTED COMMAND]: ${command.name}`);

                //Update history
                commandHistory.unshift(uI.slice(prefix.length));
                if (commandHistory.length > 5) {
                    commandHistory.pop();
                }
            } else {
                command.execute(message, args, commandHistory);
                console.log(`[EXECUTED COMMAND]: ${command.name}`);
            }



        } catch (error) {
            console.error(error);
            message.reply('There was an error with that command! Details: ' + error);
        }
    }

    //No-Prefix Commands
    if (uI.includes(":pepehands:")) {
        client.commands.get('pepehands').execute(message, uI);
    }

    if (uI.includes("goodbye") || uI.includes("good bye"))
        new Promise(function(resolve, reject) {
            const konCha = client.emojis.find("name", "KonCha");
            message.reply(`cya! ${konCha}`)
        });

    if (uI.includes("good bot")) {
        if (message.author.id === "122136963129147393") {
            message.channel.send("S...senpai owo")
        }
        else if (message.author.id === "138368170481156096") {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            const itsbaeChamp = client.emojis.find("name", "itsbaeChamp")
            message.channel.send(`Thanks! ${itsbaeChamp}`);
        }
    }

    if (uI.includes("bad bot")) {
        if (message.author.id === "138368170481156096") {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`);
        }
        else {
            message.channel.send("I'm sorry :( If i'm not working correctly please contact my owner `@Bae#3308`");
        }
    }

    if (uI.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i)) {
        client.commands.get('recognise beatmap').execute(message, uI);
        console.log(`[EXECUTED COMMAND]: recognise beatmap`);
    }
});

//Start Bot
client.login(token);
