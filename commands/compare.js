const Discord = require('discord.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: "compare",
    description: "Compares the users best play against the last posted beatmap in that guild",
    async execute(m, args, db, rankingEmojis) {
        let username
        let compMods = false

        for (let arg in args) {
            if (args[arg].includes("+")) {
                modsToCompare = args[arg].slice(1)
                args.splice(arg, 1)
                compMods = true
            }
        }

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id, db)
                .catch(() => {
                    return m.reply("you do not have a linked account! Try ` `link [username]`")
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1)
            }

            username = await functions.lookupUser(discordId, db)
                .catch(() => {
                    return m.reply("they do not have a linked account so I cannot find their top plays :(")
                })
        }
        else {
            username = args.join("_")
        }

        if (!username)
            return


        //Get Beatmap Id
        let prevBeatmap

        const lastBeatmap = db.ref(`/lastBeatmap/${m.guild.id}`)

        lastBeatmap.once('value', async obj => {
            prevBeatmap = obj.val()

            const userInfo = await functions.getUser(username, 0)

            if (!userInfo)
                return m.channel.send("The username provided doesn't exist! Please try again.")

            const userScores = await functions.getScores(prevBeatmap.beatmap.beatmap_id, username)

            if (userScores.length < 1)
                return m.reply('Go play the map first, dumb bitch - Belial 2018')

            let score

            if (!compMods || !prevBeatmap.performance) {
                score = userScores[0]
            }
            else {
                let bitNumMods = functions.modsToBitNum(modsToCompare)
                if (bitNumMods === "invalid") {
                    m.reply("invalid mod entry, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods `compare +mod/[mods]`")
                    return
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
                    return m.reply("sorry, you don't have a play on that map with the mods selected! Sometimes the API deletes very old plays, sorry about that :(")
                }
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

            let rankImage = rankingEmojis.find("name", score.rank)

            const mapStatus = functions.approvedStatus(prevBeatmap.beatmap.approved)
            
            let embed = new Discord.RichEmbed()
                .setColor("#0096CF")
                .setAuthor(`Best Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
                .setThumbnail("https://b.ppy.sh/thumb/" + prevBeatmap.beatmap.beatmapset_id + "l.jpg")
                .setTitle(prevBeatmap.beatmap.artist + " - " + prevBeatmap.beatmap.title + " [" + prevBeatmap.beatmap.version + "]")
                .setURL("https://osu.ppy.sh/b/" + prevBeatmap.beatmap.beatmap_id)
                .addField(`\u2022 \:star: **${ppInfo.formattedStars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString("en")} (${score.accuracy}%) | ${score.rank === "F_" ? "~~**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp~~" : "**" + ppInfo.formattedPerformancePP + "pp**/" + ppInfo.formattedMaxPP + "pp"}`, `\u2022 ${score.maxcombo === prevBeatmap.beatmap.max_combo ? "**" + score.maxcombo + "**" : score.maxcombo}x/**${prevBeatmap.beatmap.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
                .setFooter(`${mapStatus} | Beatmap by ${prevBeatmap.beatmap.creator}  | Message sent: `)
                .setTimestamp()

            //Send Embed to Channel
            m.channel.send({
                embed: embed
            })
        })
            .catch(err => {
                m.channel.send("There was an error getting your score on the map! Sorry about that, try later!")
                console.log(err)
            })
    }
}