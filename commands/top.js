const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../databases/requests.js')
const config = require('../config.json')

module.exports = {
    name: 'top',
    description: 'Displays users top 5 plays',
    async execute(m, args, emojis, plays, top5) {
        let user
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
        
        if (user)
            username = user.osuId
        
        if (!username) {
            m.react('❎')
            return m.channel.send(`No linked account could be found! \:sob: try \`${config.prefix}link [username]\``)
        }

        //osu API calls
        const userInfo = await functions.getUser(username)

        if (!userInfo) {
            m.react('❎')
            return m.channel.send(`The username \`${username}\` does not exist! Please try again 🙂`)
         }
        
        let topPlays = await functions.getUserTop(username, plays)

        if (!top5) {
            topPlays = [topPlays[topPlays.length - 1]]
        }
        else {
            topPlays = topPlays.slice(0, 5)
        }

        //Determine Mods used for topPlays
        for (let score in topPlays) {
            topPlays[score].enabled_mods = functions.determineMods(topPlays[score])
        }

        //Calculate accuracy
        for (let score in topPlays) {
            topPlays[score].accuracy = functions.determineAcc(topPlays[score])
        }

        let mapRanks = []

        for (let i = 0; i < topPlays.length; i++) {
            const mapRank = await functions.checkMapRank(topPlays[i], topPlays[i].beatmap_id)
            
            mapRanks.push(mapRank)
        }

        //Time Since Playcount
        for (let score in topPlays) {
            let playDate = Date.parse(topPlays[score].date) + 3600000
            let currentDate = Date.now()
            topPlays[score].date = functions.timeDifference(currentDate, playDate)
        }

        let beatmapList = []

        for (let score in topPlays) {
            const beatmapInfo = (await functions.getBeatmap(topPlays[score].beatmap_id))[0]
            beatmapList.push(beatmapInfo)

            const ppInfo = await functions.calculate(beatmapInfo, topPlays[score])

            topPlays[score].maxPP = ppInfo.formattedMaxPP
            topPlays[score].pp = parseFloat(topPlays[score].pp).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            topPlays[score].stars = ppInfo.formattedStars
        }

        const currentDate = Date.now()

        let embed = new Discord.RichEmbed()
        if (top5) {
            embed
                .setColor('#FFFFFF')
                .setAuthor(`Top 5 Plays for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`, 'https://osu.ppy.sh/users/' + userInfo.user_id)
                .setThumbnail(`https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`)
                .addField('__PERSONAL BEST #1__', topInfoInfo(0, topPlays, beatmapList, emojis, mapRanks))
                .addField('__PERSONAL BEST #2__', topInfoInfo(1, topPlays, beatmapList, emojis, mapRanks))
                .addField('__PERSONAL BEST #3__', topInfoInfo(2, topPlays, beatmapList, emojis, mapRanks))
                .addField('__PERSONAL BEST #4__', topInfoInfo(3, topPlays, beatmapList, emojis, mapRanks))
                .addField('__PERSONAL BEST #5__', topInfoInfo(4, topPlays, beatmapList, emojis, mapRanks))
        }
        else {
            let colour = '#0096CF'
            switch (plays) {
                case 1:
                    colour = '#FFD700'
                    break
                case 2:
                    colour = '#FFFFFF'
                    break
                case 3:
                    colour = '#cd7f32'
                    break
            }

            const mapStatus = functions.approvedStatus(beatmapList[0].approved)
            const usersScore = topPlays[0]
            const beatmapInfo = beatmapList[0]
            if (usersScore.rank.length === 1) {
                usersScore.rank += '_'
            }
            const rankImage = emojis.find('name', usersScore.rank)
            const diffImage = functions.difficultyImage(usersScore.stars, emojis)

            const updateDate = mapStatus == 'Ranked' ? new Date(beatmapList[0].approved_date) : new Date(beatmapList[0].last_update)
            const formatUpdateDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}/${updateDate.getFullYear()}`

            embed
                .setColor(colour)
                .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`, 'https://osu.ppy.sh/users/' + userInfo.user_id)
                .setThumbnail('https://b.ppy.sh/thumb/' + beatmapList[0].beatmapset_id + 'l.jpg')
                .setTitle(`${beatmapList[0].artist} - ${beatmapList[0].title} [${beatmapList[0].version}]`)
                .setURL(`https://osu.ppy.sh/b/${beatmapInfo.beatmap_id}`)
                .setDescription(`__**PERSONAL BEST #${plays}**__`)
                .addField(`• ${diffImage} **${usersScore.stars}*** ${usersScore.enabled_mods} \t\t ${mapRanks[0] ? '\:medal: Rank __#' + mapRanks[0] + '__' : ''} \n• ${rankImage} | Score: ${parseInt((usersScore.score)).toLocaleString('en')} (${usersScore.accuracy}%) | ${usersScore.rank === 'F_' ? '~~**' + usersScore.pp + 'pp**/' + usersScore.maxPP + 'pp~~' : '**' + usersScore.pp + 'pp**/' + usersScore.maxPP + 'pp'}`, `• ${usersScore.maxcombo === beatmapInfo.max_combo ? '**' + usersScore.maxcombo + '**' : usersScore.maxcombo}x/**${beatmapInfo.max_combo}x** {${usersScore.count300}/${usersScore.count100}/${usersScore.count50}/${usersScore.countmiss}} | ${usersScore.date}`)
                .setFooter(`${mapStatus} • Beatmap by ${beatmapList[0].creator} • ${mapStatus == 'Ranked' ? 'Ranked on' : 'Last updated'} ${formatUpdateDate}`)

            database.storeBeatmap(m.channel.id, beatmapList[0], topPlays[0])
        }

        //Send Embed to Channel
        m.channel.send({embed: embed})
    }
}

const topInfoInfo = (index, topPlays, maps, emojis, mapRanks) => {
    if (topPlays[index].rank.length === 1) {
        topPlays[index].rank += '_'
    }
    const rankImage = emojis.find('name', topPlays[index].rank)
    const diffImage = functions.difficultyImage(topPlays[index].stars, emojis)
    
    return `**[${maps[index].artist} - ${maps[index].title} [${maps[index].version}]](https://osu.ppy.sh/b/${maps[index].beatmap_id}) \n• ${diffImage} ${topPlays[index].stars}* ${topPlays[index].enabled_mods} ${mapRanks[index] ? '\:medal: Rank __#' + mapRanks[index] + '__' : ''} \n• ${rankImage} | Score: ${parseInt((topPlays[index].score)).toLocaleString('en')} (${topPlays[index].accuracy}%) | **${topPlays[index].pp}pp**/${topPlays[index].maxPP}pp** \n• ${topPlays[index].maxcombo === maps[index].max_combo ? '**' + topPlays[index].maxcombo + 'x**' : topPlays[index].maxcombo}/**${maps[index].max_combo}x** {${topPlays[index].count300}/${topPlays[index].count100}/${topPlays[index].count50}/${topPlays[index].countmiss}} | ${topPlays[index].date}`
}
