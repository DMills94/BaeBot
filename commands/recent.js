const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../databases/requests.js')

module.exports = {
    name: 'recent',
    description: `Returns a user's most recent play`,
    async execute(m, args, emojis) {
        let user = []
        let username

        if (args.length === 0) {
            user = await database.checkForLink(m.author.id)
        }
        else if (args[0].startsWith('<@')) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith('!')) {
                discordId = discordId.slice(1)
            }
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


        //osu API calls
        const userInfo = await functions.getUser(username, 0)

        if (!userInfo)
            return m.channel.send('That username does not exist! Please try again.')

        const recent = (await functions.getUserRecent(username))[0]

        if (!recent)
            return m.channel.send(`That user has not played a loved or ranked map in the previous 24 hours so I can't find their score! :(`)

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

        const rankImage = emojis.find('name', recent.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        const mapStatus = functions.approvedStatus(beatmapInfo.approved)

        let embed = new Discord.RichEmbed()
            .setColor('#0096CF')
            .setAuthor(`Recent Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setTitle(`${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`)
            .setURL(`https://osu.ppy.sh/b/${beatmapInfo.beatmap_id}`)
            .addField(`\u2022 ${diffImage} **${ppInfo.formattedStars}*** ${recent.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((recent.score)).toLocaleString('en')} (${recent.accuracy}%) | ${recent.rank === 'F_' ? '~~**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `\u2022 ${recent.maxcombo === beatmapInfo.max_combo ? '**' + recent.maxcombo + '**' : recent.maxcombo}x/**${beatmapInfo.max_combo}x** {${recent.count300}/${recent.count100}/${recent.count50}/${recent.countmiss}} | ${recent.date}`)
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
                .setDescription(`__**PERSONAL BEST #${recent.playNumber}**__`)
                .setColor(colour)
        }

        //Send Embed to Channel
        m.channel.send({ embed })

        database.storeBeatmap(m.channel.id, beatmapInfo, recent)
    }
}