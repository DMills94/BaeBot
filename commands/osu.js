const axios = require('axios');
const Discord = require('discord.js')
const { osuApiKey } = require('../config.json');
const ojsama = require('ojsama');

axios.defaults.baseURL = "https://osu.ppy.sh/";

module.exports = {
    name: "osu",
    description: "All commands relating to osu and its API",
    execute(m, args) {

        //Help
        if (args[0] === "help") {
            let embed = new Discord.RichEmbed().setColor("#fd0000").setAuthor("Commands for `osu").setDescription("All commands are `osu [field] [params]").addField("user [USER_NAME]", "Look up basic profile stats of a user").addField("top [USER_NAME]", "Display a users Top-5").setFooter("Contact @Bae#3308 with any issues");

            m.channel.send({embed: embed})//User Lookup);
        }

        else if (args[0] === "user" || args[0] === "avatar") {

            const userName = args.slice(1).join('_');

            axios.get("api/get_user", {
                params: {
                    k: osuApiKey,
                    u: userName
                }
            }).then(r => {
                if (r.data.length == 0) {
                    m.reply("That username does not exist! Please try again.")
                    return;
                } else {

                    let user = r.data[0];

                    if (args[0] === "user") {

                        let embed = new Discord.RichEmbed().setColor("#fcee03").setAuthor(user.username, undefined, "https://osu.ppy.sh/users/" + user.user_id).setThumbnail("https://osu.ppy.sh/a/" + user.user_id).setTimestamp().setDescription("Country: " + user.country + " | Playcount: " + user.playcount).addField("Rank", "#" + parseInt(user.pp_rank).toLocaleString('en')).addField("Country Rank", "#" + parseInt(user.pp_country_rank).toLocaleString('en')).addField("PP", Math.round(user.pp_raw) + "pp").addField("Accuracy", parseFloat(user.accuracy).toFixed(2) + "%")

                        m.channel.send({embed: embed});
                    } else if (args[0] === "avatar") {
                        m.channel.send("Avatar for: " + user.username, {
                            file: "https://osu.ppy.sh/a/" + user.user_id + ".jpg"
                        }).catch(err => {
                            m.channel.send("This user has an invalid, or no avatar.")
                        })
                    }
                }
            })
            .catch(err => {
                console.log(err)
                m.channel.send("Error! More info: " + err);
            })
        }

        //User Top 5
        else if (args[0] === "top") {

            const userName = args.slice(1).join('_')

            //First Call
            axios.get("api/get_user_best", { params: {
                    k: osuApiKey,
                    u: userName,
                    limit: "5"
                }
            })
            .then(resp => {
                if (resp.data.length == 0) {
                    m.reply("That username does not exist! Please try again.")
                    return;
                } else {

                    scores = resp.data;

                    //Second Call
                    axios.get("api/get_user", {params: {
                            k: osuApiKey,
                            u: userName
                        }
                    })
                    .then(resp => {
                        osuUser = resp.data[0];

                        //Determine Mods used for scores
                        for (let i = 0; i < scores.length; i++) {
                            mods = "";
                            determineMods(scores[i]);
                            scores[i].enabled_mods = mods;
                        }

                        //Calculate accuracy
                        for (let i = 0; i < scores.length; i++) {
                            userAcc = (parseInt(scores[i].count300) * 300 + parseInt(scores[i].count100) * 100 + parseInt(scores[i].count50) * 50) / ((parseInt(scores[i].count300) + parseInt(scores[i].count100) + parseInt(scores[i].count50) + parseInt(scores[i].countmiss)) * 300) * 100;
                            scores[i].accuracy = determineAcc(scores[i])
                        }

                        //Time Since Playcount
                        for (let i = 0; i < scores.length; i++) {
                            let playDate = Date.parse(scores[i].date);
                            let currentDate = Date.now() + 28800000; //playDate is from UTC+8
                            scores[i].date = timeDifference(currentDate, playDate);
                        }


                        beatmapList = [];
                        mapNum = 0

                        //Third Call x5 (5 beat maps)

                        getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList);

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

        //Recent
        else if (args[0] === "recent") {
            const userName = args.slice(1).join('_');

            //First Call
            axios.get("api/get_user_recent", { params: {
                    k: osuApiKey,
                    u: userName,
                    limit: "1"
                }
            })
            .then(resp => {
                if (resp.data.length == 0) {
                    m.reply("That username does not exist, or has not played in over 24 hours! Please try again.")
                    return;
                } else {
                    const recent = resp.data[0];
                    //Second Call
                    axios.get("api/get_user", {params: {
                            k: osuApiKey,
                            u: userName
                        }
                    })
                    .then(resp => {

                        let userInfo = resp.data[0];

                        //Third Call
                        axios.get("api/get_beatmaps", {params: {
                                k: osuApiKey,
                                b: recent.beatmap_id
                            }
                        })
                        .then(resp => {
                            beatmapInfo = resp.data[0];

                            mods = "";
                            determineMods(recent);
                            recent.enabled_mods = mods;

                            userAcc = "";
                            recent.accuracy = determineAcc(recent);

                            let playDate = Date.parse(recent.date);
                            let currentDate = Date.now() + 28800000; //playDate is from UTC+8
                            recent.date = timeDifference(currentDate, playDate);

                            calculate(beatmapInfo, recent, userInfo, m, "recent")
                        })
                    })
                }
            })
            .catch(err => {
                console.log(err)
                m.channel.send("Error! More info: " + err);
            })//if args[0] isn't a command.)
        } else {
            m.channel.send("Try `osu help");
        }
    }
};

const getBeatmapInfo = (index, m, osuUser, scores, beatmapList) => {
    axios.get("api/get_beatmaps", {params: {
            k: osuApiKey,
            b: scores[index].beatmap_id
        }
    })
    .then(resp => {
        beatmapInfo = resp.data[0];
        beatmapInfo.orderKey = mapNum + 1;
        beatmapList.push(beatmapInfo);

        calculate(beatmapInfo, scores[index], osuUser, m, "top");
    }).catch(err => {
        console.log(err)
        m.channel.send("Error! More info: " + err);
    })
}

//Function to change returned "mods" value to actual Mods
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

const determineMods = score => {
    if (score.enabled_mods == "0") {
        mods = "NoMod";
    } else {
        for (i = 0; i < modnames.length; i++) {
            if (score.enabled_mods & modnames[i].val) {
                mods += modnames[i].short;
            }
        }
    }
};

const determineAcc = score => {
    userAcc = (parseInt(score.count300) * 300 + parseInt(score.count100) * 100 + parseInt(score.count50) * 50) / ((parseInt(score.count300) + parseInt(score.count100) + parseInt(score.count50) + parseInt(score.countmiss)) * 300) * 100;
    return userAcc.toFixed(2).toString();
};

const calculate = (beatmap, performance, userInfo, m, query) => {

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
        console.log(recentPP);

        let maxPP = ojsama.ppv2({
            stars: stars
        })

        formattedStars = stars.toString().split(" ")[0];
        formattedPerformancePP = recentPP.toString().split(" ")[0];
        formattedMaxPP = maxPP.toString().split(" ")[0];

        if (query === "recent") {
            generateRecent(m, userInfo, beatmap, performance, formattedPerformancePP, formattedMaxPP, formattedStars);
        }
        else if (query === "top") {
            scores[mapNum].maxPP = formattedMaxPP;
            scores[mapNum].stars = formattedStars;

            if (beatmapList.length == scores.length) {
                generateTop(m, osuUser, scores, beatmapList)
            } else {
                mapNum++
                getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList);
            }
        }
    })
    .catch(err => {
        console.log(err);
        m.channel.send("There was an error! More info: " + err);
    })


};

const timeDifference = (current, previous) => {
    const msPerMinute = 60 * 1000; //60,000
    const msPerHour = msPerMinute * 60; //3,600,000
    const msPerDay = msPerHour * 24; //86,400,000

    let elapsed = current - previous;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' seconds ago';
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' minutes ago';
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours ago';
    } else {
        return Math.round(elapsed / msPerDay) + ' days ago';
    }
};

const generateRecent = (m, userInfo, beatmapInfo, recent, performancePP, maxPP, stars) => {
    let embed = new Discord.RichEmbed()
        .setColor("#0000b2")
        .setAuthor("Recent Play for: " + userInfo.username, "https://osu.ppy.sh/a/" + userInfo.user_id, "https://osu.ppy.sh/users/" + userInfo.user_id)
        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapInfo.beatmapset_id + "l.jpg")
        .setTitle(beatmapInfo.artist + " - " + beatmapInfo.title + " [" + beatmapInfo.version + "]")
        .setURL("https://osu.ppy.sh/b/" + beatmapInfo.beatmap_id)
        .addField(stars + "* | +" + recent.enabled_mods + " |     Score: " + parseInt(recent.score).toLocaleString('en') + " (" + recent.accuracy + "%) | " + recent.date, performancePP + "pp/" + maxPP + "pp | Combo: " + recent.maxcombo + "x/" + beatmapInfo.max_combo + "x {" + recent.count300 + "/" + recent.count100 + "/" + recent.count50 + "/" + recent.countmiss + "}")
        .setTimestamp()

    //Send Embed to Channel
    m.channel.send({embed: embed});
}

const generateTop = (m, osuUser, scores, maps) => {
    //Create RichEmbed
    let embed = new Discord.RichEmbed()
        .setColor("#FFFFFF")
        .setAuthor("Top 5 plays for " + osuUser.username, undefined, "https://osu.ppy.sh/users/" + osuUser.user_id)
        .setThumbnail("https://osu.ppy.sh/a/" + osuUser.user_id)
        .setTimestamp()
        .addField("__PERSONAL BEST #1__", topInfoInfo(0, scores, maps))
        .addField("__PERSONAL BEST #2__", topInfoInfo(1, scores, maps))
        .addField("__PERSONAL BEST #3__", topInfoInfo(2, scores, maps))
        .addField("__PERSONAL BEST #4__", topInfoInfo(3, scores, maps))
        .addField("__PERSONAL BEST #5__", topInfoInfo(4, scores, maps))
        .setFooter("Message sent: ")

    //Send Embed to Channel
    m.channel.send({embed: embed});
};

const topInfoInfo = (index, scores, maps) => {
    return "[__**" + maps[index].artist + " - " + maps[index].title + " [" + maps[index].version + "]**__](https://osu.ppy.sh/b/" + maps[index].beatmap_id + ")\n\u2022 Stars: **" + scores[index].stars + "**\n\u2022 Mods: **" + scores[index].enabled_mods + "** | **" + scores[index].rank + "** | **" + parseFloat(scores[index].pp).toFixed(2) + "pp**/" + scores[index].maxPP + "pp \n\u2022 Score: " + parseInt((scores[index].score)).toLocaleString('en') + " (" + scores[index].accuracy + "%) {" + scores[index].count300 + "/" + scores[index].count100 + "/" + scores[index].count50 + "/" + scores[index].countmiss + "}\n\u2022 Performance recorded: **" + scores[index].date + "**";
};
