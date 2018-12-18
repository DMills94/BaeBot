const fs = require('fs')
const config = require('../config.json')
const database = require('../databases/requests.js')

module.exports = {
    name: 'toggledev',
    description: 'Toggles dev mode',
    async execute(m) {
        if (m.author.id === config.baeID) {

            let devModeOld = await database.getDevMode()
            let devMode = !devModeOld
            console.log('dev.js: ', devMode)

            if (devMode) {
                m.client.user.setActivity(`In dev mode`)
            }
            else {
                m.client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
            }

            database.toggleDev(devMode, m)
        }
        else {
            return m.channel.send(`Sorry this command isn't for you!`)
        }
    }
}