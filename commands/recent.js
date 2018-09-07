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
        }).then(resp => {
            if (resp.data.length == 0) {
                m.reply("That username does not exist, or has not played in over 24 hours! Please try again.")
                return;
            } else {
                const recent = resp.data[0];
                //Second Call
                axios.get("api/get_user", {
                    params: {
                        k: osuApiKey,
                        u: username
                    }
                }).then(resp => {

                    let userInfo = resp.data[0];

                    //Third Call
                    axios.get("api/get_beatmaps", {
                        params: {
                            k: osuApiKey,
                            b: recent.beatmap_id
                        }
                    }).then(resp => {
                        beatmapInfo = resp.data[0];

                        mods = "";
                        functions.determineMods(recent);
                        recent.enabled_mods = mods;

                        userAcc = "";
                        recent.accuracy = functions.determineAcc(recent);

                        let playDate = Date.parse(recent.date); //UTC + 0
                        let currentDate = Date.now() + 25200000; //UTC + 7
                        recent.date = functions.timeDifference(currentDate, playDate);

                        calculate(beatmapInfo, recent, userInfo, m, "recent", rankingEmojis)
                    })
                })
            }
        }).catch(err => {
            console.log(err)
            m.channel.send("Error! More info: " + err);
        })
    }
};

const calculate = (beatmap, performance, userInfo, m, query, rankingEmojis) => {

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

    if (recent.rank.length === 1) {
        recent.rank += "_";
    };

    let rankImage;

    rankImage = rankingEmojis.find("name", recent.rank);

    let embed = new Discord.RichEmbed()
        .setColor("#0000b2")
        .setAuthor(`Recent Play for ${userInfo.username}: ${userInfo.pp_raw}pp (#${parseFloat(userInfo.pp_rank).toLocaleString('en')} ${userInfo.country}#${parseFloat(userInfo.pp_country_rank).toLocaleString('en')})`, `https://osu.ppy.sh/a/${userInfo.user_id}`, `https://osu.ppy.sh/users/${userInfo.user_id}`)
        .setURL("https://osu.ppy.sh/b/" + beatmapInfo.beatmap_id)
        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapInfo.beatmapset_id + "l.jpg")
        .setTitle(beatmapInfo.artist + " - " + beatmapInfo.title + " [" + beatmapInfo.version + "]")
        .addField(`\u2022 \:star: **${stars}*** ${recent.enabled_mods} \n\u2022 ${rankImage} | Score: ${parseInt((recent.score)).toLocaleString("en")} (${recent.accuracy}%) | ${recent.rank === "F_" ? "~~**" + performancePP + "pp**/" + maxPP + "pp~~" : "**" + performancePP + "pp**/" + maxPP + "pp"}`, `\u2022 ${recent.maxcombo === beatmapInfo.max_combo ? "**" + recent.maxcombo + "**" : recent.maxcombo}x/**${beatmapInfo.max_combo}x** {${recent.count300}/${recent.count100}/${recent.count50}/${recent.countmiss}} | ${recent.date}`)
        .setFooter("Message sent: ")
        .setTimestamp()

    //Send Embed to Channel
    m.channel.send({embed: embed});

    functions.storeLastBeatmapId(m.guild, beatmapInfo.beatmap_id);`r`
}

let modnames = [
    {
        val: 1,
        name: "NoFail",
        short: "NF"
    }, {
        val: 2,
        name: "Easy",
        short: "EZ"
    }, {
        val: 4,
        name: "TouchDevice",
        short: "TD"
    }, {
        val: 8,
        name: "Hidden",
        short: "HD"
    }, {
        val: 16,
        name: "HardRock",
        short: "HR"
    }, {
        val: 32,
        name: "SuddenDeath",
        short: "SD"
    }, {
        val: 64,
        name: "DoubleTime",
        short: "DT"
    }, {
        val: 128,
        name: "Relax",
        short: "RX"
    }, {
        val: 256,
        name: "HalfTime",
        short: "HT"
    }, {
        val: 512,
        name: "Nightcore",
        short: "NC"
    }, {
        val: 1024,
        name: "Flashlight",
        short: "FL"
    }, {
        val: 2048,
        name: "Autoplay",
        short: "AT"
    }, {
        val: 4096,
        name: "SpunOut",
        short: "SO"
    }, {
        val: 8192,
        name: "Relax2",
        short: "AP"
    }, {
        val: 16384,
        name: "Perfect",
        short: "PF"
    }, {
        val: 32768,
        name: "Key4",
        short: "4K"
    }, {
        val: 65536,
        name: "Key5",
        short: "5K"
    }, {
        val: 131072,
        name: "Key6",
        short: "6K"
    }, {
        val: 262144,
        name: "Key7",
        short: "7K"
    }, {
        val: 524288,
        name: "Key8",
        short: "8K"
    }, {
        val: 1048576,
        name: "FadeIn",
        short: "FI"
    }, {
        val: 2097152,
        name: "Random",
        short: "RD"
    }, {
        val: 4194304,
        name: "Cinema",
        short: "CN"
    }, {
        val: 16777216,
        name: "Key9",
        short: "9K"
    }, {
        val: 33554432,
        name: "Key10",
        short: "10K"
    }, {
        val: 67108864,
        name: "Key1",
        short: "1K"
    }, {
        val: 134217728,
        name: "Key3",
        short: "3K"
    }, {
        val: 268435456,
        name: "Key2",
        short: "2K"
    }
];
