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
    //API Call get-beatmap
    axios.get("api/get_beatmaps", { params:{
                k: osuApiKey,
                b: urlInfo.beatmapId,
                s: urlInfo.beatmapSetId
            }
    })
        .then(resp => {
            beatmapAPI = resp.data[0];

            for (let key in approvedRatings) {
                if (beatmapAPI.approved === approvedRatings[key]) {
                    beatmapAPI.approved = key;
                }
            }

            beatmapAPI.total_length = convertToMinutes(beatmapAPI.total_length);

            urlInfo.beatmapId = beatmapAPI.beatmap_id;
            urlInfo.beatmapSetId = beatmapAPI.beatmapset_id;

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
                    let combo = beatmapAPI.max_combo;
                    //Calculate Star Rating for mods (unused atm)

                    //Calculate PP Ratings for a acc ranges (FC)
                    let ppAccRange = [95, 99, 100];
                    let ppAccValues = []; //Will store pp values for a range
                    for (var i = 0; i < ppAccRange.length; i++) {
                        let performanceValue = ojsama.ppv2({
                            stars: stars,
                            combo: combo,
                            nmiss: 0,
                            acc_percent: ppAccRange[i]
                        })

                        formattedPerformanceValue = performanceValue.toString().split(" ")[0];
                        ppAccValues.push(formattedPerformanceValue);
                    }

                    //Output embed
                    let mapInfo = `\u2022 **AR:** ${beatmapAPI.diff_approach} \u2022 **OD:** ${beatmapAPI.diff_overall} \u2022 **HP:** ${beatmapAPI.diff_drain} \u2022 **CS:** ${beatmapAPI.diff_size}`
                    mapInfo += `\n\u2022 **Length:** ${beatmapAPI.total_length} \u2022 **BPM:** ${Math.floor(beatmapAPI.bpm)}`
                    mapInfo += `\n\u2022 **Star Rating:** ${parseFloat(beatmapAPI.difficultyrating).toFixed(2)}* \u2022 **Max Combo:** ${beatmapAPI.max_combo}x`
                    mapInfo += `\n\n __Performance Values__ \n \u2022 **95%:** ${ppAccValues[0]}pp \u2022 **99%:** ${ppAccValues[1]}pp \u2022 **100%:** ${ppAccValues[2]}pp`
                    mapInfo += `\n\n **Downloads:** [Map](https://osu.ppy.sh/d/${beatmapAPI.beatmapset_id}) - [No Video](https://osu.ppy.sh/d/${beatmapAPI.beatmapset_id}n) - [Bloodcat](https://bloodcat.com/osu/s/${beatmapAPI.beatmapset_id})`

                    let embed = new Discord.RichEmbed()
                        .setColor('#ffb3ff')
                        .setAuthor(`${beatmapAPI.artist} - ${beatmapAPI.title} [${beatmapAPI.version}] by ${beatmapAPI.creator}`, undefined, `https://osu.ppy/beatmapsets/${beatmapAPI.beatmapset_id}#osu/${beatmapAPI.beatmap_id}`)
                        .setThumbnail("https://b.ppy.sh/thumb/" + beatmapAPI.beatmapset_id + "l.jpg")
                        //Download (standard, no video, bloodcat)
                        .setDescription(mapInfo)
                        .setFooter(`Status: ${beatmapAPI.approved}`)
                        .setTimestamp()

                    m.channel.send({embed: embed});
                });
        })
}
