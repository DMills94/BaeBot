const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'getTrackScores',
    description: 'Parse tracked users scores for new plays and post if new top',
    async execute() {
        return new Promise(async resolve => {
            let changedScoresArray = []
            let counter = 0

            const trackdb = await database.allTracks()

            if (trackdb.length < 1)
                return console.log(`no users are being tracked!`)

            Object.keys(trackdb).forEach(async user => {
                const userInfo = trackdb[user]

                //Get users Top 100
                const newTop100 = await functions.getUserTop(userInfo.username)

                //See if each of the new top 100 scores exist in the db top 100 scores
                const prevTop100 = userInfo.userBest

                for (let score in newTop100) {
                    let scoreMatch = false

                    for (let record in prevTop100) {
                        if (newTop100[score].date === prevTop100[record]) {
                            scoreMatch = true
                            break
                        }
                    }

                    if (!scoreMatch) {
                        changedScoresArray.push(newTop100[score])
                        let dbTop100 = newTop100.map(top => {
                            return top.date
                        })
                        database.updateTrack(userInfo.username, dbTop100, score)
                    }
                }

                counter++

                if (counter === Object.keys(trackdb).length)
                    resolve(changedScoresArray)
            })
        })
    }
}