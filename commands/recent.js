const axios = require('axios');
const Discord = require('discord.js')
const {osuApiKey} = require('../config.json');
const ojsama = require('ojsama');
const functions = require('./exportFunctions.js');

module.exports = {
    name: "recent",
    description: "Returns a user's most recent play",
    async execute(m, args, rankingEmojis) {
        let username;

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id)
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`");
                    return;
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1);
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1);
            }
            username = await functions.lookupUser(discordId)
                .catch(err => {
                    m.reply("they do not have a linked account so I cannot find their top plays :(");
                    return;
                })
        }
        else {
            username = args.join('_');
        }

        if (!username) {
            return;
        }

        //First Call
        axios.get("api/get_user_recent", {
            params: {
                k: osuApiKey,
                u: username,
                limit: "1"
            }
        })
            .then(resp => {
                if (resp.data.length == 0) {
                    m.reply("That username does not exist, or has not played in over 24 hours! Please try again.")
                    return;
                }
                else {
                    const recent = resp.data[0];
                    //Second Call
                    axios.get("api/get_user", {
                        params: {
                            k: osuApiKey,
                            u: username
                        }
                    })
                        .then(resp => {

                            let userInfo = resp.data[0];

                            //Third Call
                            axios.get("api/get_beatmaps", {
                                params: {
                                    k: osuApiKey,
                                    b: recent.beatmap_id
                                }
                            })
                                .then(resp => {
                                    beatmapInfo = resp.data[0];

                                    axios.get('api/get_user_best', { params: {
                                            k: osuApiKey,
                                            u: username,
                                            limit: 100
                                        }
                                    })
                                        .then(resp => {
                                            const topPlays = resp.data

                                            for (let play in topPlays) {
                                                let scoreMatch = true

                                                delete topPlays[8]['pp']

                                                const aProps = Object.getOwnPropertyNames(recent)
                                                const bProps = Object.getOwnPropertyNames(topPlays[play])

                                                if (aProps.length !== bProps.length) {
                                                    scoreMatch = false
                                                }

                                                for (let prop in aProps) {
                                                    const propName = aProps[prop]

                                                    if (recent[propName] !== topPlays[play][propName] && propName !== 'date') {
                                                        scoreMatch = false
                                                    }
                                                }

                                                if (scoreMatch) {
                                                    recent.playNumber = parseInt(play) + 1
                                                }
                                            }

                                            recent.enabled_mods = functions.determineMods(recent);

                                            userAcc = "";
                                            recent.accuracy = functions.determineAcc(recent);

                                            let playDate = Date.parse(recent.date); //UTC + 0
                                            let currentDate = Date.now() + 25200000; //UTC + 7
                                            recent.date = functions.timeDifference(currentDate, playDate);

                                            calculate(beatmapInfo, recent, userInfo, m, rankingEmojis)
                                        })
                                        .catch(err => {
                                        console.log(err)
                                        m.channel.send("Error! More info: " + err);
                                        })



                                })
                        })
                        .catch(err => {
                        console.log(err)
                        m.channel.send("Error! More info: " + err);
                        })
                }
            })
            .catch(err => {
            console.log(err)
            m.channel.send("Error! More info: " + err);
            })
    }
};

const calculate = (beatmap, performance, userInfo, m, rankingEmojis) => {

    let cleanBeatmap;

    axios.get('osu/' + beatmap.beatmap_id, {params: {
            credentials: "include"
        }
    })
    .then(resp => {
        return resp.data
    })
    .then(raw => new ojsama.parser().feed(raw))
    .then(({ map }) => {
        cleanBeatmap = map;
        let usedMods = ojsama.modbits.from_string(performance.enabled_mods);

        let stars = new ojsama.diff().calc({ map: cleanBeatmap, mods: usedMods });
        let combo = parseInt(performance.maxcombo);
        let nmiss = parseInt(performance.countmiss);
        let acc_percent = parseFloat(performance.accuracy);

        let recentPP = ojsama.ppv2({
            stars: stars,
            combo: combo,
            nmiss: nmiss,
            acc_percent: acc_percent
        })

        let maxPP = ojsama.ppv2({
            stars: stars
        })

        formattedStars = stars.toString().split(" ")[0];
        formattedPerformancePP = recentPP.toString().split(" ")[0];
        formattedMaxPP = maxPP.toString().split(" ")[0];

        generateRecent(m, userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars, rankingEmojis);
    })
    .catch(err => {
        console.log(err);
        m.channel.send("There was an error! More info: " + err);
    })
};

const generateRecent = (m, userInfo, beatmapInfo, recent, performancePP, maxPP, stars, rankingEmojis) => {

    console.log(recent);

    if (recent.rank.length === 1) {
        recent.rank += "_";
    };

    let rankImage;

    rankImage = rankingEmojis.find("name", recent.rank);

    let embed = new Discord.RichEmbed()
        .setColor("#c0c0c0")
        .setAuthor(`Recent Play for ${userInfo.username}: ${parseFloat(userInfo.pp_raw).toLocaleString('en')}pp (#${parseInt(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseInt(userInfo.pp_country_rank).toLocaleString('en')})`, `https://a.ppy.sh/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapInfo.beatmapset_id + "l.jpg")
        .setDescription(`**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`)
        .addField(`\u2022 \:star: **${stars}*** ${recent.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((recent.score)).toLocaleString("en")} (${recent.accuracy}%) | ${recent.rank === "F_" ? "~~**" + performancePP + "pp**/" + maxPP + "pp~~" : "**" + performancePP + "pp**/" + maxPP + "pp"}`, `\u2022 ${recent.maxcombo === beatmapInfo.max_combo ? "**" + recent.maxcombo + "**" : recent.maxcombo}x/**${beatmapInfo.max_combo}x** {${recent.count300}/${recent.count100}/${recent.count50}/${recent.countmiss}} | ${recent.date}`)
        .setFooter("Message sent: ")
        .setTimestamp()

    if (recent.playNumber) {
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

        embed
            .setTitle(`__PERSONAL BEST #${recent.playNumber}__`)
            .setColor(colour)
    }

    //Send Embed to Channel
    m.channel.send({embed: embed});

    functions.storeLastBeatmap(m.guild, beatmapInfo, recent);
};
