const fs = require('fs')
const axios = require('axios')
const {osuApiKey} = require('../config.json')
const ojsama = require('ojsama')
const database = require('../localdb.json')

let customExports = module.exports = {}

customExports.lookupUser = (authorID) => {
    return new Promise((resolve, reject) => {
        if (Object.keys(database.linkedUsers).includes(authorID))
            resolve(database.linkedUsers[authorID])
        else
            reject()
    })
}

customExports.getUser = (username, mode) => {
    return new Promise(resolve => {
        axios.get('api/get_user', {
            params: {
                k: osuApiKey,
                u: username,
                m: mode
            }
        })
            .then(resp => {
                resolve(resp.data[0])
            })
    })
}

customExports.getUserTop = (username, limit = 100) => {
    return new Promise(resolve => {
        axios.get('api/get_user_best', {
            params: {
                k: osuApiKey,
                u: username,
                limit: limit
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
            .catch(err => {
                console.log(err)
            })
    })
}

customExports.getBeatmap = bmpId => {
    return new Promise(resolve => {
        axios.get('api/get_beatmaps', {
            params: {
                k: osuApiKey,
                b: bmpId
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.getUserRecent = (username, limit = 10) => {

    return new Promise(resolve => {
        axios.get('api/get_user_recent', {
            params: {
                k: osuApiKey,
                u: username,
                limit: limit
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.getScores = (bmpId, username) => {
    return new Promise(resolve => {
        axios.get('api/get_scores', {
            params: {
                k: osuApiKey,
                u: username,
                b: bmpId
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.storeLastBeatmap = (guild, beatmap, performance) => {
    const beatmapObj = {
        beatmap: beatmap,
        performance: performance
    }

    const guildID = guild.id
    database.lastBeatmap[guildID] = beatmapObj

    fs.writeFileSync('localdb.json', JSON.stringify(database), err => {
        if (err) return console.log(err)
    })
}

customExports.getNewTrackedScores = first => {
    const trackdb = JSON.parse(fs.readFileSync('localdb.json', 'utf8'))

    console.log(Object.keys(trackdb))

    return new Promise(resolve => {
        let changedScoresArray = []
        let counter = 0

        Object.keys(trackdb.track).forEach(async user => {
            //Get users Top 100
            const userBest = await customExports.getUserTop(user)
            const userRecent = await customExports.getUserRecent(user, 50)

            //Check for new recent data, if so, add to DB
            if (trackdb.track[user].recent24hr === undefined)
                trackdb.track[user].recent24hr = userRecent

            if (first) {
                //See if each of the new top 100 scores exist in the db top 100 scores
                const prevTop100 = trackdb.track[user].userBest

                userBest.forEach(score => {
                    let scoreMatch = false

                    prevTop100.forEach(record => {
                        if (score.date === record.date)
                            scoreMatch = true
                    })

                    if (!scoreMatch)
                        changedScoresArray.push(score)
                })
            }
            else {
                //See if new recent scores exist and if they're in the new top 100
                const prevRecent = trackdb.track[user].recent24hr
                //Get new recent
                const newRecent = userRecent.filter(newPlay => { //50 new plays max
                    let match = false

                    prevRecent.forEach(oldPlay => {
                        if (newPlay.date === oldPlay.date) {
                            match = true
                            return
                        }
                    })
                        
                    return match ? false : true
                })

                //Compare new recent scores to new top 100
                newTopRecents = newRecent.filter(newPlay => {
                    let match = false

                    userBest.forEach(topPlay => {
                        if (newPlay.date === topPlay.date) {
                            match = true
                            return
                        }
                    })

                    return match ? true : false
                })

                changedScoresArray = changedScoresArray.concat(newTopRecents)

                let updatedRecent = prevRecent.concat(newRecent)

                //Check existing 24 hour recent and remove scores >24 hours old
                updatedRecent.forEach(score => {
                    let playDate = Date.parse(score.date)
                    let currentDate = Date.now()

                    if (currentDate - playDate > 86400000) {
                        updatedRecent = updatedRecent.filter(play => play !== score)
                    }
                })

                trackdb.track[user].recent24hr = updatedRecent
            }
            trackdb.track[user].userBest = userBest

            counter++

            if (counter === Object.keys(trackdb.track).length) {
                fs.writeFileSync('localdb.json', JSON.stringify(trackdb), err => {
                    if (err) return console.log(err)
                })
        
                resolve(changedScoresArray)
            }
        }) 
    })
}


customExports.determineMods = score => {
    let mods = ""
    if (score.enabled_mods === "0") {
        return mods = ""
    } else {
        for (let mod in modnames) {
            if (score.enabled_mods & modnames[mod].val) {
                mods += modnames[mod].short
            }
        }

        if (mods.includes("NC")) {
            mods = mods.replace("DT", "")
        }

        return `+${mods}`
    }
}

customExports.modsToBitNum = mods => {
    let bitNumValue = 0
    mods = mods.toLowerCase()
    if (mods === "mods") {
        return "mods"
    } else if (mods === "nomod" || mods === "") {
        return 0
    } else {
        const modsSplit = mods.match(/[\s\S]{1,2}/g)
        for (let mod in modsSplit) {
            for (let obj in modnames) {
                if (!["hd", "hr", "dt", "nc", "so", "nf", "fl", "ht", "ez"].includes(modsSplit[mod])) {
                    return "invalid"
                }

                if (modsSplit[mod] === modnames[obj].short.toLowerCase()) {
                    bitNumValue += modnames[obj].val
                    break
                }
            }
        }
    }

    return `${bitNumValue}`
}

customExports.determineAcc = score => {
    const userAcc = (parseInt(score.count300) * 300 + parseInt(score.count100) * 100 + parseInt(score.count50) * 50) / ((parseInt(score.count300) + parseInt(score.count100) + parseInt(score.count50) + parseInt(score.countmiss)) * 300) * 100
    return userAcc.toFixed(2).toString()
}

customExports.timeDifference = (current, previous) => {
    const msPerMinute = 60 * 1000 //60,000
    const msPerHour = msPerMinute * 60 //3,600,000
    const msPerDay = msPerHour * 24 //86,400,000
    const msPerYear = msPerDay * 365

    let elapsed = current - previous
    let time

    if (elapsed < msPerMinute) {
        time = Math.round(elapsed / 1000)
        return `${time} ${time > 1 ? "seconds ago" : "second ago"}`
    } else if (elapsed < msPerHour) {
        time = Math.round(elapsed / msPerMinute)
        return `${time} ${time > 1 ? " minutes ago" : "minute ago"}`
    } else if (elapsed < msPerDay) {
        time = Math.round(elapsed / msPerHour)
        return `${time} ${time > 1 ? "hours ago" : "hour ago"}`
    } else if (elapsed < msPerYear) {
        time = Math.round(elapsed / msPerDay)
        return `${time} ${time > 1 ? "days ago" : "day ago"}`
    } else {
        time = Math.round(elapsed / msPerYear)
        return `${time} ${time > 1 ? "years ago" : "year ago"}`
    }
}

customExports.approvedStatus = value => {
    switch(value) {
        case '-2':
            return 'Graveyard'
        case '-1':
            return 'WIP'
        case '0':
            return 'Pending'
        case '1':
            return 'Ranked'
        case '2':
            return 'Approved'
        case '3':
            return 'Qualified'
        case '4':
            return 'Loved'
        default:
            return value
    }
}

customExports.calculate = (beatmap, performance) => {
    return new Promise(resolve => {

        let cleanBeatmap
        let results = {}

        axios.get(`osu/${beatmap.beatmap_id}`, {
            params: {
                credentials: "include"
            }
        })
            .then(resp => {
                return resp.data
            })
            .then(raw => new ojsama.parser().feed(raw))
            .then(({map}) => {
                cleanBeatmap = map
                const usedMods = ojsama.modbits.from_string(performance.enabled_mods)

                const stars = new ojsama.diff().calc({map: cleanBeatmap, mods: usedMods})
                const combo = parseInt(performance.maxcombo)
                const nmiss = parseInt(performance.countmiss)
                const acc_percent = parseFloat(performance.accuracy)

                const recentPP = ojsama.ppv2({
                    stars: stars,
                    combo: combo,
                    nmiss: nmiss,
                    acc_percent: acc_percent
                })

                const maxPP = ojsama.ppv2({
                    stars: stars
                })

                results.formattedStars = stars.toString().split(" ")[0]
                results.formattedPerformancePP = recentPP.toString().split(" ")[0]
                results.formattedMaxPP = maxPP.toString().split(" ")[0]

                resolve(results)

            })
            .catch(err => {
                console.log(`There was an error! More info: + ${err}`)
            })
    })
}

let modnames = [{
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
}]
