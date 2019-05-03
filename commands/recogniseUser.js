const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const { prefix } = require('../config')

module.exports = {
    name: 'recognise user',
    description: 'Gets information about a user link posted in chat',
    async execute(m, args, emojis) {
        
        const splitArgs = args.split(' ')
        let userURL

        // Isolate url
        for (let arg in splitArgs) {
            if (splitArgs[arg].match(/https?:\/\/(osu|new).ppy.sh\/([u]|users)\//i)) {
                userURL = splitArgs[arg]
                break
            }
        }

        // Get user ID
        const userId = userURL.split('/')[4]
        
        const userInfo = await functions.getUser(userId)

        if (userInfo === undefined)
            return

        const currentDate = Date.now()

        let SSH = emojis.find('name', 'XH')
        let SS = emojis.find('name', 'X_')
        let SH = emojis.find('name', 'SH')
        let S = emojis.find('name', 'S_')
        let A = emojis.find('name', 'A_')

        embed = new Discord.RichEmbed()
            .setColor('#fcee03')
            .setAuthor(`osu! Standard stats for ${userInfo.username}`, undefined, 'https://osu.ppy.sh/users/' + userInfo.user_id)
            .setThumbnail(`https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`)
            .addField(`${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(userInfo.pp_rank).toLocaleString('en')} \:flag_${userInfo.country.toLowerCase()}: #${parseInt(userInfo.pp_country_rank).toLocaleString('en')}`,
                `**Accuracy:** ${parseFloat(userInfo.accuracy).toFixed(2)}%\n**Play Count:** ${parseInt(userInfo.playcount).toLocaleString('en')}\n**Account Level:** ${parseFloat(userInfo.level).toFixed(2)}\n\n${SSH}: ${parseInt(userInfo.count_rank_ssh).toLocaleString('en')} ${SS}: ${parseInt(userInfo.count_rank_ss).toLocaleString('en')} ${SH}: ${parseInt(userInfo.count_rank_sh).toLocaleString('en')} ${S}: ${parseInt(userInfo.count_rank_s).toLocaleString('en')} ${A}: ${parseInt(userInfo.count_rank_a).toLocaleString('en')}`
            )
            .setFooter(`Want more info? Try [[ ${prefix}user ${userInfo.username} ]]`)

        m.channel.send({ embed: embed })
    }
}