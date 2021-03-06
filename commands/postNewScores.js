const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../databases/requests/track.js')
const { storeBeatmap } = require('../databases/requests/lastBeatmap')

module.exports = {
    name: 'postnew',
    description: 'Posts new scores from updating a users top 100',
    async execute(score, emojis, client, trackType) {

        //API Calls
        const userInfo = await functions.getUser(score.user_id)
        const beatmapInfo = (await functions.getBeatmap(score.beatmap_id))[0]
        const topPlays = await functions.getUserTop(userInfo.username)

        for (let play in topPlays) {
            if (score.date === topPlays[play].date) {
                score.playNumber = parseInt(play) + 1
                break
            }
        }

        const newPP = userInfo.pp_raw
        let trackdb

        if (trackType === 'country') {
            trackdb = (await database.countryTracks(userInfo.country))[0]
        }
        else if (trackType === 'global') {
            trackdb = (await database.globalTracks())[0]
        }
        else if (trackType === 'user') {
            trackdb = await database.userTrack(userInfo.username)
        }

        let oldPP
        if (trackType === 'user') {
            oldPP = trackdb.pp
        }
        else {
            oldPP = trackdb.players.filter(player => {
                return player.username === userInfo.username
            })[0].pp
        }

        if (!oldPP)
            oldPP = newPP

        let updatedPP = (Number(newPP) - Number(oldPP)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        score.enabled_mods = functions.determineMods(score.enabled_mods)

        score.accuracy = functions.determineAcc(score)

        let playDate = Date.parse(score.date) + 0
        let currentDate = Date.now()

        const mapRank = await functions.checkMapRank(score, beatmapInfo.beatmap_id)

        score.date = functions.timeDifference(currentDate, playDate)

        const ppInfo = await functions.calculate(beatmapInfo, score)

        if (score.rank.length === 1) {
            score.rank += '_'
        }

        const rankImage = emojis.find('name', score.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        let colour = '#0096CF'
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

        const mapStatus = await functions.approvedStatus(beatmapInfo.approved)

        const updateDate = mapStatus == 'Ranked' ? new Date(beatmapInfo.approved_date) : new Date(beatmapInfo.last_update)
        const formatUpdateDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}/${updateDate.getFullYear()}`
        
        let embed = new Discord.RichEmbed()
            .setColor(colour)
            .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en' , { minimumFractionDigits: 2, maximumFractionDigits: 2 })}pp ${updatedPP >= 0 ? '+' + updatedPP : updatedPP} (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}?${currentDate}.jpeg`, 'https://osu.ppy.sh/users/' + userInfo.user_id)
            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapInfo.beatmapset_id + 'l.jpg')
            .setTitle(`${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]`)
            .setURL(`https://osu.ppy.sh/b/${beatmapInfo.beatmap_id}`)
            .setDescription(`__**PERSONAL BEST #${score.playNumber}**__`)
            .addField(`• ${diffImage} **${ppInfo.formattedStars}*** ${score.enabled_mods} \t\t ${mapRank ? '\:medal: Rank __#' + mapRank + '__' : ''} \n• ${rankImage} | Score: ${parseInt((score.score)).toLocaleString('en')} (${score.accuracy}%) | ${score.rank === 'F_' ? '~~**' + ppInfo.performancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp~~' : '**' + ppInfo.formattedPerformancePP + 'pp**/' + ppInfo.formattedMaxPP + 'pp'}`, `• ${score.maxcombo === beatmapInfo.max_combo ? '**' + score.maxcombo + '**' : score.maxcombo}x/**${beatmapInfo.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
            .setFooter(`${mapStatus} • Beatmap by ${beatmapInfo.creator} • ${mapStatus == 'Ranked' ? 'Ranked on' : 'Last updated'} ${formatUpdateDate}`)

        //Send embed to channels where user tracked
        const usersTrackedChannels = trackdb.channels

        Object.keys(usersTrackedChannels).forEach(channel => {
            if (score.playNumber <= usersTrackedChannels[channel] || score.playNumber <= usersTrackedChannels[channel].top) {
                if (trackType === 'country') {
                    if (userInfo.pp_country_rank <= usersTrackedChannels[channel].limit) {
                        client.get(channel).send({ embed })
                        functions.logCommand(client, channel, 'Tracking', 'track', embed)
                    }
                }
                else if (trackType === 'global') {
                    if (userInfo.pp_rank <= usersTrackedChannels[channel].limit) {
                        client.get(channel).send({ embed })
                        functions.logCommand(client, channel, 'Tracking', 'track', embed)
                    }
                }
                else if (trackType === 'user') {
                    client.get(channel).send({ embed })
                    functions.logCommand(client, channel, 'Tracking', 'track', embed)
                }
                storeBeatmap(channel, beatmapInfo, score)
            }
        })
        
        // Update pp for user
        database.updateTrack(userInfo, null, newPP, trackType)
    }
}