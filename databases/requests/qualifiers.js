const Datastore = require('nedb')
const functions = require('../../commands/exportFunctions')

let db = {}
db.servers = new Datastore({ filename: './databases/stores/qualifiers', autoload: true })

exports.newQualifier = data => {
    return new Promise(resolve => {
        db.servers.insert(data, err => {
            if (err) {
                console.error(err)
                resolve({ success: false })
            }
            resolve({ success: true })
        })
    })
}

exports.lookupQualifier = (channelId, checkExists = false) => {
    return new Promise(resolve => {
        db.servers.find({ channelId }, (err, docs) => {
            if (err || docs.length === 0) resolve(false) // No entries
            if (checkExists)
                resolve(true)
            else
                resolve(docs[0])
        })
    })
}

exports.editQualifier = (channelId, data) => {
    db.servers.update({ channelId }, {$set: { ...data }}, {}, err => {
        if (err) {
            console.error(err)
            return Error('I failed to edit your qualifier, yikes 😬 contact @Bae#3308, or try again later!')
        }
    })
}

exports.processNewMp = (channelId, mpId) => {
    return new Promise(async resolve => {
        const mpInfo = await functions.getMultiplayer(mpId)

        let players = {}
        
        // Filter out aborted scores
        const games = mpInfo.games.filter(map => map.end_time)

        // Loop through games or "maps" then the scores to extract player performance
        for (const [i, game] of games.entries()) {
            const scores = game.scores

            for (const score of scores) {
                if (score.score === '0') continue
                const playerInfo = await functions.getUser(score.user_id)

                players[playerInfo.username] = {
                    ...players[playerInfo.username],
                    [i + 1]: score.score,
                    total: (players[playerInfo.username] ? players[playerInfo.username].total : 0) + Number(score.score)
                }
            }
        }

        // Map into array so can be added to DB
        const newResults = Object.entries(players).map((e) => ({ [e[0]]: e[1] } ))    
    
        db.servers.update({ channelId }, {$push: { results: {$each: newResults }}}, { returnUpdatedDocs: true }, (err, numReplaced, newDocs) => {
            if (err) resolve({ success: false })
            resolve({ success: true, embedInfo: newDocs })
        })
    })

}

exports.finishQualifier = channelId => {
    return new Promise(resolve => {
        db.servers.remove({ channelId }, {}, err => {
            if (err) {
                console.error(err)
                resolve({ success: false })
            }
            resolve({ success: true })
        })
    })
}