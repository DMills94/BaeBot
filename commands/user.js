const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const { prefix } = require('../config')
const database = require('../databases/requests.js')

module.exports = {
    name: "user",
    description: "Returns stats on the user's osu profile",
    async execute(m, args, emojis) {

        let username
        let user = []
        let mode = 0
        let more = false
        let embed

        if (args[0] === '-pp') {
            args.shift()
            more = true
        }

        if (args.length === 0) {
            // username = await functions.lookupUser(m.author.id)
            user = await database.checkForLink(m.author.id)
        }
        else if (args[0].startsWith('<@')) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith('!')) {
                discordId = discordId.slice(1)
            }
            // username = await functions.lookupUser(discordId)
            user = await database.checkForLink(discordId)
        }
        else {
            username = args.join('_')
        }
        
        if (user.length >  0)
            username = user[0].osuIGN
        
        if (!username){
            m.react('❎')
            return m.channel.send('No linked account could be found! I cannot find their top plays \:sob:')
        }

        const userInfo = await functions.getUser(username, mode)

        if (userInfo === undefined)
            return m.reply("that username does not exist! Please try again.")

        if (!more) {

            let SSH = emojis.find('name', 'XH')
            let SS = emojis.find('name', 'X_')
            let SH = emojis.find('name', 'SH')
            let S = emojis.find('name', 'S_')
            let A = emojis.find('name', 'A_')

            embed = new Discord.RichEmbed()
                .setColor("#fcee03")
                .setAuthor(`osu! Standard stats for ${userInfo.username}`, undefined, "https://osu.ppy.sh/users/" + userInfo.user_id)
                .setThumbnail("https://a.ppy.sh/" + userInfo.user_id)
                .addField(`${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(userInfo.pp_rank).toLocaleString('en')} \:flag_${userInfo.country.toLowerCase()}: #${userInfo.pp_country_rank}`,
                    `**Ranked Score:** ${parseFloat(userInfo.ranked_score).toLocaleString('en')}
                    **Accuracy:** ${parseFloat(userInfo.accuracy).toFixed(2)}%
                    **Play Count:** ${parseInt(userInfo.playcount).toLocaleString('en')}
                    **Playtime:** ${parseFloat(userInfo.total_seconds_played / 60 / 60).toFixed(2)} hours
                    **Total Score:** ${parseInt(userInfo.total_score).toLocaleString('en')}
                    **Account Level:** ${parseFloat(userInfo.level).toFixed(2)}
                    **Total Hits:** ${parseInt(parseInt(userInfo.count300) + parseInt(userInfo.count100) + parseInt(userInfo.count50)).toLocaleString('en')}
                    ${SSH}: ${userInfo.count_rank_ssh} ${SS}: ${userInfo.count_rank_ss} ${SH}: ${userInfo.count_rank_sh} ${S}: ${userInfo.count_rank_s} ${A}: ${userInfo.count_rank_a}`
                )
                .setFooter(`Try [[ ${prefix}user -pp ]] for performance stats | Something missing you think you'd like? Contact @Bae#3308 with it!`)
                .setTimestamp()

            m.channel.send({ embed: embed })
        }
        else {
            let scores = 100
            const message = await m.channel.send(`Processing top scores for \`${userInfo.username}\`, this can take a while... (${scores}/100)`)

            let maxPP = 0
            let minPP = 0
            let ppRange = 0
            let ppAvg = 0
            let zeroMiss= 0
            let cumulativePP = 0
            let ppPerPlay
            let totalMapLength = 0
            let avgLengthMin = 0
            let avgLengthSec = 0
            let totalMapCombo = 0
            let avgCombo

            const top100 = await functions.getUserTop(username, 100)

            maxPP = parseFloat(top100[0].pp).toFixed(2)
            minPP = parseFloat(top100[top100.length-1].pp).toFixed(2)
            ppRange = (maxPP - minPP).toFixed(2)

            for (let play in top100) {

                const beatmapInfoRaw = await functions.getBeatmap(top100[play].beatmap_id)
                const beatmapInfo = beatmapInfoRaw[0]

                cumulativePP += parseFloat(top100[play].pp)
                totalMapLength += parseInt(beatmapInfo.total_length)
                totalMapCombo += parseInt(beatmapInfo.max_combo)

                if (top100[play].perfect === "1")
                    zeroMiss++

                scores = scores - 1

                if (scores % 8 === 0)
                    message.edit(`Processing top scores for \`${user.username}\`, this can take a while... (${scores}/100)`)
            }

            zeroMissPerc = zeroMiss / top100.length * 100
            ppAvg = (cumulativePP / top100.length).toFixed(2)
            ppPerPlay = parseFloat(cumulativePP / parseInt(user.playcount)).toFixed(2)
            avgLengthMin = Math.floor((totalMapLength / top100.length) / 60)
            avgLengthSec = Math.round((totalMapLength / top100.length) - avgLengthMin * 60)
            avgCombo = totalMapCombo / top100.length


            if (avgLengthSec < 10) {
                avgLengthSec = "0" + avgLengthSec.toString()
            }

            embed = new Discord.RichEmbed()
                .setColor("#fcee03")
                .setAuthor(`osu! Standard stats for ${userInfo.username}`, undefined, "https://osu.ppy.sh/users/" + userInfo.user_id)
                .setThumbnail("https://a.ppy.sh/" + userInfo.user_id)
                .addField(`${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(userInfo.pp_rank).toLocaleString('en')} \:flag_${userInfo.country.toLowerCase()}: #${userInfo.pp_country_rank}`,
                    `**PP Range:** ${maxPP}pp - ${minPP}pp = ${ppRange}pp
                    **PP Average:** ${ppAvg}pp
                    **Perfect plays in top 100:** ${zeroMiss}
                    **Cumulative unweighted PP:** ${parseFloat(cumulativePP).toLocaleString('en')}pp
                    **Play Count:** ${parseFloat(userInfo.playcount).toLocaleString('en')}
                    **Average unweighted PP per play:** ${ppPerPlay}
                    **Preferred Map Length:** ${avgLengthMin}:${avgLengthSec}
                    **Preferred Map Max Combo:** ${Math.round(avgCombo)}`
                )
                .addField(`More Stats for ${userInfo.username}`,
                    `[osu!track](https://ameobea.me/osutrack/user/${userInfo.username}) | [osu!stats](https://osustats.ppy.sh/u/${userInfo.username}) | [osu!skills](http://osuskills.com/user/${userInfo.username}) | [osu!chan](https://syrin.me/osuchan/u/${userInfo.user_id}) | [pp+](https://syrin.me/pp+/u/${userInfo.user_id})`
                )
                .setFooter(`
                    Try [[ ${prefix}user ]] for account stats | Something missing you think you'd like? Contact @Bae#3308 with it!`
                )
                .setTimestamp()

            message.edit({ embed: embed })
        }
    }
}
