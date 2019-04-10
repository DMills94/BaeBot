const Discord = require('discord.js')
const { prefix } = require('../config.json')

module.exports = {
  name: 'help',
  description: 'Command List',
  execute(m) {
    let embed = new Discord.RichEmbed()
      .setColor('#fd0000')
      .setAuthor('List of bot commands')
      .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
      .addField(`${prefix}osu`, 'List of osu! commands')
      .addField(`${prefix}ping`, 'Check if the bot is live')
      .addField(`${prefix}roll`, 'Generate a random number between 1-100')
      .addField(`${prefix}roulette [@user]`, 'Fight to the death in the classic pistol shootiing game')
      .addField(`${prefix}server`, 'Tells you what about the server you are in')
      .addField(`${prefix}toggle`, '**__[ADMIN COMMAND]__**\nChange some bot settings via this command!')
      .addField(`${prefix}whoami [@user]`, 'Tell you about you, or someone else!')
      .setFooter('Contact @Bae#3308 with any issues')

    m.channel.send({ embed })
  }
}
