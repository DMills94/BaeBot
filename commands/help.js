const Discord = require('discord.js')
const { prefix } = require('../config.json')

module.exports = {
  name: "help",
  description: "Command List",
  execute(m) {

    let embed = new Discord.RichEmbed()
      .setColor("#fd0000")
      .setAuthor("List of bot commands")
      .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
      .addField(`${prefix}history`, 'History of commands used since bot went online')
      .addField(`${prefix}osu`, 'List of osu! commands')
      .addField(`${prefix}ping`, 'Check if the bot is live')
      .addField(`${prefix}roll`, 'Generate a random number between 1-100')
      .addField(`${prefix}server`, 'Tells you what about the server you are in')
      .addField(`${prefix}whoami`, 'Tell you about you')
      .setFooter("Contact @Bae#3308 with any issues", "https://cdn.discordapp.com/avatars/122136963129147393/a_9ca3ec15b8776bf77cafe30d78b3ad96")

    m.channel.send({ embed })
  },
}
