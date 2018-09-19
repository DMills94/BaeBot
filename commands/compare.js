const axios = require('axios')
const Discord = require('discord.js')
const {osuApiKey} = require('../config.json')
const ojsama = require('ojsama')
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
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`")
                    return
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1)
            }

            username = await functions.lookupUser(discordId, db)
                .catch(() => {
                    m.reply("they do not have a linked account so I cannot find their top plays :(")
                    return
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

        lastBeatmap.once('value', obj => {
            prevBeatmap = obj.val()

            console.log(prevBeatmap)

            //User information
            axios.get('api/get_user', {
                params: {
                    k: osuApiKey,
                    u: username
                }
            })
                .then(resp => {
                    let userInfo = resp.data[0]
                    if (!userInfo)
                        return m.channel.send("The username provided doesn't exist! Please try again.")

                    axios.get('api/get_scores', {
                        params: {
                            k: osuApiKey,
                            b: prevBeatmap.beatmap.beatmap_id,
                            u: userInfo.user_id
                        }
                    })
                        .then(resp => {
                            if (resp.data.length < 1) {
                                m.channel.send("Go play the map first, dumb bitch - Belial 2k18")
                                return
                            }

                            let score

                            if (!compMods || !prevBeatmap.performance) {
                                score = resp.data[0]
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

                                for (let scoreObj in resp.data) {
                                    if (resp.data[scoreObj].enabled_mods === bitNumMods) {
                                        score = resp.data[scoreObj]
                                        scoreFound = true
                                    }
                                }

                                if (!scoreFound) {
                                    return m.reply("sorry, you don't have a play on that map with the mods selected! Sometimes the API deletes very old plays, sorry about that :(")
                                }
                            }

                            mods = functions.determineMods(score)
                            score.enabled_mods = mods

                            score.accuracy = functions.determineAcc(score)

                            let playDate = Date.parse(score.date) //UTC + 0
                            let currentDate = Date.now() + 25200000 //UTC + 7
                            score.date = functions.timeDifference(currentDate, playDate)

                            calculate(prevBeatmap.beatmap, score, userInfo, m, rankingEmojis, db)
                        })
                        .catch(err => {
                            m.channel.send("There was an error getting your score on the map! Sorry about that, try later!")
                            console.log(err)
                        })
                })
                .catch(err => {
                    m.channel.send("There was an error fetching your user info! Sorry about that, try later!")
                    console.log(err)
                })
        })
            .catch(err => {
                m.channel.send("There was an error fetching the last beatmap! Sorry about that, try later!")
                console.log(err)
            })
    }
}

const calculate = (beatmap, performance, userInfo, m, rankingEmojis, db) => {

    let cleanBeatmap

    axios.get('osu/' + beatmap.beatmap_id, {
        params: {
            credentials: "include"
        }
    })
        .then(resp => {
            return resp.data
        })
        .then(raw => new ojsama.parser().feed(raw))
        .then(({
                   map
               }) => {
            cleanBeatmap = map
            let usedMods = ojsama.modbits.from_string(performance.enabled_mods)

            let stars = new ojsama.diff().calc({
                map: cleanBeatmap,
                mods: usedMods
            })

            let combo = parseInt(performance.maxcombo)
            let nmiss = parseInt(performance.countmiss)
            let acc_percent = parseFloat(performance.accuracy)

            let recentPP = ojsama.ppv2({
                stars: stars,
                combo: combo,
                nmiss: nmiss,
                acc_percent: acc_percent
            })

            let maxPP = ojsama.ppv2({
                stars: stars
            })

            formattedStars = stars.toString().split(" ")[0]
            formattedPerformancePP = recentPP.toString().split(" ")[0]
            formattedMaxPP = maxPP.toString().split(" ")[0]

            generateCompare(m, userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars, rankingEmojis, db)
        })
        .catch(err => {
            console.log(err)
            m.channel.send("There was an error! More info: " + err)
        })
}

const generateCompare = (m, userInfo, prevBeatmap, score, performancePP, maxPP, stars, rankingEmojis, db) => {

    if (score.rank.length === 1) {
        score.rank += "_"
    }

    let rankImage

    rankImage = rankingEmojis.find("name", score.rank)

    let embed = new Discord.RichEmbed()
        .setColor("#c0c0c0")
        .setAuthor(`Best Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
        .setThumbnail("https://b.ppy.sh/thumb/" + prevBeatmap.beatmapset_id + "l.jpg")
        .setTitle(prevBeatmap.artist + " - " + prevBeatmap.title + " [" + prevBeatmap.version + "]")
        .setURL("https://osu.ppy.sh/b/" + prevBeatmap.beatmap_id)
        .addField(`\u2022 \:star: **${stars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString("en")} (${score.accuracy}%) | ${score.rank === "F_" ? "~~**" + performancePP + "pp**/" + maxPP + "pp~~" : "**" + performancePP + "pp**/" + maxPP + "pp"}`, `\u2022 ${score.maxcombo === prevBeatmap.max_combo ? "**" + score.maxcombo + "**" : score.maxcombo}x/**${prevBeatmap.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
        .setFooter("Message sent: ")
        .setTimestamp()

    //Send Embed to Channel
    m.channel.send({
        embed: embed
    })
}
