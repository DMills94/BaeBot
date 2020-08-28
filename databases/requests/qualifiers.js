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

exports.processNewMp = (channelId, mpId, mpName) => {
    return new Promise(async resolve => {
        const mpInfo = await functions.getMultiplayer(mpId)
        if (!mpInfo.match) resolve({success: false})

        let players = {}
        
        // Filter out aborted scores
        const games = mpInfo.games.filter(map => map.end_time)

        // Loop through games or "maps" then the scores to extract player performance
        for (const [i, game] of games.entries()) {
            const { scores, mods } = game

            const modMultipliers = {
                '0': 1, //Nomod
                '1': 1, //Nomod, Nofail
                '8': 1.06, //Hd
                '9': 1.06, //Hd, Nofail
                '16': 1.1, //Hr
                '17': 1.1, //Hr, Nofail
                '64': 1.2, //Dt
                '65': 1.2 //Dt, Nofail
            }

            const appliedMultiplier = modMultipliers[mods]

            for (const score of scores) {
                if (score.score === '0') continue
                const playerInfo = await functions.getUser(score.user_id)
                const normalisedScore = Number(score.score) / appliedMultiplier

                players[playerInfo.username] = {
                    ...players[playerInfo.username],
                    country: playerInfo.country,
                    [i + 1]: score.score,
                    total: (players[playerInfo.username] ? players[playerInfo.username].total : 0) + normalisedScore
                }
            }
        }

        // Map into array so can be added to DB
        const newResults = Object.entries(players).map((e) => ({ [e[0]]: e[1] } ))    
    
        db.servers.update({ channelId }, { $push: { results: {$each: newResults }, mps: {url: `https://osu.ppy.sh/community/matches/${mpId}`, name: mpName } } }, { returnUpdatedDocs: true }, (err, numReplaced, newDocs) => {
            if (err) {
                console.error(err)
                resolve({ success: false, err })
            }
            resolve({
                ...newDocs,
                success: true
            })
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