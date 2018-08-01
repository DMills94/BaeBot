const axios = require('axios');
const Discord = require('discord.js')
const { osuApiKey } = require('../config.json');
const ojsama = require('ojsama');

module.exports = {
    name: "recognise beatmap",
    description: "Gets information about a beatmap link posted in chat",
    execute(m, args) {

        // Extract Beatmap ID
        const urlInfo = {
            isOldLink: null,
            isBeatmap: null,
            isSet: null,
            beatmapSetId: null,
            beatmapId: null,
        }

        //Is old site URL
        const fullUrl = args.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i);

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

            beatmapLookup(urlInfo, m);
        }
        else { //Old Link
            if (urlInfo.isBeatmap) {
                urlInfo.beatmapId = fullUrl[3];
            }
            if (urlInfo.isSet) {
                urlInfo.beatmapSetId = fullUrl[3];
            }

            beatmapLookup(urlInfo, m);
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

const beatmapLookup = (urlInfo, m) => {
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
            })
            let counter = 1;

            for (let i = 0; i < beatmapAPI.length; i++) {
                for (let key in approvedRatings) {
                    if (beatmapAPI[i].approved === approvedRatings[key]) {
                        beatmapAPI[i].approved = key;
                    }
                }

                beatmapAPI[i].total_length = convertToMinutes(beatmapAPI[i].total_length);

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

                        let stars = new ojsama.diff().calc({ map: beatmapConfig, mods: 0 })
                        let combo = beatmapAPI[i].max_combo;
                        //Calculate Star Rating for mods (unused atm)

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
                        }
                        beatmapAPI[i].ppAccValues = ppAccValues;


                        //Output embed
                        if (counter === beatmapAPI.length) {
                            let mapInfo = "";

                            for (let i = 0; i < 3; i++) {
                                if (i === beatmapAPI.length) {
                                    break;
                                }

                                mapInfo += `\n----------------------------`
                                mapInfo += `\n__**Difficulty: ${beatmapAPI[i].version}**__`
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
