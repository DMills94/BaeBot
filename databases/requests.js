const Datastore = require('nedb')

let db = {}

db.devMode = new Datastore({ filename: './databases/stores/devMode', autoload: true })
db.lastBeatmap = new Datastore({ filename: './databases/stores/lastBeatmap', autoload: true })
db.linkedUsers = new Datastore({ filename: './databases/stores/links', autoload: true })
db.track = new Datastore({ filename: './databases/stores/track', autoload: true })

//Dev Mode
exports.getDevMode = () => {
    return new Promise(resolve => {
        db.devMode.find({ devMode: true }, (err, docs) => {
            if (err) console.log(err)
            if (docs.length > 0)
                resolve(true)
            else resolve(false)
        })
    })
}

exports.toggleDev = (devStatus, m) => {
    console.log('requests.js: ', devStatus)
    db.devMode.update({ devMode: !devStatus}, {$set: {devMode: devStatus}}, {}, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`Unable to enable dev mode right now!`)
        }
        m.react('✅')
        return m.channel.send(`Dev mode is now ${devStatus ? 'active' : 'inactive'}`)
    })
}

//Linking
exports.newLink = (discordid, osuIGN, m) => {
    let data = {
        discordid,
        osuIGN
    }
    db.linkedUsers.insert(data, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`There was an issue linking your account! Please try again later.`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully been linked to \`${osuIGN}\``)
    })
}

exports.deleteLink = (discordid, osuIGN, m) => {
    db.linkedUsers.remove({discordid}, {}, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`There was an error unlinking your account, please try again later!`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully unlinked from ${osuIGN}`)
    })
}

exports.checkForLink = discordid => {
    return new Promise(resolve => {
        db.linkedUsers.find({discordid}, (err, docs) => {
            if (err) console.log(err)
            resolve(docs)
        })
    })
}

//Tracking