const fs = require('fs');
const Discord = require('discord.js');
const {
  prefix,
  token
} = require('./config.json')

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands');

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('ready', () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  client.channels.get("438985438548459530").send("BaeBot reporting for dooty!");
  client.user.setActivity("Stuck? Try `help!");
});


//Recording incoming messages
client.on('message', message => {
  //Bot ignores self
  if (message.author.bot) return;

  //Record message
  uI = message.content.toLowerCase();

  //Check for Prefix
  if (uI.startsWith(prefix)) {
    const args = uI.slice(prefix.length).split(" ");
    const commandName = args.shift();

    //Prefix Commands
    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    try {
      command.execute(message, args)
    } catch (error) {
      console.error(error);
      message.reply('There was an error with that command! Details: ' + error);
    }
  }

  //No-Prefix Commands
  if (uI.includes(":pepehands:")) {
    client.commands.get('pepehands').execute(message, uI);
  }

  if (uI.includes("goodbye")) new Promise(function(resolve, reject) {
    const itsbaeChamp = client.emojis.find("name", "itsbaeChamp");
    message.reply(`cya! ${itsbaeChamp}`)
  });
});

//Start Bot
client.login(token);
