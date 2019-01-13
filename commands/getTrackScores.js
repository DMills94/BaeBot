const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'getTrackScores',
    description: 'Parse tracked users scores for new plays and post if new top',
    async execute(country) {
        return new Promise(async resolve => {
            let changedScoresArray = []
            let counter = 0
            let trackdb = []

            if (country) {
                const countryTrackdb = await database.countryTracks()

                for (count in countryTrackdb) {
                    if (!countryTrackdb[count].players)
                        continue

                    trackdb = trackdb.concat(countryTrackdb[count].players)
                }
                
            }
            else {
                trackdb = await database.allTracks()
            }

            if (trackdb.length < 1)
                return console.log(`${country ? '[COUNTRY TRACKING]' : '[TRACKING]'} No tracks.`)

            Object.keys(trackdb).forEach(async user => {
                const userInfo = trackdb[user]

                //Get users Top 100
                const newTop100 = await functions.getUserTop(userInfo.username)

                if (newTop100.length < 1) {
                    return console.log(`${userInfo.username} has changed username, or been removed!`)
                }

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
                        let dbTop100 = newTop100.map(top => top.date)
                        database.updateTrack(userInfo.username, dbTop100, null, country)
                    }
                }

                counter++

                if (counter === Object.keys(trackdb).length)
                    resolve(changedScoresArray)
            })
        })
    }
}