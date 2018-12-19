const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'getNewTrack',
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
                let newScores = false

                //Get users Top 100
                const userBest = await functions.getUserTop(userInfo.username)

                //See if each of the new top 100 scores exist in the db top 100 scores
                const prevTop100 = userInfo.userBest

                userBest.forEach(score => {
                    let scoreMatch = false

                    prevTop100.forEach(record => {
                        if (score.date === record.date)
                            scoreMatch = true
                    })

                    if (!scoreMatch) {
                        newScores = true
                        changedScoresArray.push(score)
                    }
                })

                if (newScores)
                    database.updateTrack(userInfo.username, userBest)

                counter++

                if (counter === Object.keys(trackdb).length) {
                    resolve(changedScoresArray)
                }
            })
        })
    }
}