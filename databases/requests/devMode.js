const Datastore = require('nedb')

let db = {}
db.devMode = new Datastore({ filename: './databases/stores/devMode', autoload: true })

exports.addDevMode = () => {
    db.devMode.insert({ devMode: false }, err => {
        if (err) console.error(err)
    })
}

exports.getDevMode = () => {
    return new Promise(resolve => {
        db.devMode.find({}, (err, docs) => {
            if (err) console.error(err)
            if (docs.length > 0)
                resolve(docs[0].devMode)
            else resolve(undefined)
        })
    })
}

exports.toggleDev = (devStatus, m) => {
    db.devMode.update({ devMode: !devStatus }, { $set: { devMode: devStatus } }, {}, err => {
        if (err) {
            console.error(err)
            m.react('❎')
            return m.channel.send(`Unable to toggle dev mode right now! \:slight_frown:`)
        }
        m.react('✅')
        return m.channel.send(`Dev mode is now ${devStatus ? 'active' : 'inactive'} \:sunglasses:`)
    })
}