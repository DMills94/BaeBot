const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const database = require('../databases/requests.js')

module.exports = {
    name: "compare",
    description: "Compares the users best play against the last posted beatmap in that guild",
    async execute(m, args, emojis) {
        let compMods = false
        let username
        let user = []

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

        //Get Beatmap Id
        const channelid = m.channel.id
        const prevBeatmap = await database.fetchBeatmap(channelid)

        if (!prevBeatmap)
            return m.channel.send('There was an issue comparing, apologies! Please try again later.')

        const userInfo = await functions.getUser(username, 0)

        if (!userInfo){
            m.react('❎')
            return m.channel.send("The username provided doesn't exist! Please try again.")
        }

        const userScores = await functions.getScores(prevBeatmap.beatmap.beatmap_id, username)

        if (userScores.length < 1){
            m.react('❎')
            return m.channel.send('Go play the map first, dumb bitch - Belial 2018')
        }

        let score

        if (!compMods || !prevBeatmap.performance) {
            score = userScores[0]
        }
        else {
            let bitNumMods = functions.modsToBitNum(modsToCompare)
            if (bitNumMods === "invalid") {
                m.react('❎')
                return m.reply("invalid mod entry, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods `compare +mod/[mods]`")

            }
            else if (bitNumMods === "mods") {
                prevBeatmapMods = prevBeatmap.performance.enabled_mods
                if (prevBeatmapMods.startsWith("+")) {
                    prevBeatmapMods = prevBeatmapMods.slice(1)
                }

                bitNumMods = functions.modsToBitNum(prevBeatmapMods)
            }

            let scoreFound = false

            for (let modScore in userScores) {
                if (userScores[modScore].enabled_mods === bitNumMods) {
                    score = userScores[modScore]
                    scoreFound = true
                }
            }

            if (!scoreFound) {
                m.react('❎')
                return m.reply("sorry, you don't have a play on that map with the mods selected! Sometimes the API deletes very old plays, sorry about that :(")
            }
        }

        const userTop = await functions.getUserTop(score.username)

        for (let top in userTop) {
            if (userTop[top].date === score.date)
                score.playNumber = parseInt(top) + 1
        }

        score.enabled_mods = functions.determineMods(score)

        score.accuracy = functions.determineAcc(score)

        let playDate = Date.parse(score.date)
        let currentDate = Date.now() - 0
        score.date = functions.timeDifference(currentDate, playDate)

        const ppInfo = await functions.calculate(prevBeatmap.beatmap, score)

        if (score.rank.length === 1) {
            score.rank += "_"
        }

        const rankImage = emojis.find("name", score.rank)
        const diffImage = functions.difficultyImage(ppInfo.formattedStars, emojis)

        const mapStatus = functions.approvedStatus(prevBeatmap.beatmap.approved)

        let embed = new Discord.RichEmbed()
            .setColor("#0096CF")
            .setAuthor(`Best Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
            .setThumbnail("https://b.ppy.sh/thumb/" + prevBeatmap.beatmap.beatmapset_id + "l.jpg")
            .setTitle(prevBeatmap.beatmap.artist + " - " + prevBeatmap.beatmap.title + " [" + prevBeatmap.beatmap.version + "]")
            .setURL(`https://osu.ppy.sh/b/${prevBeatmap.beatmap.beatmap_id}`)
            .addField(`\u2022 ${diffImage} **${ppInfo.formattedStars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString("en")} (${score.accuracy}%) | ${score.rank === "F_" ? "~~**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp~~" : "**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp"}`, `\u2022 ${score.maxcombo === prevBeatmap.beatmap.max_combo ? "**" + score.maxcombo + "**" : score.maxcombo}x/**${prevBeatmap.beatmap.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
            .setFooter(`${mapStatus} | Beatmap by ${prevBeatmap.beatmap.creator}  | Message sent: `)
            .setTimestamp()

            if (score.playNumber) {
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
                    default:
                        colour = '#0096CF'
                        break
                }
    
                embed
                    .setDescription(`__**PERSONAL BEST #${score.playNumber}**__`)
                    .setColor(colour)
            }

        //Send Embed to Channel
        m.channel.send({
            embed: embed
        })
    }
}