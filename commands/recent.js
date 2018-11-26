const Discord = require('discord.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'recent',
    description: `Returns a user's most recent play`,
    async execute(m, args, rankingEmojis) {
        let username

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id)
                .catch(err => {
                    m.reply('you do not have a linked account! Try ` `link [username]`')
                    return
                })
        }
        else if (args[0].startsWith('<@')) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith('!')) {
                discordId = discordId.slice(1)
            }
            username = await functions.lookupUser(discordId)
                .catch(() => {
                    m.reply('they do not have a linked account so I cannot find their top plays :(')
                    return
                })
        }
        else {
            username = args.join('_')
        }

        if (!username) {
            return
        }

        //osu API calls
        const userInfo = await functions.getUser(username, 0)

        if (!userInfo)
            return m.reply('That username does not exist! Please try again.')

        const recent = (await functions.getUserRecent(username))[0]

        if (!recent)
            return m.reply(`That user has not played a loved or ranked map in the previous 24 hours so I can't find their score! :(`)

        const beatmapInfo = (await functions.getBeatmap(recent.beatmap_id))[0]

        const topPlays = await functions.getUserTop(username, 100)

        for (let play in topPlays) {
            let scoreMatch = true

            delete topPlays[play]['pp']

            const aProps = Object.getOwnPropertyNames(recent)
            const bProps = Object.getOwnPropertyNames(topPlays[play])

            if (aProps.length !== bProps.length) {
                scoreMatch = false
            }

            for (let prop in aProps) {
                const propName = aProps[prop]

                if (recent[propName] !== topPlays[play][propName] && propName !== 'date') {
                    scoreMatch = false
                }
            }

            if (scoreMatch) {
                recent.playNumber = parseInt(play) + 1
            }
        }

        recent.enabled_mods = functions.determineMods(recent)

        recent.accuracy = functions.determineAcc(recent)

        let playDate = Date.parse(recent.date)
        let currentDate = Date.now() - 0
        recent.date = functions.timeDifference(currentDate, playDate)

        const ppInfo = await functions.calculate(beatmapInfo, recent)

        if (recent.rank.length === 1) {
            recent.rank += '_'
        }

        const rankImage = rankingEmojis.find('name', recent.rank)

        const mapStatus = functions.approvedStatus(beatmapInfo.approved)

        let embed = new Discord.RichEmbed()
            .setColor('#0096CF')
            .setAuthor(`Recent Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setDescription(`**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`)
            .addField(`\u2022 \:star: **${ppInfo.formattedStars}*** ${recent.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((recent.score)).toLocaleString('en')} (${recent.accuracy}%) | ${recent.rank === 'F_' ? '~~**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `\u2022 ${recent.maxcombo === beatmapInfo.max_combo ? '**' + recent.maxcombo + '**' : recent.maxcombo}x/**${beatmapInfo.max_combo}x** {${recent.count300}/${recent.count100}/${recent.count50}/${recent.countmiss}} | ${recent.date}`)
            .setFooter(`${mapStatus} | Beatmap by ${beatmapInfo.creator} | Message sent: `)
            .setTimestamp()

        if (recent.playNumber) {
            switch (recent.playNumber) {
                case 1:
                    colour = '#FFD700'
                    break
                case 2:
                    colour = '#FFFFFF'
                    break
                case 3:
                    colour = '#cd7f32'
                    break
                default:
                    colour = '#0096CF'
                    break
            }

            embed
                .setTitle(`__PERSONAL BEST #${recent.playNumber}__`)
                .setColor(colour)
        }

        //Send Embed to Channel
        m.channel.send({ embed })

        functions.storeLastBeatmap(m.guild, beatmapInfo, recent)
    }
}