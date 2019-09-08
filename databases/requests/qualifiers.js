const Datastore = require('nedb')
const functions = require('../../commands/exportFunctions')

let db = {}
db.servers = new Datastore({ filename: './databases/stores/qualifiers', autoload: true })

exports.newQualifier = data => {
    return new Promise(resolve => {
        db.servers.insert(data, (err, dbObj) => {
            if (err) {
                console.error(err)
                resolve({ success: false })
            }
            resolve({ success: true, dbObj })
        })
    })
}

exports.lookupQualifier = (id, checkExists = false) => {
    return new Promise(resolve => {
        db.servers.findOne({ $or: [{ channelId: id }, {_id: id }] }, (err, docs) => {
            if (err || !docs) resolve(false) // No entries
            if (checkExists)
                resolve(true)
            else
                resolve(docs)
        })
    })
}

exports.editQualifier = (qualifierId, data) => {
    return new Promise(resolve => {
        db.servers.update({ _id: qualifierId }, { $set: data }, { returnUpdatedDocs: true }, (err, numReplaced, newDocs) => {
            if (err) {
                console.error(err)
                resolve({success: false})
            }
            resolve({ success: true, embedInfo: newDocs })
        })
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
                    country: playerInfo.country,
                    [i + 1]: score.score,
                    total: (players[playerInfo.username] ? players[playerInfo.username].total : 0) + Number(score.score)
                }
            }
        }

        // Map into array so can be added to DB
        const newResults = Object.entries(players).map((e) => ({ [e[0]]: e[1] } ))    
    
        db.servers.update({ channelId }, { $push: { results: {$each: newResults }, mps: `https://osu.ppy.sh/community/matches/${mpId}` } }, { returnUpdatedDocs: true }, (err, numReplaced, newDocs) => {
            if (err) {
                console.error(err)
                resolve({ success: false, err })
            }
            resolve({ success: true, embedInfo: newDocs })
        })
    })

}

exports.finishQualifier = channelId => {
    return new Promise(resolve => {
        db.servers.remove({ channelId }, {}, err => {
            if (err) {
                resolve({ success: false, err })
            }
            resolve({ success: true })
        })
    })
}