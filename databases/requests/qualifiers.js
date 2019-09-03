const Datastore = require('nedb')
const functions = require('../../commands/exportFunctions')

let db = {}
db.servers = new Datastore({ filename: './databases/stores/qualifiers', autoload: true })

exports.newQualifier = data => {
    db.servers.insert(data, err => {
        if (err) {
            console.error(err)
            return Error('Ahh shit, I couldn\'t save your qualifier 😭 contact @Bae#3308, or try again later!')
        }
    })
}

exports.lookupQualifier = channelId => {
    return new Promise(resolve => {
        db.servers.find({ channelId }, (err, docs) => {
            if (err) console.error(err)
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

exports.processNewMp = async (channelId, mpId) => {
    const mpInfo = await functions.getMultiplayer(mpId)

    db.servers.update({ channelId }, {$push: { results: {$each: newResults }}}, {}, err => {
        if (err) {
            console.error(err)
            return Error('I failed to add that MP to your qualifier 😰 contact @Bae#3308, or try again later!')
        }
    })
}

exports.finishQualifier = channelId => {
    db.servers.remove({ channelId }, {}, err => {
        if (err) {
            console.error(err)
            return Error('Your qualifier is too powerful to end, i failed! 😱 contact @Bae#3308, or try again later!')
        }
    })
}