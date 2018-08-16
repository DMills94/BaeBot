const axios = require('axios');
const Discord = require('discord.js')
const { osuApiKey } = require('../config.json');
const ojsama = require('ojsama');

module.exports = {
    name: "recognise beatmap",
    description: "Gets information about a beatmap link posted in chat",
    execute(m, args) {

        const splitArgs = args.split(" ");
        let uIMods = "";

        const beatmapURL = splitArgs[0];

        if (splitArgs[1] && splitArgs[1].startsWith("+")) {
            uIMods = splitArgs[1].slice(1).toLowerCase();
            //check uIMods is correct strings

            uIModsParts = uIMods.match(/[\s\S]{1,2}/g)
            console.log(uIModsParts);
            for (let mod of uIModsParts) {
                if (!["hd", "hr", "dt", "nc", "so", "nf", "fl", "ht", "ez"].includes(mod)) {
                    return m.reply("invalid mod entry, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods `[beatmapURL] +[mods]`")
                }
                // else {
                //     return m.reply("invalid mod entry, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods `[beatmapURL] +[mods]`")
                // }
            }

            if (uIMods.includes("hr") && uIMods.includes("ez")) {
                return m.reply("mods cannot include BOTH Hard Rock AND Easy! Please try again.")
            }
            if (uIMods.includes("dt") && uIMods.includes("nc") || uIMods.includes("dt") && uIMods.includes("ht") || uIMods.includes("ht") && uIMods.includes("nc")) {
                    return m.reply("mods cannot include BOTH Double Time/Nightcore AND Half Time! Please try again.")
            }
        }
        else if (splitArgs[1] && !splitArgs[1].startsWith("+")) {
            m.channel.send("Invalid mod entry!\nIf you want to add mods, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods like: `[beatmapURL] +[mods]`\nReturning result for `nomod`");
        }

        console.log(`[URL] ${beatmapURL}`);
        console.log(`[MODS] ${uIMods}`);

        // Extract Beatmap ID
        const urlInfo = {
            isOldLink: null,
            isBeatmap: null,
            isSet: null,
            beatmapSetId: null,
            beatmapId: null,
        }

        //Is old site URL
        const fullUrl = beatmapURL.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i);

        urlInfo.isOldLink = fullUrl[2] !== "beatmapsets";
        urlInfo.isBeatmap = fullUrl[2] === "b"; //Only used for old site links
        urlInfo.isSet = fullUrl[2] === "s"; //Only used for old site links

        if (!urlInfo.isOldLink) { //New Link
            const beatmapId = fullUrl[4];

            if (!beatmapId) { //Make so set id still works - get top diff.
                urlInfo.beatmapSetId = fullUrl[3];
            }
            else {
                urlInfo.beatmapSetId = fullUrl[3];
                urlInfo.beatmapId = beatmapId.substr(5)
            }

            beatmapLookup(urlInfo, m, uIMods);
        }
        else { //Old Link
            if (urlInfo.isBeatmap) {
                urlInfo.beatmapId = fullUrl[3];
            }
            if (urlInfo.isSet) {
                urlInfo.beatmapSetId = fullUrl[3];
            }

            beatmapLookup(urlInfo, m, uIMods);
        }
    }
}

const approvedRatings = {
    "Loved": "4",
    "Qualified": "3",
    "Approved": "2",
    "Ranked": "1",
    "Pending": "0",
    "WIP": "-1",
    "Graveyard": "-2"
}

const convertToMinutes = seconds => {
    return (seconds - (seconds %= 60)) / 60 + (9 < seconds ? ':' : ':0' ) + seconds;
}

const beatmapLookup = (urlInfo, m, mods) => {
    let beatmap = {};
    let params = {};
    if (urlInfo.beatmapId) {
        params = {
            k: osuApiKey,
            b: urlInfo.beatmapId
        }
    }
    if (!urlInfo.beatmapId && urlInfo.beatmapSetId) {
            params = {
                k: osuApiKey,
                s: urlInfo.beatmapSetId
            }
    }
    //API Call get-beatmap
    axios.get("api/get_beatmaps", { params: params})
        .then(resp => {
            unsortedBeatmapAPI = resp.data;
            beatmapAPI = unsortedBeatmapAPI.sort((a, b) => {
                return b.difficultyrating - a.difficultyrating;
            });
            let counter = 1;

            for (let i = 0; i < beatmapAPI.length; i++) {
                for (let key in approvedRatings) {
                    if (beatmapAPI[i].approved === approvedRatings[key]) {
                        beatmapAPI[i].approved = key;
                    };
                };

                beatmapAPI[i].total_length = convertToMinutes(beatmapAPI[i].total_length);
                if (mods.includes("dt") || mods.includes("nc")) {
                    beatmapAPI[i].bpm = Math.floor(beatmapAPI[i].bpm * 1.5);

                    let splitTime = beatmapAPI[i].total_length.split(":");
                    let minsToSeconds = parseInt(splitTime[0], 10)*60;
                    let totalSeconds = minsToSeconds + parseInt(splitTime[1], 10);
                    let newTime = Math.floor(totalSeconds / 1.5);
                    let newMinutes = Math.floor(newTime / 60).toString();
                    let newSeconds = (newTime - newMinutes * 60).toString();
                    beatmapAPI[i].total_length = "".concat(newMinutes, ":", newSeconds);

                    beatmapAPI[i].diff_drain
                    beatmapAPI[i].diff_approach
                    beatmapAPI[i].diff_overall
                }
                else if (mods.includes("ht")) {
                    beatmapAPI[i].bpm = Math.floor(beatmapAPI[i].bpm * 0.75);

                    let splitTime = beatmapAPI[i].total_length.split(":");
                    let minsToSeconds = parseInt(splitTime[0], 10)*60;
                    let totalSeconds = minsToSeconds + parseInt(splitTime[1], 10);
                    let newTime = Math.floor(totalSeconds * 1.33);
                    let newMinutes = Math.floor(newTime / 60).toString();
                    let newSeconds = (newTime - newMinutes * 60).toString();

                    beatmapAPI[i].diff_drain = parseFloat(beatmapAPI[i].diff_drain * 1.4).toFixed(1);
                    beatmapAPI[i].diff_approach = parseFloat(beatmapAPI[i].diff_approach * 1.4).toFixed(1);
                    beatmapAPI[i].diff_overall = parseFloat(beatmapAPI[i].diff_overall * 1.4).toFixed(1);
                }

                if (mods.includes("hr")) {
                    beatmapAPI[i].diff_drain = parseFloat(beatmapAPI[i].diff_drain * 1.4).toFixed(1);
                    beatmapAPI[i].diff_approach = parseFloat(beatmapAPI[i].diff_approach * 1.4).toFixed(1);
                    beatmapAPI[i].diff_overall = parseFloat(beatmapAPI[i].diff_overall * 1.4).toFixed(1);
                    beatmapAPI[i].diff_size = parseFloat(beatmapAPI[i].diff_size * 1.3).toFixed(2);
                }
                else if (mods.includes("ez")) {
                    beatmapAPI[i].diff_drain  = parseFloat(beatmapAPI[i].diff_drain /2).toFixed(1);
                    beatmapAPI[i].diff_approach  = parseFloat(beatmapAPI[i].diff_drain / 2).toFixed(1);
                    beatmapAPI[i].diff_overall  = parseFloat(beatmapAPI[i].diff_drain / 2).toFixed(1);
                    beatmapAPI[i].diff_size  = parseFloat(beatmapAPI[i].diff_drain / 2).toFixed(2);
                }

                urlInfo.beatmapId = beatmapAPI[i].beatmap_id;
                urlInfo.beatmapSetId = beatmapAPI[i].beatmapset_id;

                //Get Beatmap data for calculations
                axios.get('osu/' + urlInfo.beatmapId, {params: {
                        credentials: "include"
                    }
                })
                    .then(resp => {
                        return resp.data
                    })
                    .then(raw => new ojsama.parser().feed(raw))
                    .then(({ map }) => {
                        let beatmapConfig = map;

                        console.log("[MODS] " + mods);

                        ojsamaMods = ojsama.modbits.from_string(mods)

                        console.log("[ojsamaMods] " + ojsamaMods);

                        let stars = new ojsama.diff().calc({ map: beatmapConfig, mods: ojsamaMods })
                        beatmapAPI[i].difficultyrating = stars.toString();

                        let combo = beatmapAPI[i].max_combo;

                        console.log("[STARS] " + stars);


                        //Calculate PP Ratings for a acc ranges (FC)
                        let ppAccRange = [95, 99, 100];
                        let ppAccValues = []; //Will store pp values for a range
                        for (let i = 0; i < ppAccRange.length; i++) {
                            let performanceValue = ojsama.ppv2({
                                stars: stars,
                                combo: combo,
                                nmiss: 0,
                                acc_percent: ppAccRange[i]
                            })

                            formattedPerformanceValue = performanceValue.toString().split(" ")[0];
                            ppAccValues.push(formattedPerformanceValue);
                        };
                        beatmapAPI[i].ppAccValues = ppAccValues;


                        //Output embed
                        if (counter === beatmapAPI.length) {
                            let mapInfo = "";

                            for (let i = 0; i < 3; i++) {
                                if (i === beatmapAPI.length) {
                                    break;
                                }

                                mapInfo += `\n----------------------------`
                                mapInfo += `\n__**Difficulty: ${beatmapAPI[i].version}**__ **+${mods.toUpperCase()}**`
                                mapInfo += `\n\n\u2022 **AR:** ${beatmapAPI[i].diff_approach} \u2022 **OD:** ${beatmapAPI[i].diff_overall} \u2022 **HP:** ${beatmapAPI[i].diff_drain} \u2022 **CS:** ${beatmapAPI[i].diff_size}`
                                mapInfo += `\n\u2022 **Length:** ${beatmapAPI[i].total_length} \u2022 **BPM:** ${Math.floor(beatmapAPI[i].bpm)}`
                                mapInfo += `\n\u2022 **Star Rating:** ${parseFloat(beatmapAPI[i].difficultyrating).toFixed(2)}* \u2022 **Max Combo:** ${beatmapAPI[i].max_combo}x`
                                mapInfo += `\n\n __Performance Values__ \n \u2022 **95%:** ${beatmapAPI[i].ppAccValues[0]}pp \u2022 **99%:** ${beatmapAPI[i].ppAccValues[1]}pp \u2022 **100%:** ${beatmapAPI[i].ppAccValues[2]}pp`
                                mapInfo += `\n\n **Downloads:** [Map](https://osu.ppy.sh/d/${beatmapAPI[i].beatmapset_id}) - [No Video](https://osu.ppy.sh/d/${beatmapAPI[i].beatmapset_id}n) - [Bloodcat](https://bloodcat.com/osu/s/${beatmapAPI[i].beatmapset_id})`
                            }

                            let embed = new Discord.RichEmbed()
                                .setColor('#ffb3ff')
                                .setAuthor(`${beatmapAPI[0].artist} - ${beatmapAPI[0].title} by ${beatmapAPI[0].creator}`, undefined, `https://osu.ppy/beatmapsets/${beatmapAPI[0].beatmapset_id}#osu/${beatmapAPI[0].beatmap_id}`)
                                .setThumbnail("https://b.ppy.sh/thumb/" + beatmapAPI[0].beatmapset_id + "l.jpg")
                                //Download (standard, no video, bloodcat)
                                .setDescription(mapInfo)
                                .setFooter(`Status: ${beatmapAPI[0].approved}`)
                                .setTimestamp()

                            m.channel.send({embed: embed});
                        }

                        counter++;
                    });
            }
        })
}
