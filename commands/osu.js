const Discord = require('discord.js')
const { prefix } = require('../config.json')

module.exports = {
    name: 'osu',
    description: 'All commands relating to osu and its API',
    execute(m) {

        //Help
        let embed = new Discord.RichEmbed()
            .setColor('#fd0000')
            .setThumbnail('https://vignette.wikia.nocookie.net/logopedia/images/d/d3/Osu%21Logo_%282015%29.png/revision/latest/scale-to-width-down/480?cb=20180326010029')
            .setAuthor('osu! related commands')
            .addField(`${prefix}compare [USER_NAME]`, 'Compares the users best score on the last beatmap posted.')
            .addField(`${prefix}link/unlink [USER_NAME]`, 'Links/Unlinks your discord account to an osu! username')
            .addField(`${prefix}recent/r [USER_NAME]`, 'Displays the users most recent play (within 24 hours)')
            .addField(`${prefix}rb [USER_NAME] / rb[x] [USER_NAME]`, 'Shows the users recent best score, or X recent best where X is an integer between 1 and 100.')
            .addField(`${prefix}track`, `**__[ADMIN ONLY COMMAND]__**\nUse \`${prefix}track -help\` for more info!`)
            .addField(`${prefix}top [USER_NAME] / top[x] [USER_NAME]`, 'Display a users Top-5, or Top-X play where X is an integer between 1 and 100.')
            .addField(`${prefix}user [USER_NAME]`, 'Look up basic profile stats of a user')
            .setFooter('Contact @Bae#3308 with any issues', 'https://cdn.discordapp.com/avatars/122136963129147393/a_9ca3ec15b8776bf77cafe30d78b3ad96')

        m.channel.send({ embed })
    }
}
