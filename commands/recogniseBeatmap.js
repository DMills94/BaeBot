const Discord = require('discord.js')
const functions = require('./exportFunctions.js')
const axios = require('axios')
const ojsama = require('ojsama')
const database = require('../databases/requests.js')

module.exports = {
    name: 'recognise beatmap',
    description: 'Gets information about a beatmap link posted in chat',
    async execute(m, args, emojis) {

        const splitArgs = args.split(' ')
        let beatmapURL
        let mods = ''
        let error = false

        splitArgs.forEach(arg => {
            if (arg.match(/https?:\/\/(osu|new).ppy.sh\/([b]|[s]|beatmapsets)\//i)) {
                beatmapURL = arg
            }
            if (arg.includes('+')) {
                mods = arg.slice(1).toLowerCase()

                modsParts = mods.match(/[\s\S]{1,2}/g)

                for (let mod of modsParts) {
                    if (!['hd', 'hr', 'dt', 'nc', 'so', 'nf', 'fl', 'ht', 'ez'].includes(mod)) {
                        error = true
                        return m.reply('invalid mod entry, please use two letter mod formats (hd, hr, dt, etc..), with no spaces between mods `[beatmapURL] +[mods]`')
                    }
                }

                if (mods.includes('hr') && mods.includes('ez')) {
                    error = true
                    return m.reply('mods cannot include BOTH Hard Rock AND Easy! Please try again.')
                }
                if (mods.includes('dt') && mods.includes('nc') || mods.includes('dt') && mods.includes('ht') || mods.includes('ht') && mods.includes('nc')) {
                    error = true
                    return m.reply('mods cannot include BOTH Double Time/Nightcore AND Half Time! Please try again.')
                }
            }
        })

        if (error)
            return

        // Extract Beatmap ID
        const urlInfo = {
            isOldLink: null,
            isBeatmap: null,
            isSet: null,
            beatmapSetId: null,
            beatmapId: null,
        }

        //Is old site URL
        const fullUrl = beatmapURL.split('/')

        urlInfo.isOldLink = fullUrl[3] !== 'beatmapsets'
        urlInfo.isBeatmap = fullUrl[3] === 'b'  //Only used for old site links
        urlInfo.isSet = fullUrl[3] === 's'  //Only used for old site links

        if (!urlInfo.isOldLink) { //New Link
            const beatmapId = fullUrl[4]

            if (!beatmapId) { //Make so set id still works - get top diff.
                urlInfo.beatmapSetId = fullUrl[4]
            }
            else {
                urlInfo.beatmapSetId = fullUrl[4]
                urlInfo.beatmapId = fullUrl[6] === undefined ? fullUrl[5] : fullUrl[6]
            }
        }
        else { //Old Link
            if (urlInfo.isBeatmap) {
                urlInfo.beatmapId = fullUrl[4].split('?')[0]
            }
            if (urlInfo.isSet) {
                urlInfo.beatmapSetId = fullUrl[4]
            }
        }

        let type, id

        if (urlInfo.beatmapId) {
            id = urlInfo.beatmapId
            type = 'b'
        }
        if (!urlInfo.beatmapId && urlInfo.beatmapSetId) {
            id = urlInfo.beatmapSetId
            type = 's'
        }

        //API Call get-beatmap
        unsortedBeatmaps = await functions.getBeatmap(id, type)

        let unsortedBeatmapAPI = []

        for (let map in unsortedBeatmaps) {
            if (unsortedBeatmaps[map].mode == 0) {
                unsortedBeatmapAPI.push(unsortedBeatmaps[map])
            }
        }

        beatmapAPI = unsortedBeatmapAPI.sort((a, b) => {
            return b.difficultyrating - a.difficultyrating
        })

        let counter = 1

        for (let i = 0; i < beatmapAPI.length; i++) {

            beatmapAPI[i].approved = await functions.approvedStatus(beatmapAPI[i].approved)

            beatmapAPI[i].total_length = convertToMinutes(beatmapAPI[i].total_length)

            if (mods.includes('hr')) {
                beatmapAPI[i].diff_drain = parseFloat(beatmapAPI[i].diff_drain * 1.4)
                beatmapAPI[i].diff_approach = parseFloat(beatmapAPI[i].diff_approach * 1.4)
                if (beatmapAPI[i].diff_approach > 10) {
                    beatmapAPI[i].diff_approach = 10
                }
                beatmapAPI[i].diff_overall = parseFloat(beatmapAPI[i].diff_overall * 1.4)
                beatmapAPI[i].diff_size = parseFloat(beatmapAPI[i].diff_size * 1.3)
            }
            else if (mods.includes('ez')) {
                beatmapAPI[i].diff_drain = parseFloat(beatmapAPI[i].diff_drain / 2)
                beatmapAPI[i].diff_approach = parseFloat(beatmapAPI[i].diff_approach / 2)
                beatmapAPI[i].diff_overall = parseFloat(beatmapAPI[i].diff_overall / 2)
                beatmapAPI[i].diff_size = parseFloat(beatmapAPI[i].diff_size / 2)
            }

            if (mods.includes('dt') || mods.includes('nc')) {
                beatmapAPI[i].bpm = Math.floor(beatmapAPI[i].bpm * 1.5)

                //Length
                let splitTime = beatmapAPI[i].total_length.split(':')
                let minsToSeconds = parseInt(splitTime[0], 10) * 60
                let totalSeconds = minsToSeconds + parseInt(splitTime[1], 10)
                let newTime = Math.floor(totalSeconds / 1.5)
                let newMinutes = Math.floor(newTime / 60).toString()
                let newSeconds = (newTime - newMinutes * 60).toString()
                beatmapAPI[i].total_length = ''.concat(newMinutes, ':', newSeconds)

                //AR
                const ar = beatmapAPI[i].diff_approach
                let ms

                if (ar > 5) {
                    ms = 200 + (11 - ar) * 100
                }
                else {
                    ms = 800 + (5 - ar) * 80
                }

                if (ms < 300) {
                    beatmapAPI[i].diff_approach = 11
                }
                else if (ms < 1200) {
                    beatmapAPI[i].diff_approach = Math.round((11 - (ms - 300) / 150) * 100) / 100
                }
                else {
                    beatmapAPI[i].diff_approach = Math.round((5 - (ms - 1200) / 120) * 100) / 100
                }

                //OD
                const od = beatmapAPI[i].diff_overall
                let timing = 79 - (od * 6) + 0.5
                let dtTiming = timing * (2 / 3)
                let odNew = (79 + 0.5 - dtTiming) / 6
                beatmapAPI[i].diff_overall = Math.round(odNew * 10) / 10
            }
            else if (mods.includes('ht')) {
                beatmapAPI[i].bpm = Math.floor(beatmapAPI[i].bpm * 0.75)

                //Length
                let splitTime = beatmapAPI[i].total_length.split(':')
                let minsToSeconds = parseInt(splitTime[0], 10) * 60
                let totalSeconds = minsToSeconds + parseInt(splitTime[1], 10)
                let newTime = Math.floor(totalSeconds * 1.33)
                let newMinutes = Math.floor(newTime / 60).toString()
                let newSeconds = (newTime - newMinutes * 60).toString()

                //AR
                const ar = beatmapAPI[i].diff_approach
                let ms

                if (ar > 5) {
                    ms = 400 + (11 - ar) * 200
                }
                else {
                    ms = 1600 + (5 - ar) * 160
                }

                if (ms > 2400) {
                    beatmapAPI[i].diff_approach = -5
                }
                else if (ms > 1200) {
                    beatmapAPI[i].diff_approach = Math.round((-5 - (ms - 2400) / 120) * 100) / 100
                }
                else if (ms > 600) {
                    beatmapAPI[i].diff_approach = Math.round((5 - (ms - 1200) / 150) * 100) / 100
                }
                else {
                    beatmapAPI[i].diff_approach = Math.round((9 - (ms - 600) / 150) * 100) / 100
                }

                //OD
                const od = beatmapAPI[i].diff_overall
                let timing = 79 - (od * 6) + 0.5
                let htTiming = timing * (1 + (1 / 3))
                let odNew = (79 + 0.5 - htTiming) / 6
                beatmapAPI[i].diff_overall = Math.round(odNew * 10) / 10
            }

            beatmapAPI[i].diff_size = Math.round(beatmapAPI[i].diff_size * 10) / 10
            beatmapAPI[i].diff_drain = Math.round(beatmapAPI[i].diff_drain * 10) / 10
            beatmapAPI[i].diff_overall = Math.round(beatmapAPI[i].diff_overall * 10) / 10
            beatmapAPI[i].diff_approach = Math.round(beatmapAPI[i].diff_approach * 10) / 10

            urlInfo.beatmapId = beatmapAPI[i].beatmap_id
            urlInfo.beatmapSetId = beatmapAPI[i].beatmapset_id

            //Get Beatmap data for calculations
            axios.get('osu/' + urlInfo.beatmapId, {
                params: {
                    credentials: 'include'
                }
            })
                .then(resp => {
                    return resp.data
                })
                .then(raw => new ojsama.parser().feed(raw))
                .then(({ map }) => {
                    let beatmapConfig = map

                    ojsamaMods = ojsama.modbits.from_string(mods)

                    let stars = new ojsama.diff().calc({ map: beatmapConfig, mods: ojsamaMods })
                    beatmapAPI[i].difficultyrating = stars.toString()

                    let combo = beatmapAPI[i].max_combo


                    //Calculate PP Ratings for a acc ranges (FC)
                    let ppAccRange = [95, 99, 100]
                    let ppAccValues = []  //Will store pp values for a range
                    for (let i = 0; i < ppAccRange.length; i++) {
                        let performanceValue = ojsama.ppv2({
                            stars: stars,
                            combo: combo,
                            nmiss: 0,
                            acc_percent: ppAccRange[i]
                        })

                        formattedPerformanceValue = performanceValue.toString().split(' ')[0]
                        ppAccValues.push(formattedPerformanceValue)
                    }
                    beatmapAPI[i].ppAccValues = ppAccValues

                    //Output embed
                    if (counter === beatmapAPI.length) {
                        let mapInfo = ''

                        for (let i = 0; i < 3; i++) {
                            if (i === beatmapAPI.length) {
                                break
                            }

                            let starRating = parseFloat(beatmapAPI[i].difficultyrating).toFixed(2)
                            let diffImage = functions.difficultyImage(starRating, emojis)

                            mapInfo += `\n----------------------------`
                            mapInfo += `\n${diffImage} __**[Difficulty: ${beatmapAPI[i].version}](https://osu.ppy.sh/beatmapsets/${beatmapAPI[i].beatmapset_id}#osu/${beatmapAPI[i].beatmap_id})**__ ${mods != '' ? '**+' + mods.toUpperCase() + '**' : ''}`
                            mapInfo += `\n\n\:dart: **CS:** ${beatmapAPI[i].diff_size} \t ${beatmapAPI[i].diff_approach > 9.5 ? '\:rabbit:' : '\:turtle:'} **AR:** ${beatmapAPI[i].diff_approach} \t \:notes: **OD:** ${beatmapAPI[i].diff_overall} \t \:heart: **HP:** ${beatmapAPI[i].diff_drain}`
                            mapInfo += `\n• **Length:** ${beatmapAPI[i].total_length} •  **BPM:** ${Math.floor(beatmapAPI[i].bpm)}`
                            mapInfo += `\n• **Star Rating:** ${starRating}* •  **Max Combo:** ${beatmapAPI[i].max_combo}x`
                            mapInfo += `\n\n __Performance Values__ \n •  **95%:** ${beatmapAPI[i].ppAccValues[0]}pp •  **99%:** ${beatmapAPI[i].ppAccValues[1]}pp •  **100%:** ${beatmapAPI[i].ppAccValues[2]}pp`
                            
                            if (i === 2)
                                mapInfo += `\n\n **Downloads:** [Map](https://osu.ppy.sh/d/${beatmapAPI[i].beatmapset_id}) - [No Video](https://osu.ppy.sh/d/${beatmapAPI[i].beatmapset_id}n) - [Bloodcat](https://bloodcat.com/osu/s/${beatmapAPI[i].beatmapset_id})`
                        }

                        const updateDate = beatmapAPI[0].approved == 'Ranked' ? new Date(beatmapAPI[0].approved_date) : new Date(beatmapAPI[0].last_update)
                        const formatUpdateDate = `${updateDate.getDate()}/${updateDate.getMonth() + 1}/${updateDate.getFullYear()}`

                        let embed = new Discord.RichEmbed()
                            .setColor('#ffb3ff')
                            .setAuthor(`${beatmapAPI[0].artist} - ${beatmapAPI[0].title} by ${beatmapAPI[0].creator}`, undefined, `https://osu.ppy.sh/beatmapsets/${beatmapAPI[0].beatmapset_id}#osu/${beatmapAPI[0].beatmap_id}`)
                            .setThumbnail('https://b.ppy.sh/thumb/' + beatmapAPI[0].beatmapset_id + 'l.jpg')
                            .setDescription(mapInfo)
                            .setFooter(`Status: ${beatmapAPI[0].approved} • ${beatmapAPI[0].approved == 'Ranked' ? 'Ranked on' : 'Last updated'} ${formatUpdateDate}`)

                        m.channel.send({ embed: embed })

                        database.storeBeatmap(m.channel.id, beatmapAPI[0], null)
                    }

                    counter++
                })
                .catch(err => {
                    m.channel.send('There was an error! Sorry, please try again later!')
                    console.log(`There was an error [get_osu]: ${err}`)
                })
        }
    }
}

const convertToMinutes = seconds => {
    return (seconds - (seconds %= 60)) / 60 + (9 < seconds ? ':' : ':0') + seconds
}