const axios = require("axios");
const Discord = require("discord.js")
const { osuApiKey } = require("../config.json");
const ojsama = require("ojsama");
const functions = require("./exportFunctions.js");

module.exports = {
    name: "rb",
    description: "Displays users recent best (default: most recent)",
    async execute(m, args, rankingEmojis, rbNum) {
        let username;

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id)
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`");
                    return;
                })
        } else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1);
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1);
            }
            username = await functions.lookupUser(discordId)
                .catch(err => {
                    m.reply("they do not have a linked account so I cannot find their top plays :(");
                    return;
                })
        } else {
            username = args.join("_");
        };

        if (!username) {
            return;
        }

        //get users top 100
        axios.get("api/get_user_best", {
                params: {
                    k: osuApiKey,
                    u: username,
                    limit: 100
                }
            })
            .then(resp => {
                const unsortedTopScores = resp.data;

                for (let score in unsortedTopScores) {
                    unsortedTopScores[score].playNumber = parseInt(score) + 1;
                    unsortedTopScores[score].date = Date.parse(unsortedTopScores[score].date);
                };

                const topScores = unsortedTopScores.sort((a, b) => {
                    return b.date - a.date;
                });

                usersScore = topScores[rbNum - 1];

                mods = functions.determineMods(usersScore);
                usersScore.enabled_mods = mods;

                userAcc = "";
                usersScore.accuracy = functions.determineAcc(usersScore);

                let playDate = usersScore.date; //UTC + 0
                let currentDate = Date.now() + 25200000; //UTC + 7
                usersScore.date = functions.timeDifference(currentDate, playDate);

                axios.get("api/get_user", {
                        params: {
                            k: osuApiKey,
                            u: username,
                        }
                    })
                    .then(resp => {
                        const userInfo = resp.data[0];
                        if (!userInfo) {
                            return m.channel.send("The username provided doesn't exist! Please try again.")
                        };

                        axios.get("api/get_beatmaps", {
                                params: {
                                    k: osuApiKey,
                                    b: usersScore.beatmap_id
                                }
                            })
                            .then(resp => {
                                const beatmapInfo = resp.data[0];

                                calculate(beatmapInfo, usersScore, userInfo, m, rankingEmojis)
                            })
                            .catch(err => {
                                console.log(err);
                                m.channel.send("Error! More info: " + err);
                            })
                    })
                    .catch(err => {
                        console.log(err);
                        m.channel.send("Error! More info: " + err);
                    })
            })
            .catch(err => {
                console.log(err);
                m.channel.send("Error! More info: " + err);
            })
    }
};

const calculate = (beatmap, performance, userInfo, m, rankingEmojis) => {

    let cleanBeatmap;

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
            cleanBeatmap = map;
            let usedMods = ojsama.modbits.from_string(performance.enabled_mods);

            let stars = new ojsama.diff().calc({
                map: cleanBeatmap,
                mods: usedMods
            });
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

            generateRB(m, userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars, rankingEmojis);
        })
        .catch(err => {
            console.log(err);
            m.channel.send("There was an error! More info: " + err);
        })
};

const generateRB = (m, userInfo, prevBeatmap, score, performancePP, maxPP, stars, rankingEmojis) => {

    if (score.rank.length === 1) {
        score.rank += "_";
    };

    let rankImage;

    rankImage = rankingEmojis.find("name", score.rank);
    let colour;

    switch (score.playNumber) {
        case 1:
            colour = "#FFD700";
            break;
        case 2:
            colour = "#FFFFFF";
            break;
        case 3:
            colour = "#cd7f32";
            break;
        default:
            colour = "#c0c0c0";
            break;
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

    //Send Embed to Channel
    m.channel.send({
        embed: embed
    });

    functions.storeLastBeatmap(m.guild, prevBeatmap, score);
};
