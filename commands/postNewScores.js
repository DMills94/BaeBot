const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../localdb.json')

module.exports = {
    name: 'postnew',
    description: 'Posts new scores from updating a users top 100',
    async execute(score, emojis, client) {

        //API Calls
        const userInfo = await functions.getUser(score.user_id)
        const beatmapInfo = (await functions.getBeatmap(score.beatmap_id))[0]
        const topPlays = await functions.getUserTop(userInfo.username)

        for (let play in topPlays) {
            let scoreMatch = false

            if (score.date === topPlays[play].date)
                scoreMatch = true

            if (scoreMatch) {
                score.playNumber = parseInt(play) + 1
            }
        }

        score.enabled_mods = functions.determineMods(score)

        score.accuracy = functions.determineAcc(score)

        let playDate = Date.parse(score.date)
        let currentDate = Date.now()

        score.date = functions.timeDifference(currentDate, playDate)

        const ppInfo = await functions.calculate(beatmapInfo, score)

        if (score.rank.length === 1) {
            score.rank += '_'
        }

        const rankImage = emojis.find('name', score.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        let colour = "#0096CF"
        switch (score.playNumber) {
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

        let embed = new Discord.RichEmbed()
            .setColor(colour)
            .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, 'https://osu.ppy.sh/users/' + userInfo.user_id)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setTitle(`__PERSONAL BEST #${score.playNumber}__`)
            .setDescription(`**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`)
            .addField(`\u2022 ${diffImage} **${ppInfo.formattedStars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString('en')} (${score.accuracy}%) | ${score.rank === 'F_' ? '~~**' + ppInfo.performancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `\u2022 ${score.maxcombo === beatmapInfo.max_combo ? '**' + score.maxcombo + '**' : score.maxcombo}x/**${beatmapInfo.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
            .setFooter('Message sent: ')
            .setTimestamp()

        //Send embed to channels where user tracked
        const usersTrackedChannels = database.track[userInfo.username].channels

        Object.keys(usersTrackedChannels).forEach(channel => {
            if (score.playNumber <= usersTrackedChannels[channel])
                client.get(channel).send({ embed })
        })
    }
}