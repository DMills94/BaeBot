const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const { checkForLink } = require('../databases/requests/links.js')
const { storeBeatmap } = require('../databases/requests/lastBeatmap')
const config = require('../config.json')

module.exports = {
    name: 'recent',
    description: `Returns a user's most recent play`,
    async execute(m, args, emojis) {
        let user
        let username

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
            return m.channel.send(`No linked account could be found! \:sob: try \`${config.prefix}link [username]\``)
        }


        //osu API calls
        const userInfo = await functions.getUser(username)

        if (!userInfo)
            return m.channel.send(`The username \`${username}\` does not exist! Please try again 🙂`)

        const recent = (await functions.getUserRecent(userInfo.username))[0]

        if (!recent)
            return m.channel.send(`\`${userInfo.username}\` has not played a loved or ranked map in the previous 24 hours so I can't find their score! :(`)

        const beatmapInfo = (await functions.getBeatmap(recent.beatmap_id))[0]
        
        const mapRank = await functions.checkMapRank(recent, beatmapInfo.beatmap_id)

        recent.enabled_mods = functions.determineMods(recent.enabled_mods)

        recent.accuracy = functions.determineAcc(recent)
        
        const ppInfo = await functions.calculate(beatmapInfo, recent)

        let mapCompletion = false
        if (recent.rank === 'F') {
            mapCompletion = new Object()
            mapCompletion.perc = (((Number(recent.count300) + Number(recent.count100) + Number(recent.count50) + Number(recent.countmiss)) / (ppInfo.beatmapInfo.nsliders + ppInfo.beatmapInfo.ncircles + ppInfo.beatmapInfo.nspinners)) * 100).toLocaleString('en', { maximumFractionDigits: 2})

            let completionVals = [0, 12, 25, 37, 50, 62, 75, 87, 100]
            let searchVal = 0

            for (let val in completionVals) {
                if (Math.abs(Number(mapCompletion.perc) - completionVals[val]) < Math.abs(Number(mapCompletion.perc) - searchVal))
                    searchVal = completionVals[val]
            }
            mapCompletion.emoji = emojis.find('name', searchVal + 'Perc')
        }
        else {
            const topPlays = await functions.getUserTop(userInfo.username, 100)

            for (let play in topPlays) {
                if (recent.date === topPlays[play].date) {
                    recent.playNumber = Number(play) + 1
                    break
                }
            }
        }

        const playDate = Date.parse(recent.date) + 3600000
        const currentDate = Date.now()

        recent.date = functions.timeDifference(currentDate, playDate)

        if (recent.rank.length === 1) {
            recent.rank += '_'
        }

        const rankImage = emojis.find('name', recent.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        const mapStatus = functions.approvedStatus(beatmapInfo.approved)
        
        const updateDate = mapStatus == 'Ranked' ? new Date(beatmapInfo.approved_date) : new Date(beatmapInfo.last_update)
        const formatUpdateDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}/${updateDate.getFullYear()}`

        let embed = new Discord.RichEmbed()
            .setColor('#0096CF')
            .setAuthor(`Recent Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setTitle(`${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`)
            .setURL(`https://osu.ppy.sh/b/${beatmapInfo.beatmap_id}`)
            .addField(`• ${diffImage} **${ppInfo.formattedStars}*** ${recent.enabled_mods} \t\t ${mapCompletion ? mapCompletion.emoji + ' Map Completion: ' + mapCompletion.perc + '%': '' } ${mapRank ? '\:medal: Rank __#' + mapRank + '__' : ''} \n• ${rankImage} | Score: ${parseInt((recent.score)).toLocaleString('en')} (${recent.accuracy}%) | ${recent.rank === 'F_' ? '~~**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `• ${recent.maxcombo === beatmapInfo.max_combo ? '**' + recent.maxcombo + '**' : recent.maxcombo}x/**${beatmapInfo.max_combo}x** {${recent.count300}/${recent.count100}/${recent.count50}/${recent.countmiss}} | ${recent.date}`)
            .setFooter(`${mapStatus} • Beatmap by ${beatmapInfo.creator} • ${mapStatus == 'Ranked' ? 'Ranked on' : 'Last updated'} ${formatUpdateDate}`)

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

        storeBeatmap(m.channel.id, beatmapInfo, recent)
    }
}