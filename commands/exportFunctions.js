const axios = require('axios')
const {
    osuApiKey
} = require('../config.json')

let customExports = module.exports = {}

customExports.lookupUser = (authorID, db) => {
    return new Promise((resolve, reject) => {
        const linkDB = db.ref('/linkedUsers/')
        let username
        let existingLink = false

        linkDB.once('value', obj => {
                const linkedUsers = obj.val()

                for (let user in linkedUsers) {
                    if (linkedUsers[user].discordID === authorID) {
                        existingLink = true
                        username = linkedUsers[user].osuName
                    }
                }

                if (existingLink) {
                    resolve(username)
                } else {
                    reject()
                }
            })
            .catch(() => {
                console.log("There was an error checking for a linked account in the database!")
            })

    })
}

customExports.storeLastBeatmap = (guild, beatmap, performance, db) => {
    let beatmapObj = {
        beatmap: beatmap,
        performance: performance
    }

    const lastBeatmap = db.ref(`/lastBeatmap/${guild.id}`)
    lastBeatmap.update(beatmapObj)
        .catch(() => {
            console.log("There was an error storing beatmap ID, please try again later.")
        })
}

customExports.getTrackedUsersTop100 = (db) => {
    return new Promise((resolve) => {
        let isError = false
        let changedScoresArray = []
        let usersToTrack = 0

        //Get tracked users
        const dbTrack = db.ref('/track/')

        dbTrack.once('value', obj => {
            const trackedGuilds = obj.val()

            for (let id in trackedGuilds) {
                usersToTrack += Object.keys(trackedGuilds[id]).length
            }

            //Get users top 100
            let counter = 0
            for (let guild in trackedGuilds) {
                const trackedUsers = trackedGuilds[guild]
                for (let user in trackedUsers) {

                    axios.get("api/get_user_best", {
                            params: {
                                k: osuApiKey,
                                u: trackedUsers[user].osuName,
                                limit: 100
                            }
                        })
                        .then(resp => {
                            const usersTop100 = resp.data

                            //Check if new no top 100 data, and if so, add it to the DB
                            if (trackedUsers[user].top100 === undefined) {
                                dbTrack.child(`/${guild}/${user}/top100`).set(usersTop100)
                                    .catch(() => {
                                        isError = true
                                        console.log(`Error storing ${trackedUsers[user].osuName}'s top 100 scores`)
                                    })
                            } else {
                                //See if each of the new top 100 scores exist in the db top 100 scores
                                for (let score in usersTop100) {
                                    const scoreMatch = checkNewScores(usersTop100[score], trackedUsers[user].top100)

                                    if (!scoreMatch) {
                                        console.log(usersTop100[score])
                                        changedScoresArray.push(usersTop100[score])
                                    }
                                }

                                //Update database
                                dbTrack.child(`/${guild}/${user}/top100`).set(usersTop100)
                                    .catch(() => {
                                        isError = true
                                        console.log(`Error storing ${trackedUsers[user].osuName}'s top 100 scores`)
                                    })

                                counter++
                                if (counter === usersToTrack) {
                                    if (changedScoresArray) {

                                    }
                                    resolve(changedScoresArray)
                                }
                            }
                        })
                        .catch(() => {
                            isError = true
                        })
                }
            }
        })
    })
}

const checkNewScores = (score, database) => {
    let scoreMatch

    for (let entry in database) {
        scoreMatch = true
        const aProps = Object.getOwnPropertyNames(score)
        const bProps = Object.getOwnPropertyNames(database[entry])

        if (aProps.length !== bProps.length) {
            scoreMatch = false
        }

        for (let prop in aProps) {
            const propName = aProps[prop]

            if (score[propName] !== database[entry][propName]) {
                scoreMatch = false
            }
        }

        if (scoreMatch) {
            break
        }
    }

    return scoreMatch
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
