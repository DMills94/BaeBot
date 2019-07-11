const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'getTrackScores',
    description: 'Parse tracked users scores for new plays and post if new top',
    async execute(trackType) {
        return new Promise(async resolve => {
            let changedScoresArray = []
            let counter = 0
            let trackdb = []
            let limits = []

            if (trackType === 'country') {
                const countryTrackdb = await database.countryTracks()
                
                limits = countryTrackdb.map(country => {
                    let max = 0
                    for (let channel in country.channels) {
                        if (country.channels[channel].limit > max)
                            max = country.channels[channel].limit
                    }
                    return { [country.country]: max}
                })

                for (count in countryTrackdb) {
                    if (!countryTrackdb[count].players)
                        continue

                    trackdb = trackdb.concat(countryTrackdb[count].players)
                }
                
            }
            else if (trackType === 'global') {
                const globalTrackdb = (await database.globalTracks())[0]

                if (!globalTrackdb || !globalTrackdb.channels || !!globalTrackdb.channels)
                    return console.log('[GLOBAL TRACKING] No channels require global tracking!')

                limits = 0
                for (const filters of Object.values(globalTrackdb.channels)) {
                    if (filters.limit > limits)
                        limits = filters.limit
                }

                trackdb = globalTrackdb.players
            }
            else if (trackType === 'user') {
                trackdb = await database.allTracks()
            }

            if (trackdb.length < 1)
                return console.log('\x1b[33m%s\x1b[0m', `[${trackType.toUpperCase()} TRACKING] No track entries.`)
            
            for (let user in trackdb) {
                const trackInfo = trackdb[user]
                let trackUser = true

                if (trackType === 'country') {
                    for (let lim of limits) {
                        if (Object.keys(lim)[0] == trackInfo.country) {
                            if (trackInfo.countryRank > lim[trackInfo.country]) {
                                trackUser = false
                                break
                            }
                        }
                    }
                }
                else if (trackType === 'global') {
                    if (trackInfo.globalRank > limits)
                        trackUser = false
                }

                if (!trackUser) {
                    counter++

                    if (counter === Object.keys(trackdb).length)
                        resolve(changedScoresArray)

                    continue
                }

                // Get User info, check for name change
                const userInfo = await functions.getUser(trackInfo.userId)

                //Get users Top 100
                const newTop100 = await functions.getUserTop(userInfo.user_id)

                if (newTop100.length < 1) {
                    continue
                }

                //See if each of the new top 100 scores exist in the db top 100 scores
                const prevTop100 = trackInfo.userBest
                const msNow = Date.now()

                for (let score in newTop100) {
                    if (msNow - Date.parse(newTop100[score].date) > 86400000) {
                        continue
                    }

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
                        database.updateTrack(userInfo, dbTop100, null, trackType)
                    }
                }

                counter++

                if (counter === Object.keys(trackdb).length)
                    resolve(changedScoresArray)
            }
        })
    }
}