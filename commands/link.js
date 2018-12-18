const fs = require('fs')
const { prefix } = require('../config.json')
const database = require('../databases/requests.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'link',
    description: 'links a users discord id to an osu name',
    async execute(m, args) {
        const userID = m.author.id

        const link = await database.checkForLink(userID)

        if (link.length > 0)
            return m.channel.send(`Your account is already link to \`${link[0].osuIGN}\``)
        
        const osuIGN = args.join('_')

        if (!osuIGN) {
            m.react('❎')
            return m.channel.send(`please specify a osu! username to link with: \`${prefix}link [username]\``)
        }

        const userInfo = await functions.getUser(osuIGN)

        if (!userInfo) {
            m.react('❎')
            return m.channel.send('That username does not exist! Please try again.')
        }

        await database.newLink(userID, userInfo.username, m)
    }
}
