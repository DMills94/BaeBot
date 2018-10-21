const axios = require("axios")
const Discord = require("discord.js")
const { osuApiKey } = require("../config.json")
const ojsama = require("ojsama")
const functions = require("./exportFunctions.js")

module.exports = {
    name: "rb",
    description: "Displays users recent best (default: most recent)",
    async execute(m, args, db, rankingEmojis, rbNum) {
        let username

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id, db)
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`")
                    return
                })
        } else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1)
            }
            username = await functions.lookupUser(discordId, db)
                .catch(err => {
                    m.reply("they do not have a linked account so I cannot find their top plays :(")
                    return
                })
        } else {
            username = args.join("_")
        }

        if (!username) {
            return
        }

        const unsortedTopScores = await functions.getUserTop(username)

        for (let score in unsortedTopScores) {
            unsortedTopScores[score].playNumber = parseInt(score) + 1
            unsortedTopScores[score].date = Date.parse(unsortedTopScores[score].date)
        }

        const topScores = unsortedTopScores.sort((a, b) => {
            return b.date - a.date
        })

        usersScore = topScores[rbNum - 1]

        usersScore.enabled_mods = functions.determineMods(usersScore)

        usersScore.accuracy = functions.determineAcc(usersScore)

        let playDate = usersScore.date
        let currentDate = Date.now() - 3600000
        usersScore.date = functions.timeDifference(currentDate, playDate)

        const userInfo = await functions.getUser(username, 0)

        if (!userInfo) {
            return m.channel.send("The username provided doesn't exist! Please try again.")
        }

        const beatmapInfo = (await functions.getBeatmap(usersScore.beatmap_id))[0]

        const ppInfo = await functions.calculate(beatmapInfo, usersScore)


        if (usersScore.rank.length === 1) {
            usersScore.rank += "_"
        }

        let rankImage

        rankImage = rankingEmojis.find("name", usersScore.rank)
        let colour

        switch (usersScore.playNumber) {
            case 1:
                colour = "#FFD700"
                break
            case 2:
                colour = "#FFFFFF"
                break
            case 3:
                colour = "#cd7f32"
                break
            default:
                colour = "#0096CF"
                break
        }

        const mapStatus = functions.approvedStatus(beatmapInfo.approved)

        let embed = new Discord.RichEmbed()
            .setColor(colour)
            .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, "https://osu.ppy.sh/users/" + userInfo.user_id)
            .setThumbnail("https://b.ppy.sh/thumb/" + beatmapInfo.beatmapset_id + "l.jpg")
            .setTitle(`__PERSONAL BEST #${usersScore.playNumber}__`)
            .setDescription(`**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`)
            .addField(`\u2022 \:star: **${ppInfo.formattedStars}*** ${usersScore.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((usersScore.score)).toLocaleString("en")} (${usersScore.accuracy}%) | ${usersScore.rank === "F_" ? "~~**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp~~" : "**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp"}`, `\u2022 ${usersScore.maxcombo === beatmapInfo.max_combo ? "**" + usersScore.maxcombo + "**" : usersScore.maxcombo}x/**${beatmapInfo.max_combo}x** {${usersScore.count300}/${usersScore.count100}/${usersScore.count50}/${usersScore.countmiss}} | ${usersScore.date}`)
            .setFooter(`${mapStatus} | Beatmap by ${beatmapInfo.creator} | Message sent: `)
            .setTimestamp()

        //Send Embed to Channel
        m.channel.send({
            embed: embed
        })

        functions.storeLastBeatmap(m.guild, beatmapInfo, usersScore, db)
    }
}