const axios = require("axios");
const Discord = require("discord.js")
const { osuApiKey } = require("../config.json");
const ojsama = require("ojsama");
const functions = require("./exportFunctions.js");

module.exports = {
    name: "top",
    description: "Displays users top 5 plays",
    async execute(m, args, plays, top5, rankingEmojis) {
        let username;

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id)
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`");
                    return;
                })
        }
        else {
            username = args.join("_");
        }

        if (!username) {
            return;
        }

        //First Call
        axios.get("api/get_user_best", { params: {
                k: osuApiKey,
                u: username,
                limit: plays
            }
        })
        .then(resp => {
            if (resp.data.length == 0) {
                m.reply("That username does not exist! Please try again.")
                return;
            } else {

                if (top5) {
                    scores = resp.data;
                }
                else {
                    scores = resp.data[resp.data.length-1];
                    let scoresArray = [];
                    scoresArray.push(scores);
                    scores = scoresArray;
                }

                //Second Call
                axios.get("api/get_user", {params: {
                        k: osuApiKey,
                        u: username
                    }
                })
                .then(resp => {
                    osuUser = resp.data[0];

                    //Determine Mods used for scores
                    for (let i = 0; i < scores.length; i++) {
                        mods = "";
                        functions.determineMods(scores[i]);
                        scores[i].enabled_mods = mods;
                    }

                    //Calculate accuracy
                    for (let i = 0; i < scores.length; i++) {
                        userAcc = (parseInt(scores[i].count300) * 300 + parseInt(scores[i].count100) * 100 + parseInt(scores[i].count50) * 50) / ((parseInt(scores[i].count300) + parseInt(scores[i].count100) + parseInt(scores[i].count50) + parseInt(scores[i].countmiss)) * 300) * 100;
                        scores[i].accuracy = functions.determineAcc(scores[i])
                    }

                    //Time Since Playcount
                    for (let i = 0; i < scores.length; i++) {
                        let playDate = Date.parse(scores[i].date);
                        let currentDate = Date.now() - 3600000;
                        scores[i].date = functions.timeDifference(currentDate, playDate);
                    }


                    beatmapList = [];
                    mapNum = 0

                    //Third Call x5 (5 beat maps)

                    getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList, top5, plays, rankingEmojis);

                }).catch(err => {
                    console.log(err)
                    m.channel.send("Error! More info: " + err);
                });
            }
        }).catch(err => {
            console.log(err)
            m.channel.send("Error! More info: " + err);
        })
    }
};

const getBeatmapInfo = (index, m, osuUser, scores, beatmapList, top5, plays, rankingEmojis) => {
    axios.get("api/get_beatmaps", {params: {
            k: osuApiKey,
            b: scores[index].beatmap_id
        }
    })
    .then(resp => {
        beatmapInfo = resp.data[0];
        beatmapInfo.orderKey = mapNum + 1;
        beatmapList.push(beatmapInfo);

        calculate(beatmapInfo, scores[index], osuUser, m, "top", top5, plays, rankingEmojis);
    }).catch(err => {
        console.log(err)
        m.channel.send("Error! More info: " + err);
    })
}

const calculate = (beatmap, performance, userInfo, m, query, top5, plays, rankingEmojis) => {

    let cleanBeatmap;

    axios.get("osu/" + beatmap.beatmap_id, {params: {
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

        scores[mapNum].maxPP = formattedMaxPP;
        scores[mapNum].stars = formattedStars;

        if (beatmapList.length == scores.length) {
            generateTop(m, osuUser, scores, beatmapList, top5, plays, rankingEmojis)
        } else {
            mapNum++
            getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList, top5, plays, rankingEmojis);
        }
    })
    .catch(err => {
        console.log(err);
        m.channel.send("There was an error! More info: " + err);
    })


};

const generateTop = (m, osuUser, scores, maps, top5, plays, rankingEmojis) => {
    let embed = new Discord.RichEmbed();
    if (top5) {
        embed
            .setColor("#FFFFFF")
            .setAuthor(`Top 5 Plays for ${osuUser.username}: ${parseFloat(osuUser.pp_raw).toLocaleString('en')}pp (#${parseInt(osuUser.pp_rank).toLocaleString('en')} ${osuUser.country}#${parseInt(osuUser.pp_country_rank).toLocaleString('en')})`, `https://osu.ppy.sh/a/${osuUser.user_id}`, "https://osu.ppy.sh/users/" + osuUser.user_id)
            .setThumbnail("https://osu.ppy.sh/a/" + osuUser.user_id)
            .addField("__PERSONAL BEST #1__", topInfoInfo(0, scores, maps, rankingEmojis))
            .addField("__PERSONAL BEST #2__", topInfoInfo(1, scores, maps, rankingEmojis))
            .addField("__PERSONAL BEST #3__", topInfoInfo(2, scores, maps, rankingEmojis))
            .addField("__PERSONAL BEST #4__", topInfoInfo(3, scores, maps, rankingEmojis))
            .addField("__PERSONAL BEST #5__", topInfoInfo(4, scores, maps, rankingEmojis))
            .setFooter("Message sent: ")
            .setTimestamp()
    }
    else {
        embed
            .setColor("#FFFFFF")
            .setAuthor(`Top Play for ${osuUser.username}: ${parseFloat(osuUser.pp_raw).toLocaleString('en')}pp (#${parseInt(osuUser.pp_rank).toLocaleString('en')} ${osuUser.country}#${parseInt(osuUser.pp_country_rank).toLocaleString('en')})`, `https://osu.ppy.sh/a/${osuUser.user_id}`, "https://osu.ppy.sh/users/" + osuUser.user_id)
            .setThumbnail("https://b.ppy.sh/thumb/" + maps[0].beatmapset_id + "l.jpg")
            .addField(`__PERSONAL BEST #${plays}__`, topInfoInfo(0, scores, maps, rankingEmojis))
            .setFooter("Message sent: ")
            .setTimestamp()

        functions.storeLastBeatmapId(m.guild, maps[0].beatmap_id);
    }

    //Send Embed to Channel
    m.channel.send({embed: embed});
};

const topInfoInfo = (index, scores, maps, rankingEmojis) => {
    if (scores[index].rank.length === 1) {
        scores[index].rank += "_";
    };
    const rankImage = rankingEmojis.find("name", scores[index].rank)

    return `**[${maps[index].artist} - ${maps[index].title} [${maps[index].version}]](https://osu.ppy.sh/b/${maps[index].beatmap_id})** \n\u2022 \:star: **${scores[index].stars}*** ${scores[index].enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((scores[index].score)).toLocaleString("en")} (${scores[index].accuracy}%) | **${parseFloat(scores[index].pp).toFixed(2)}pp**/${scores[index].maxPP}pp \n\u2022 ${scores[index].maxcombo === maps[index].max_combo ? "**" + scores[index].maxcombo + "x**" : scores[index].maxcombo}/**${maps[index].max_combo}x** {${scores[index].count300}/${scores[index].count100}/${scores[index].count50}/${scores[index].countmiss}} | ${scores[index].date}`;
};
