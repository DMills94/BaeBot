const { checkForLink, deleteLink } = require('../databases/requests/links.js')
const config = require('../config.json')

module.exports = {
    name: 'unlink',
    description: 'unlinks a users discord id to an osu name',
    async execute(m) {
        const userID = m.author.id

        const link = await checkForLink(userID)

        if (!link) {
            m.react('❎')
            return m.channel.send(`You have no linked account to unlink! Please use \`${config.prefix}link [username]\` to link an account!`)
        }

        const userInfo = link

        deleteLink(userID, userInfo, m)
    }
}
