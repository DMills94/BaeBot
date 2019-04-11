const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../databases/requests.js')
const config = require('../config.json')

module.exports = {
    name: 'rb',
    description: 'Displays users recent best (default: most recent)',
    async execute(m, args, emojis, rbNum) {
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
            username = user[0].osuId
        
        if (!username) {
            m.react('❎')
            return m.channel.send(`No linked account could be found! \:sob: try \`${config.prefix}link [username]\``)
        }
        
        const unsortedTopScores = await functions.getUserTop(username)
        
        if (unsortedTopScores.length < 1) {
            m.react('❎')
            return m.channel.send(`\`${username}\` doesn't appear to play osu! Perhaps you made a spelling mistake? Please try again!`)
        }

        for (let score in unsortedTopScores) {
            unsortedTopScores[score].playNumber = parseInt(score) + 1
            unsortedTopScores[score].date = Date.parse(unsortedTopScores[score].date) + 3600000 
        }

        const topScores = unsortedTopScores.sort((a, b) => {
            return b.date - a.date
        })

        usersScore = topScores[rbNum - 1]

        const beatmapInfo = (await functions.getBeatmap(usersScore.beatmap_id))[0]

        usersScore.enabled_mods = functions.determineMods(usersScore)

        usersScore.accuracy = functions.determineAcc(usersScore)
        
        const mapRank = await functions.checkMapRank(username, beatmapInfo.beatmap_id)

        let playDate = usersScore.date
        let currentDate = Date.now()
        usersScore.date = functions.timeDifference(currentDate, playDate)

        const userInfo = await functions.getUser(username)

        if (!userInfo) {
            m.react('❎')
            return m.channel.send(`The username provided doesn't exist! Please try again.`)
        }

        const ppInfo = await functions.calculate(beatmapInfo, usersScore)


        if (usersScore.rank.length === 1) {
            usersScore.rank += '_'
        }

        const rankImage = emojis.find('name', usersScore.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        let colour = '#0096CF'
        switch (usersScore.playNumber) {
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

        const mapStatus = functions.approvedStatus(beatmapInfo.approved)

        const updateDate = mapStatus == 'Ranked' ? new Date(beatmapInfo.approved_date) : new Date(beatmapInfo.last_update)
        const formatUpdateDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}/${updateDate.getFullYear()}`

        let embed = new Discord.RichEmbed()
            .setColor(colour)
            .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`, 'https://osu.ppy.sh/users/' + userInfo.user_id)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setTitle(`${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`)
            .setURL(`https://osu.ppy.sh/b/${beatmapInfo.beatmap_id}`)
            .setDescription(`__**PERSONAL BEST #${usersScore.playNumber}**__`)
            .addField(`• ${diffImage} **${ppInfo.formattedStars}*** ${usersScore.enabled_mods} \t\t ${mapRank ? '\:medal: Rank __#' + mapRank + '__' : ''} \n• ${rankImage} | Score: ${parseInt((usersScore.score)).toLocaleString('en')} (${usersScore.accuracy}%) | ${usersScore.rank === 'F_' ? '~~**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `• ${usersScore.maxcombo === beatmapInfo.max_combo ? '**' + usersScore.maxcombo + '**' : usersScore.maxcombo}x/**${beatmapInfo.max_combo}x** {${usersScore.count300}/${usersScore.count100}/${usersScore.count50}/${usersScore.countmiss}} | ${usersScore.date}`)
            .setFooter(`${mapStatus} • Beatmap by ${beatmapInfo.creator} • ${mapStatus == 'Ranked' ? 'Ranked on' : 'Last updated'} ${formatUpdateDate}`)

        //Send Embed to Channel
        m.channel.send({
            embed: embed
        })

        database.storeBeatmap(m.channel.id, beatmapInfo, usersScore)
    }
}