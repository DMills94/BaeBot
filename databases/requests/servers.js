const Datastore = require('nedb')

let db = {}
db.servers = new Datastore({ filename: './databases/stores/servers', autoload: true })

exports.addServer = (guildID, channelID) => {
    const serverToggles = {
        guildID,
        announcements: true,
        announceChannel: channelID
    }
    db.servers.insert(serverToggles, err => {
        if (err) console.error(err)
    })
}

exports.checkServer = (guildID, m, query) => {
    return new Promise (resolve => {
        db.servers.find({ guildID }, async (err, docs) => {
            if (err) {
                return m.channel.send(`There was an error. Try again later \:slight_frown:`)
            }

            let guild
            if (docs.length == 0) {
                await exports.addServer(guildID, m.guild.systemChannelID)
                resolve({announcements: true, announceChannel: null})
            }
            else {
                guild = docs[0]
            }

            switch(query) {
                case 'announcements':
                    resolve(guild)
                default:
                    resolve(false)
            }
        })
    })
}

exports.toggleAnnouncements = (m, channel) => {
    const guildID = m.guild.id

    //Lookup Guild
    db.servers.find({ guildID }, async (err, docs) => {
        if (err) {
            return m.channel.send(`There's an error with toggling this at the moment! Sorry about that, try again later \:slight_frown:`)
        }

        let guild
        if (docs.length == 0) { //Add the guild, as it doesn't exist and assign guild as a template object
            await exports.addServer(guildID)
            guild = {announcements: channel ? true: false, announceChannel: channel}
        }
        else { //Otherwise, reverse the database for announcements and add the announce channel if needed
            guild = docs[0]
            guild.announcements = channel ? true : !guild.announcements
            if (channel) { //Users wishes to update their track channel
                guild.announceChannel = channel
            }
        }

        db.servers.update({ guildID }, {$set: { announcements: guild.announcements, announceChannel: guild.announceChannel }}, {}, err => {
            if (err) console.error(err)
            m.channel.send(`\:mega: Announcements have been ${guild.announcements ? `\`enabled\` ${guild.announceChannel ? 'in \`#' + m.guild.channels.get(guild.announceChannel).name + '\`' : ''} \:smile:` : '`disabled` \:slight_frown:'}`)
        })
    })
}