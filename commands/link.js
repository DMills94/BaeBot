const fs = require('fs')
const database = require('../localdb.json')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'link',
    description: 'links a users discord id to an osu name',
    async execute(m, args) {
        const userID = m.author.id

        if (Object.keys(database.linkedUsers).includes(userID))
            return m.channel.send(`Your account is already linked to \`${database.linkedUsers[userID]}\``)
        
        const osuIGN = args.join('_')

        if (!osuIGN) {
            m.react('❎')
            return m.channel.send('please specify a osu! username to link with: ``link [username]`')
        }

        const userInfo = await functions.getUser(osuIGN)

        if (!userInfo) {
            m.react('❎')
            return m.channel.send('That username does not exist! Please try again.')
        }
        
        let username = userInfo.username
        
        database.linkedUsers = {
            ...database.linkedUsers,
            [userID]: username
        }

        fs.writeFile('localdb.json', JSON.stringify(database), err => {
            if (err) {
                console.log(err)
                m.react('❎')
                return m.channel.send(`There was an issue linking your account! Please try again later.`)
            }
            m.react('✅')
            return m.channel.send(`You have successfully been linked to ${username}`)
        })
    }
}
