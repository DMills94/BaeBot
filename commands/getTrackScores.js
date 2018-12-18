const fs = require('fs')
const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'getNewTrack',
    description: 'Parse tracked users scores for new plays and post if new top',
    async execute(first) {
        return new Promise(resolve => {
            let changedScoresArray = []
            let counter = 0

            Object.keys(database.track).forEach(async user => {
                //Get users Top 100
                const userBest = await functions.getUserTop(user)
                const userRecent = await functions.getUserRecent(user, 50)

                //Check for new recent data, if so, add to DB
                if (database.track[user].recent24hr === undefined)
                    database.track[user].recent24hr = userRecent

                if (first) {
                    //See if each of the new top 100 scores exist in the db top 100 scores
                    const prevTop100 = database.track[user].userBest

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
                    const prevRecent = database.track[user].recent24hr
                    //Get new recent
                    const newRecent = userRecent.filter(newPlay => {
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
                    updatedRecent.filter(score => {
                        let playDate = Date.parse(score.date)
                        let currentDate = Date.now()

                        if (currentDate - playDate > 86400000) {
                            return false
                        }
                        else {
                            return true
                        }
                    })

                    delete database.track[user].recent24hr
                    database.track[user].recent24hr = updatedRecent

                    if (user === 'Bae-') {
                        console.log('newRecent')
                        console.log(newRecent)
                    }
                }

                delete database.track[user].userBest
                database.track[user].userBest = userBest

                counter++

                if (counter === Object.keys(database.track).length) {
                    fs.writeFile('localdb.json', JSON.stringify(database, null, 4), err => {
                        if (err) {
                            console.log(err)
                        }                        
                        console.log('hello')
                    })

                    console.log('world')

                    resolve(changedScoresArray)
                }
            })
        })
    }
}