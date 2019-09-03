const config = require('../config.json')
const { getDevMode, addDevMode, toggleDev } = require('../databases/requests/devMode.js')

module.exports = {
    name: 'toggledev',
    description: 'Toggles dev mode',
    async execute(m) {
        if (m.author.id === config.baeID) {
            let devModeOld = await getDevMode()
            let devModeNew

            if (devModeOld === undefined) {
                addDevMode()
                devModeNew = false
            }
            else {
                devModeNew = !devModeOld
            }

            if (devModeNew) {
                m.client.user.setActivity(`In dev mode`)
            }
            else {
                m.client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
            }

            toggleDev(devModeNew, m)
        }
        else {
            return m.channel.send(`Sorry this command isn't for you! \:scream:`)
        }
    }
}