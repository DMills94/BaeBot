const axios = require('axios');
const Discord = require('discord.js')
const {
    osuApiKey,
    dbUrl
} = require('../config.json');
const ojsama = require('ojsama');
const functions = require('./exportFunctions.js');

const dbCall = axios.create({
    baseURL: dbUrl
});

module.exports = {
    name: "compare",
    description: "Compares the users best play against the last posted beatmap in that guild",
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
            username = args.join("_");
        }

        if (!username) {
            return;
        }

        //Get Beatmap Id
        let beatmapId;

        dbCall.get(`lastBeatmap/${m.guild.id}.json`)
            .then(resp => {
                beatmapId = resp.data;

                //User information
                axios.get('api/get_user', {
                        params: {
                            k: osuApiKey,
                            u: username
                        }
                    })
                    .then(resp => {
                        let userInfo = resp.data[0];

                        //Beatmap information
                        axios.get('api/get_beatmaps', {
                                params: {
                                    k: osuApiKey,
                                    b: beatmapId
                                }
                            })
                            .then(resp => {
                                let beatmapInfo = resp.data[0];

                                //User's score
                                axios.get('api/get_scores', {
                                        params: {
                                            k: osuApiKey,
                                            b: beatmapId,
                                            u: username
                                        }
                                    })
                                    .then(resp => {
                                        if (resp.data.length < 1) {
                                            m.channel.send("Go play the map first, dumb bitch - Belial 2k18");
                                            return;
                                        };

                                        let score = resp.data[0];

                                        mods = "";
                                        functions.determineMods(score);
                                        score.enabled_mods = mods;

                                        userAcc = "";
                                        score.accuracy = functions.determineAcc(score);

                                        let playDate = Date.parse(score.date); //UTC + 0
                                        let currentDate = Date.now() + 25200000; //UTC + 7
                                        score.date = functions.timeDifference(currentDate, playDate);

                                        calculate(beatmapInfo, score, userInfo, m, "recent", rankingEmojis)
                                    })
                                    .catch(err => {
                                        m.channel.send("There was an error getting your score on the map! Sorry about that, try later!");
                                        console.log(err);
                                    })
                            })
                            .catch(err => {
                                m.channel.send("There was an error fetching the beatmaps info! Sorry about that, try later!");
                                console.log(err);
                            })
                    })
                    .catch(err => {
                        m.channel.send("There was an error fetching your user info! Sorry about that, try later!");
                        console.log(err);
                    })
            })
            .catch(err => {
                m.channel.send("There was an error fetching the last beatmap! Sorry about that, try later!");
                console.log(err);
            })
    }
}

const calculate = (beatmap, performance, userInfo, m, query, rankingEmojis) => {

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
        .then(({ map }) => {
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

            generateCompare(m, userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars, rankingEmojis);
        })
        .catch(err => {
            console.log(err);
            m.channel.send("There was an error! More info: " + err);
        })
};

const generateCompare = (m, userInfo, beatmapInfo, score, performancePP, maxPP, stars, rankingEmojis) => {

    if (score.rank.length === 1) {
        score.rank += "_";
    };

    let rankImage;

    rankImage = rankingEmojis.find("name", score.rank);

    let embed = new Discord.RichEmbed()
        .setColor("#0000b2")
        .setAuthor(`Best Play for ${userInfo.username}: ${userInfo.pp_raw}pp (#${parseFloat(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseFloat(userInfo.pp_country_rank).toLocaleString('en')})`, `https://osu.ppy.sh/a/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapInfo.beatmapset_id + "l.jpg")
        .setTitle(beatmapInfo.artist + " - " + beatmapInfo.title + " [" + beatmapInfo.version + "]")
        .setURL("https://osu.ppy.sh/b/" + beatmapInfo.beatmap_id)
        .addField(`\u2022 \:star: **${stars}*** ${score.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((score.score)).toLocaleString("en")} (${score.accuracy}%) | ${score.rank === "F_" ? "~~**" + performancePP + "pp**/" + maxPP + "pp~~" : "**" + performancePP + "pp**/" + maxPP + "pp"}`, `\u2022 ${score.maxcombo === beatmapInfo.max_combo ? "**" + score.maxcombo + "**" : score.maxcombo}x/**${beatmapInfo.max_combo}x** {${score.count300}/${score.count100}/${score.count50}/${score.countmiss}} | ${score.date}`)
        .setFooter("Message sent: ")
        .setTimestamp()

    //Send Embed to Channel
    m.channel.send({embed: embed});
};
