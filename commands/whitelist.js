const Discord = require('discord.js')
const { updateWhitelistChannels } = require('../databases/requests/servers.js')

module.exports = {
    name: "whitelist",
    description: "enable channel whitelisting for the server",
    async execute(m, args) {
        const channel = m.channel.id
        const type = args[0]

        updateWhitelistChannels(m, channel, type)
    }
}