const { prefix } = require('../config.json')
const { checkForLink, newLink } = require('../databases/requests/links.js')
const functions = require('./exportFunctions.js')

module.exports = {
    name: 'link',
    description: 'links a users discord id to an osu name',
    async execute(m, args) {
        const userID = m.author.id

        const link = await checkForLink(userID)

        if (link) {          
            return m.channel.send(`\:link: Your account is already linked to \`${link.osuUsername}\` \:link:`)
        }
        
        const osuIGN = args.join('_')

        if (!osuIGN) {
            m.react('❎')
            return m.channel.send(`please specify a osu! username to link with \:point_right: \`${prefix}link [username]\``)
        }

        const userInfo = await functions.getUser(osuIGN)

        if (!userInfo) {
            m.react('❎')
            return m.channel.send(`The username \`${osuIGN}\` does not exist! Please try again 🙂`)
        }

        await newLink(userID, userInfo, m)
    }
}
