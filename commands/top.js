const Discord = require("discord.js")
const functions = require("./exportFunctions.js")

module.exports = {
    name: "top",
    description: "Displays users top 5 plays",
    async execute(m, args, emojis, plays, top5) {
        let username

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id)
                .catch(() => {
                    return m.reply("you do not have a linked account! Try ` `link [username]`")
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1)
            }
            username = await functions.lookupUser(discordId)
                .catch(() => {
                    return m.reply("they do not have a linked account so I cannot find their top plays :(")
                })
        }
        else {
            username = args.join("_")
        }

        if (!username) {
            return
        }

        //osu API calls
        const userInfo = await functions.getUser(username, 0)

        if (!userInfo)
            return m.reply("That username does not exist! Please try again.")

        let topPlays = await functions.getUserTop(username, plays)

        if (!top5) {
            topPlays = [topPlays[topPlays.length - 1]]
        }

        //Determine Mods used for topPlays
        for (let score in topPlays) {
            topPlays[score].enabled_mods = functions.determineMods(topPlays[score])
        }

        //Calculate accuracy
        for (let score in topPlays) {
            topPlays[score].accuracy = functions.determineAcc(topPlays[score])
        }

        //Time Since Playcount
        for (let score in topPlays) {
            let playDate = Date.parse(topPlays[score].date)
            let currentDate = Date.now() - 0
            topPlays[score].date = functions.timeDifference(currentDate, playDate)
        }

        let beatmapList = []

        for (let score in topPlays) {
            const beatmapInfo = (await functions.getBeatmap(topPlays[score].beatmap_id))[0]
            beatmapList.push(beatmapInfo)

            const ppInfo = await functions.calculate(beatmapInfo, topPlays[score])

            topPlays[score].maxPP = ppInfo.formattedMaxPP
            topPlays[score].stars = ppInfo.formattedStars
        }

        let embed = new Discord.RichEmbed()
        if (top5) {
            embed
                .setColor("#FFFFFF")
                .setAuthor(`Top 5 Plays for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, "https://osu.ppy.sh/users/" + userInfo.user_id)
                .setThumbnail("https://a.ppy.sh/" + userInfo.user_id)
                .addField("__PERSONAL BEST #1__", topInfoInfo(0, topPlays, beatmapList, emojis))
                .addField("__PERSONAL BEST #2__", topInfoInfo(1, topPlays, beatmapList, emojis))
                .addField("__PERSONAL BEST #3__", topInfoInfo(2, topPlays, beatmapList, emojis))
                .addField("__PERSONAL BEST #4__", topInfoInfo(3, topPlays, beatmapList, emojis))
                .addField("__PERSONAL BEST #5__", topInfoInfo(4, topPlays, beatmapList, emojis))
                .setFooter("Message sent: ")
                .setTimestamp()
        }
        else {
            let colour
            switch (plays) {
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

            const mapStatus = functions.approvedStatus(beatmapList[0].approved)

            embed
                .setColor(colour)
                .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, "https://osu.ppy.sh/users/" + userInfo.user_id)
                .setThumbnail("https://b.ppy.sh/thumb/" + beatmapList[0].beatmapset_id + "l.jpg")
                .addField(`__PERSONAL BEST #${plays}__`, topInfoInfo(0, topPlays, beatmapList, emojis))
                .setFooter(`${mapStatus} | Beatmap by ${beatmapList[0].creator} | Message sent: `)
                .setTimestamp()

            functions.storeLastBeatmap(m.guild, beatmapList[0], topPlays[0])
        }

        //Send Embed to Channel
        m.channel.send({embed: embed})
    }
}

const topInfoInfo = (index, topPlays, maps, emojis) => {
    if (topPlays[index].rank.length === 1) {
        topPlays[index].rank += "_"
    }
    const rankImage = emojis.find("name", topPlays[index].rank)
    const diffImage = functions.difficultyImage(topPlays[index].stars, emojis)

    return `**[${maps[index].artist} - ${maps[index].title} [${maps[index].version}]](https://osu.ppy.sh/b/${maps[index].beatmap_id})** \n\u2022 ${diffImage} **${topPlays[index].stars}*** ${topPlays[index].enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((topPlays[index].score)).toLocaleString("en")} (${topPlays[index].accuracy}%) | **${parseFloat(topPlays[index].pp).toFixed(2)}pp**/${topPlays[index].maxPP}pp \n\u2022 ${topPlays[index].maxcombo === maps[index].max_combo ? "**" + topPlays[index].maxcombo + "x**" : topPlays[index].maxcombo}/**${maps[index].max_combo}x** {${topPlays[index].count300}/${topPlays[index].count100}/${topPlays[index].count50}/${topPlays[index].countmiss}} | ${topPlays[index].date}`
}
