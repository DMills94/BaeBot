const axios = require('axios')
const {osuApiKey} = require('../config.json')
const ojsama = require('ojsama')

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

customExports.getNewTrackedScores = (first, db) => {
    return new Promise(resolve => {
        let usersToTrack = 0
        let changedScoresArray = []
        let counter = 0

        //Get tracked users
        const dbTrack = db.ref('/track/')

        dbTrack.once('value', async obj => {
            const trackedGuilds = obj.val()

            for (let id in trackedGuilds) {
                usersToTrack += Object.keys(trackedGuilds[id]).length
            }

            //Get users top 100

            for (let guild in trackedGuilds) { //For each Guild
                const trackedUsers = trackedGuilds[guild]
                for (let user in trackedUsers) { //For each User

                    const userBest = await customExports.getUserTop(trackedUsers[user].osuName, trackedUsers[user].limit)
                    const usersRecent = await customExports.getUserRecent(trackedUsers[user].osuName, 50)
                    let updatedRecent = []

                    //Check if new no top 100 data, and if so, add it to the DB
                    if (trackedUsers[user].userBest === undefined) {
                        dbTrack.child(`/${guild}/${user}/userBest`).set(userBest)
                            .catch(() => {
                                isError = true
                                console.log(`Error storing ${trackedUsers[user].osuName}'s top scores`)
                            })
                    }
                    //Check if new no recent data, and if so, add it to the DB
                    if (trackedUsers[user].recent24hr === undefined) {
                        dbTrack.child(`/${guild}/${user}/recent24hr`).set(usersRecent)
                    }

                    if (first) {
                        //See if each of the new top 100 scores exist in the db top 100 scores
                        const prevTop100 = trackedUsers[user].userBest

                        for (let score in userBest) { //For each score in NEW top 100
                            let scoreMatch = false

                            if (score === 2)
                                break

                            for (let record in prevTop100) {
                                if (userBest[score].date === prevTop100[record].date)
                                    scoreMatch = true
                            }

                            if (!scoreMatch) {
                                changedScoresArray.push(userBest[score])
                            }
                        }

                        dbTrack.child(`/${guild}/${user}/recent24hr`).set(usersRecent)
                    }
                    else {
                        //See if new recent scores exist in the new top 100 scores
                        const prevRecent = trackedUsers[user].recent24hr

                        //Get new recent scores
                        for (let newR in usersRecent) {
                            let scoreMatch = false

                            for (let prev in prevRecent) {
                                if (usersRecent[newR].date === prevRecent[prev].date)
                                    scoreMatch = true
                            }

                            if (!scoreMatch)
                                updatedRecent.push(usersRecent[newR])
                        }

                        //Compare new recent scores to new top 100
                        for (let newR in updatedRecent) {
                            let scoreMatch = false

                            for (let prevBest in userBest) {
                                if (updatedRecent[newR].date === userBest[prevBest].date)
                                    scoreMatch = true
                            }



                            if (scoreMatch)
                                changedScoresArray.push(updatedRecent[newR])
                        }

                        //Check existing 24 hour recent and remove scores >24 hours old
                        for (let recent in prevRecent) {
                            let playDate = Date.parse(prevRecent[recent].date)
                            let currentDate = Date.now() - 0

                            if (currentDate - playDate < 86400000) {
                                updatedRecent.push(prevRecent[recent])
                            }
                        }

                        dbTrack.child(`/${guild}/${user}/recent24hr`).set(updatedRecent)
                    }

                    //Update database
                    dbTrack.child(`/${guild}/${user}/userBest`).set(userBest)

                    counter++
                    if (counter === usersToTrack) {
                        resolve(changedScoresArray)
                    }
                }
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
