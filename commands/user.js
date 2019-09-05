const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const { prefix } = require('../config')
const { checkForLink } = require('../databases/requests/links.js')

module.exports = {
    name: 'user',
    description: 'Returns stats on the user\'s osu profile',
    async execute(m, args, emojis) {

        let username
        let user
        let more = false
        let embed

        if (args[0] === '-pp') {
            args.shift()
            more = true
        }

        if (args.length === 0) {
            user = await checkForLink(m.author.id)
        }
        else if (args[0].startsWith('<@')) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith('!')) {
                discordId = discordId.slice(1)
            }
            user = await checkForLink(discordId)
        }
        else {
            username = args.join('_')
        }
        
        if (user)
            username = user.osuId
        
        if (!username){
            m.react('❎')
            return m.channel.send(`No linked account could be found! \:sob: try \`${prefix}link [username]\``)
        }

        const userInfo = await functions.getUser(username)

        if (userInfo === undefined)
            return m.channel.send(`The username \`${username}\` does not exist! Please try again 🙂`)

        const currentDate = Date.now()

        if (!more) {

            let SSH = emojis.find('name', 'XH')
            let SS = emojis.find('name', 'X_')
            let SH = emojis.find('name', 'SH')
            let S = emojis.find('name', 'S_')
            let A = emojis.find('name', 'A_')

            const joinDate = new Date(userInfo.join_date)
            const formattedJoinDate = `${joinDate.getDate()}/${joinDate.getMonth() + 1}/${joinDate.getFullYear()} at ${joinDate.getHours()}:${joinDate.getMinutes()}`

            embed = new Discord.RichEmbed()
                .setColor('#fcee03')
                .setAuthor(`osu! Standard stats for ${userInfo.username}`, undefined, 'https://osu.ppy.sh/users/' + userInfo.user_id)
                .setThumbnail(`https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`)
                .addField(`${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(userInfo.pp_rank).toLocaleString('en')} \:flag_${userInfo.country.toLowerCase()}: #${parseInt(userInfo.pp_country_rank).toLocaleString('en')}`,
                    `**Join date:** ${formattedJoinDate}\n**Account Level:** ${parseFloat(userInfo.level).toFixed(2)}\n**Total Score:** ${parseInt(userInfo.total_score).toLocaleString('en')}\n**Ranked Score:** ${parseFloat(userInfo.ranked_score).toLocaleString('en')}\n**Accuracy:** ${parseFloat(userInfo.accuracy).toFixed(2)}%\n**Play Count:** ${parseInt(userInfo.playcount).toLocaleString('en')}\n**Playtime:** ${parseFloat(userInfo.total_seconds_played / 60 / 60).toLocaleString('en', { maximumFractionDigits: 2 })} hours\n**Total Hits:** ${parseInt(parseInt(userInfo.count300) + parseInt(userInfo.count100) + parseInt(userInfo.count50)).toLocaleString('en')}\n\n${SSH}: ${parseInt(userInfo.count_rank_ssh).toLocaleString('en')} ${SS}: ${parseInt(userInfo.count_rank_ss).toLocaleString('en')} ${SH}: ${parseInt(userInfo.count_rank_sh).toLocaleString('en')} ${S}: ${parseInt(userInfo.count_rank_s).toLocaleString('en')} ${A}: ${parseInt(userInfo.count_rank_a).toLocaleString('en')}`
                )
                .setFooter(`Try [[ ${prefix}user -pp ]] for performance stats`)

            m.channel.send({ embed: embed })
        }
        else {
            let scores = 0
            const message = await m.channel.send(`Processing top scores for \`${userInfo.username}\`, this can take a while... | \`${scores}/100\``)

            let maxPP
            let minPP
            let ppRange
            let zeroMiss = 0
            let cumulativePP = 0
            let totalMapLength = 0
            let totalMapCombo = 0
            let top100

            try {
                top100 = await functions.getUserTop(userInfo.username, 100)
            }
            catch(err) {
                message.edit(`Something went wrong! \:sob: Please try again!`)
                return setTimeout(() => {
                    message.delete()
                }, 10000);
            }

            maxPP = parseFloat(top100[0].pp).toFixed(2)
            minPP = parseFloat(top100[top100.length-1].pp).toFixed(2)
            ppRange = (maxPP - minPP).toFixed(2)

            try {
                for (let play in top100) {
                    const beatmapInfoRaw = await functions.getBeatmap(top100[play].beatmap_id)
                    const beatmapInfo = beatmapInfoRaw[0]

                    const enabledMods = await functions.determineMods(top100[play].enabledMods)

                    cumulativePP += parseFloat(top100[play].pp)
                    
                    if (enabledMods.includes('DT') || enabledMods.includes('NC')) {
                        totalMapLength += parseInt(beatmapInfo.total_length / 1.5)
                    }
                    else if (enabledMods.includes('HT')) {
                        totalMapLength += parseInt(beatmapInfo.total_length * (1 + 1 / 3))
                    }
                    else {
                        totalMapLength += parseInt(beatmapInfo.total_length)
                    }

                    totalMapCombo += parseInt(beatmapInfo.max_combo)

                    if (top100[play].perfect === '1')
                        zeroMiss++

                    scores = scores + 1

                    if (scores % 8 === 0)
                        message.edit(`Processing top scores for \`${userInfo.username}\`, this can take a while... | \`${scores}/100\``)
                }
            }
            catch(err) {
                message.edit('Seems there was an issue processing your top plays! \:sob: Please try again!')
                return setTimeout(() => {
                    message.delete()
                }, 10000);
            }

            const ppAvg = (cumulativePP / top100.length).toFixed(2)
            const ppPerPlay = parseFloat(cumulativePP / parseInt(userInfo.playcount)).toFixed(2)
            let avgLengthMin = Math.floor((totalMapLength / top100.length) / 60)
            let avgLengthSec = Math.round((totalMapLength / top100.length) - avgLengthMin * 60)

            if (avgLengthSec === 60) {
                avgLengthMin++
                avgLengthSec = 0
            }
            const avgCombo = totalMapCombo / top100.length


            if (avgLengthSec < 10) {
                avgLengthSec = '0' + avgLengthSec.toString()
            }

            embed = new Discord.RichEmbed()
                .setColor('#fcee03')
                .setAuthor(`osu! Standard stats for ${userInfo.username}`, undefined, 'https://osu.ppy.sh/users/' + userInfo.user_id)
                .setThumbnail(`https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`)
                .addField(
                    `${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp \:earth_africa: #${parseInt(userInfo.pp_rank).toLocaleString('en')} \:flag_${userInfo.country.toLowerCase()}: #${userInfo.pp_country_rank}`,
                    `**PP Range:** ${maxPP}pp - ${minPP}pp = ${ppRange}pp\n**PP Average:** ${ppAvg}pp\n**Perfect plays in top 100:** ${zeroMiss}\n**Cumulative unweighted PP:** ${parseFloat(cumulativePP).toLocaleString('en', { maximumFractionDigits: 2 })}pp\n**Play Count:** ${parseFloat(userInfo.playcount).toLocaleString('en')}\n**Average unweighted PP per play:** ${ppPerPlay}\n**Preferred Map Length:** ${avgLengthMin}:${avgLengthSec}\n**Preferred Map Max Combo:** ${Math.round(avgCombo)}`
                )
                .addField(
                    `More Stats for ${userInfo.username}`, 
                    `[osu!track](https://ameobea.me/osutrack/user/${userInfo.username.split(' ').join('_')}) • [osu!stats](https://osustats.ppy.sh/u/${userInfo.username.split(' ').join('_')}) • [osu!skills](http://osuskills.com/user/${userInfo.username.split(' ').join('_')}) • [osu!chan](https://syrin.me/osuchan/u/${userInfo.user_id}) • [pp+](https://syrin.me/pp+/u/${userInfo.user_id})`
                )
                .setFooter(`• Try [[ ${prefix}user ]] for account stats`)

            message.edit({ embed: embed })
        }
    }
}
