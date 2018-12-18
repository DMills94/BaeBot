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

customExports.getBeatmap = (bmpId, type = 'b') => {
    return new Promise(resolve => {
        axios.get('api/get_beatmaps', {
            params: {
                k: osuApiKey,
                [type]: bmpId
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

customExports.difficultyImage = (stars, emojis) => {
    let diffImage

    switch (true) {
        case (stars <= 1.5):
            diffImage = emojis.find('name', 'Easy')
            break
        case (1.51 <= stars && stars <= 2.25):
            diffImage = emojis.find('name', 'Normal')
            break
        case (2.26 <= stars && stars <= 3.75):
            diffImage = emojis.find('name', 'Hard')
            break
        case (3.76 <= stars && stars <= 5.25):
            diffImage = emojis.find('name', 'Insane')
            break
        case (5.26 <= stars && stars <= 6.75):
            diffImage = emojis.find('name', 'Expert')
            break
        case (stars >= 6.76):
            diffImage = emojis.find('name', 'ExpertPlus')
            break
    }

    return diffImage
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

                results.formattedStars = stars.toLocaleString('en', { maximumFractionDigits: 2 }).split(" ")[0]
                results.formattedPerformancePP = recentPP.toLocaleString('en', { maximumFractionDigits: 2 }).split(" ")[0]
                results.formattedMaxPP = maxPP.toLocaleString('en', { maximumFractionDigits: 2 }).split(" ")[0]

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
