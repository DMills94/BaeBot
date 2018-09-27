const axios = require("axios")
const Discord = require("discord.js")
const { osuApiKey } = require("../config.json")
const ojsama = require("ojsama")
const functions = require("./exportFunctions.js")

module.exports = {
    name: "postnew",
    description: "Posts new scores from updating a users top 100",
    execute(score, db, rankingEmojis, client) {

        //get user
        axios.get('api/get_user', { params: {
                k: osuApiKey,
                u: score.user_id
            }
        })
            .then(resp => {
                const userInfo = resp.data[0]

                axios.get('api/get_beatmaps', { params: {
                        k: osuApiKey,
                        b: score.beatmap_id
                    }
                })
                    .then(resp => {
                        const beatmapInfo = resp.data[0]

                        axios.get('api/get_user_best', { params: {
                                k: osuApiKey,
                                u: score.user_id,
                                limit: 100
                            }
                        })
                            .then(resp => {
                                const topPlays = resp.data

                                for (let play in topPlays) {
                                    let scoreMatch = true

                                    const aProps = Object.getOwnPropertyNames(score)
                                    const bProps = Object.getOwnPropertyNames(topPlays[play])

                                    if (aProps.length !== bProps.length) {
                                        scoreMatch = false
                                    }

                                    for (let prop in aProps) {
                                        const propName = aProps[prop]

                                        if (score[propName] !== topPlays[play][propName]) {
                                            scoreMatch = false
                                        }
                                    }

                                    if (scoreMatch) {
                                        score.playNumber = parseInt(play) + 1
                                    }
                                }

                                score.enabled_mods = functions.determineMods(score)

                                score.accuracy = functions.determineAcc(score)

                                let playDate = Date.parse(score.date)
                                let currentDate = Date.now() - 3600000

                                score.date = functions.timeDifference(currentDate, playDate)

                                calculate(beatmapInfo, score, userInfo, rankingEmojis, client, db)
                            })
                            .catch(err => {
                                console.log(err)
                            })
                    })
                    .catch(err => {
                        console.log(err)
                    })
            })
            .catch(err => {
                console.log(err)
            })
    }
}

const calculate = (beatmap, performance, userInfo, rankingEmojis, client, db) => {

    let cleanBeatmap

    axios.get(`osu/${beatmap.beatmap_id}`, { params: {
            credentials: "include"
        }
    })
        .then(resp => {
            return resp.data
        })
        .then(raw => new ojsama.parser().feed(raw))
        .then(({ map }) => {
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

            const formattedStars = stars.toString().split(" ")[0]
            const formattedPerformancePP = recentPP.toString().split(" ")[0]
            const formattedMaxPP = maxPP.toString().split(" ")[0]

            generateTrackScore(userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars, rankingEmojis, client, db)
        })
        .catch(err => {
            console.log("Error in get /osu/beatmap_id")
            console.log(err)
            return
        })
}

const generateTrackScore = (userInfo, prevBeatmap, score, performancePP, maxPP, stars, rankingEmojis, client, db) => {
    const dbTrack = db.ref('/track/')

    dbTrack.once('value', obj => {
            const trackedGuilds = obj.val()

            if (score.rank.length === 1) {
                score.rank += "_"
            }

            let rankImage

            rankImage = rankingEmojis.find("name", score.rank)
            let colour

            switch (score.playNumber) {
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
                    colour = "#c0c0c0"
                    break
            }

            let embed = new Discord.RichEmbed()
                .setColor(colour)
                .setAuthor(`Top Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, "https://osu.ppy.sh/users/" + userInfo.user_id)
                .setThumbnail("https://b.ppy.sh/thumb/" + prevBeatmap.beatmapset_id + "l.jpg")
                .setTitle(`__PERSONAL BEST #${score.playNumber}__`)
                .setDescription(`**[${prevBeatmap.artist} - ${prevBeatmap.title} [${prevBeatmap.version}]](https://osu.ppy.sh/b/${prevBeatmap.beatmap_id})**`)
                .addField(`\u2022 \:star: **${stars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString("en")} (${score.accuracy}%) | ${score.rank === "F_" ? "~~**" + performancePP + "pp**/" + maxPP + "pp~~" : "**" + performancePP + "pp**/" + maxPP + "pp"}`, `\u2022 ${score.maxcombo === prevBeatmap.max_combo ? "**" + score.maxcombo + "**" : score.maxcombo}x/**${prevBeatmap.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
                .setFooter("Message sent: ")
                .setTimestamp()

            //Send Embed to Channel where user is tracked

            for (let guild in trackedGuilds) {
                const trackedUsers = trackedGuilds[guild]
                for (let entry in trackedUsers) {
                    if (userInfo.username === trackedUsers[entry].osuName) {
                        const channelToSend = client.find('id', trackedUsers[entry].channel)
                        channelToSend.send({
                            embed: embed
                        })

                        const guildID = client.get(trackedUsers[entry].channel).guild

                        functions.storeLastBeatmap(guildID, prevBeatmap, score, db)
                    }
                }
            }
        })
}
