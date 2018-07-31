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
            beatmapSetId: null,
            beatmapId: null,
        }

        //Is old site URL
        const fullUrl = args.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i);

        urlInfo.isOldLink = fullUrl[2] !== "beatmapsets";
        urlInfo.isBeatmap = fullUrl[2] =="b"; //Only used for old site links

        if (!urlInfo.isOldLink) { //New Link
            const beatmapId = fullUrl[4];

            if (!beatmapId) {
                return m.channel.send("Unsupported Gamemode!")
            }

            urlInfo.beatmapSetId = fullUrl[3];
            urlInfo.beatmapId = beatmapId.substr(5)
            console.log(urlInfo);
        }
        else { //Old Link
            urlInfo.beatmapId = fullUrl[3];
        }

        let beatmap = {};
        //API Call get-beatmap
        axios.get("api/get_beatmaps", { params:{
                    k: osuApiKey,
                    b: urlInfo.beatmapId
                }
            })
                .then(resp => {
                    beatmapAPI = resp.data[0];
                    console.log(beatmapAPI);

                    for (let key in approvedRatings) {
                        console.log(`[KEY]: ${key} | [VALUE]: ${approvedRatings[key]}`);
                        if (beatmapAPI.approved === approvedRatings[key]) {
                            console.log("MATCH");
                            beatmapAPI.approved = key;
                        }
                    }

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
                            console.log(beatmapAPI);

                            let stars = new ojsama.diff().calc({ map: beatmapConfig, mods: 0 })
                            let combo = beatmapAPI.max_combo;

                            //Calculate Star Rating for mods (unused atm)


                            //Calculate PP Ratings for a acc ranges (FC)
                            let ppAccRange = [90, 95, 98, 99, 100];
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
                            let embed = new Discord.RichEmbed()
                                .setColor('#ffb3ff')
                                .setAuthor(`${beatmapAPI.artist} - ${beatmapAPI.title} [${beatmapAPI.version}]`, undefined, `https://osu.ppy/beatmapsets/${beatmapAPI.beatmapset_id}#osu/${beatmapAPI.beatmap_id}`)
                                .setFooter(`Status: ${beatmapAPI.approved}`)
                                .setTimestamp()

                            m.channel.send('Work in progress!')
                            m.channel.send({embed: embed});
                        });
                })
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
