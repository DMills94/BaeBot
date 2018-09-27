const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const {prefix} = require('../config')

module.exports = {
    name: "user",
    description: "Returns stats on the user's osu profile",
    async execute(m, args, db, rankingEmojis) {

        let username
        let mode = 0
        let more = false
        let embed

        if (args[0] === '-pp') {
            args.shift()
            more = true
        }

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id, db)
                .catch(() => {
                    m.reply("you do not have a linked account! Try ` `link [username]`")
                    return
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1)
            }
            username = await functions.lookupUser(discordId, db)
                .catch(() => {
                    m.reply("they do not have a linked account so I cannot find their user information :(")
                    return
                })
        }
        else {
            username = args.join('_')
        }

        if (!username) {
            return
        }

        const user = await functions.getUser(username, mode)

        if (user === undefined)
            return m.reply("that username does not exist! Please try again.")

        if (!more) {

            let SSH = rankingEmojis.find('name', 'XH')
            let SS = rankingEmojis.find('name', 'X_')
            let SH = rankingEmojis.find('name', 'SH')
            let S = rankingEmojis.find('name', 'S_')
            let A = rankingEmojis.find('name', 'A_')

            embed = new Discord.RichEmbed()
                .setColor("#fcee03")
                .setAuthor(`osu! Standard stats for ${user.username}`, undefined, "https://osu.ppy.sh/users/" + user.user_id)
                .setThumbnail("https://a.ppy.sh/" + user.user_id)
                .addField(`${parseFloat(user.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(user.pp_rank).toLocaleString('en')} \:flag_${user.country.toLowerCase()}: #${user.pp_country_rank}`,
                    `**Ranked Score:** ${parseFloat(user.ranked_score).toLocaleString('en')}
                    **Accuracy:** ${parseFloat(user.accuracy).toFixed(2)}%
                    **Play Count:** ${parseInt(user.playcount).toLocaleString('en')}
                    **Playtime:** ${parseFloat(user.total_seconds_played / 60 / 60).toFixed(2)} hours
                    **Total Score:** ${parseInt(user.total_score).toLocaleString('en')}
                    **Account Level:** ${parseFloat(user.level).toFixed(2)}
                    **Total Hits:** ${parseInt(parseInt(user.count300) + parseInt(user.count100) + parseInt(user.count50)).toLocaleString('en')}
                    ${SSH}: ${user.count_rank_ssh} ${SS}: ${user.count_rank_ss} ${SH}: ${user.count_rank_sh} ${S}: ${user.count_rank_s} ${A}: ${user.count_rank_a}`
                )
                .setFooter(`Try [[ ${prefix}user -pp ]] for performance stats | Something missing you think you'd like? Contact @Bae#3308 with it!`)
                .setTimestamp()

            m.channel.send({embed: embed})
        }
        else {
            let scores = 100
            const message = await m.channel.send(`Processing top scores for \`${user.username}\`, this can take a while... (${scores}/100)`)

            let maxPP = 0
            let minPP = 0
            let ppRange = 0
            let ppAvg = 0
            let zeroMiss= 0
            let zeroMissPerc
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
                .setAuthor(`osu! Standard stats for ${user.username}`, undefined, "https://osu.ppy.sh/users/" + user.user_id)
                .setThumbnail("https://a.ppy.sh/" + user.user_id)
                .addField(`${parseFloat(user.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(user.pp_rank).toLocaleString('en')} \:flag_${user.country.toLowerCase()}: #${user.pp_country_rank}`,
                    `**PP Range:** ${maxPP}pp - ${minPP}pp = ${ppRange}pp
                    **PP Average:** ${ppAvg}pp
                    **Perfect plays in top 100:** ${zeroMiss}
                    **Cumulative unweighted PP:** ${parseFloat(cumulativePP).toLocaleString('en')}pp
                    **Play Count:** ${parseFloat(user.playcount).toLocaleString('en')}
                    **Average unweighted PP per play:** ${ppPerPlay}
                    **Preferred Map Length:** ${avgLengthMin}:${avgLengthSec}
                    **Preferred Map Max Combo:** ${Math.round(avgCombo)}`
                )
                .addField(`More Stats for ${user.username}`,
                    `[osu!track](https://ameobea.me/osutrack/user/${user.username}) | [osu!stats](https://osustats.ppy.sh/u/${user.username}) | [osu!skills](http://osuskills.tk/user/${user.username}) | [osu!chan](https://syrin.me/osuchan/u/${user.user_id}) | [pp+](https://syrin.me/pp+/u/${user.user_id})`
                )
                .setFooter(`
                    Try [[ ${prefix}user ]] for account stats | Something missing you think you'd like? Contact @Bae#3308 with it!`
                )
                .setTimestamp()

            message.edit({embed: embed})
        }
    }
}
