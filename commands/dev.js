const fs = require('fs')
const config = require('../config.json')
const database = require('../localdb.json')

module.exports = {
    name: 'toggledev',
    description: 'Toggles dev mode',
    execute(m) {
        if (m.author.id === config.baeID) {
            const devMode = !database.devMode

            if (devMode) {
                m.client.user.setActivity(`In dev mode`)
            } else {
                m.client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
            }

            fs.writeFile('localdb.json', JSON.stringify(database), err => {
                if (err) {
                    console.log(err)
                    m.react('❎')
                    return m.channel.send(`Unable to enable dev mode right now!`)
                }
                m.react('✅')
                return m.channel.send(`Dev mode is now ${devMode ? 'active' : 'inactive'}`)
            })
            
        } else {
            return m.channel.send(`Sorry this command isn't for you!`)
        }
    }
}