const Discord = require('discord.js');
const config = require('./config.json')
const client = new Discord.Client();

client.on('ready', () => {
    console.log('Ready!');
});


//Recording incoming messages
client.on('message', message => {
  //Bot ignores self
  if (message.author.bot) return;
  //Record message
  var uI = message.content;
  var t0 = Date.now(); //for response times

  //Prefix Commands
  if (message.content.startsWith(config.prefix)) {
    uI = removePrefix(uI);
    if (uI.startsWith("ping")) { //ping
      var t1 = Date.now();
      message.channel.send("Pong! (time: " + (t1 - t0) + "ms)");
    }
    else if (uI === "listemojis") { //
      const emojiList = message.guild.emojis.map(e => e.toString()).join(" ");
      message.channel.send(emojiList);
    }
  }

  //Non Prefix commands
  if (uI.toUpperCase().includes("SOLO")) {
    message.channel.send("Solo Best Fan");
  } else if (uI.toUpperCase().includes(":PEPEHANDS:")) {
    message.channel.send((message.guild.emojis.find("name", "PepeHands").toString()));
  }
});

//For Prefix Commands
function removePrefix(m) {
  o = m.substr(1);
  return o;
}

//Start Bot
client.login(config.token);
