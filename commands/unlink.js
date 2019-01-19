const database = require('../databases/requests.js')
const config = require('../config.json')

module.exports = {
    name: 'unlink',
    description: 'unlinks a users discord id to an osu name',
    async execute(m) {
        const userID = m.author.id

        const link = await database.checkForLink(userID)

        if (link.length < 1) {
            m.react('❎')
            return m.channel.send(`You have no linked account to unlink! Please use \`${config.prefix}link [username]\` to link an account!`)
        }

        const username = link[0].osuIGN

        database.deleteLink(userID, username, m)
    }
}
