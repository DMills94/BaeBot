const Datastore = require('nedb')

let db = {}
db.linkedUsers = new Datastore({ filename: './databases/stores/links', autoload: true })

exports.newLink = (discordid, userInfo, m) => {
    let data = {
        discordid,
        osuUsername: userInfo.username,
        osuId: userInfo.user_id
    }
    db.linkedUsers.insert(data, err => {
        if (err) {
            console.error(err)
            m.react('❎')
            return m.channel.send(`There was an issue linking your account! Please try again later.`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully been linked to \`${userInfo.username}\` \:tada:`)
    })
}

exports.deleteLink = (discordid, userInfo, m) => {
    db.linkedUsers.remove({ discordid }, {}, err => {
        if (err) {
            console.error(err)
            m.react('❎')
            return m.channel.send(`There was an error unlinking your account, please try again later!`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully unlinked from \`${userInfo.osuUsername}\` \:tada:`)
    })
}

exports.checkForLink = discordid => {
    return new Promise(resolve => {
        db.linkedUsers.find({ discordid }, (err, docs) => {
            if (err) console.error(err)
            resolve(docs[0])
        })
    })
}