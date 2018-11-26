const fs = require('fs')
const database = require('../localdb.json')

module.exports = {
    name: 'unlink',
    description: 'unlinks a users discord id to an osu name',
    execute(m) {
        const userID = m.author.id

        if (!Object.keys(database.linkedUsers).includes(userID)) {
            m.react('❎')
            return m.channel.send('You have no linked account to unlink! Please use ``link [username]` to link an account!')
        }

        const username = database.linkedUsers[userID]
        delete database.linkedUsers[userID]

        fs.writeFile('localdb.json', JSON.stringify(database), err => {
            if (err) {
                console.log(err)
                m.react('❎')
                return m.channel.send(`There was an error unlinking your account, please try again later!`)
            }
            m.react('✅')
            return m.channel.send(`You have successfully unlinked from ${username}`)
        })
    }
}
