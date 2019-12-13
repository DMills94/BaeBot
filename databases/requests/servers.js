const Datastore = require('nedb')
const { prefix } = require('../../config.json')

let db = {}
db.servers = new Datastore({ filename: './databases/stores/servers', autoload: true })

const newServer = (guildID, channelID) => ({
    guildID,
    announcements: true,
    announceChannel: channelID,
    whitelistChannels: []
})

exports.addServer = (guildID, channelID = false) => {
    db.servers.insert(newServer(guildID, channelID), err => {
        if (err) console.error(err)
    })
}

exports.checkServer = (guildID, m) => {
    return new Promise (resolve => {
        db.servers.find({ guildID }, async (err, docs) => {
            if (err) {
                return m.channel.send(`There was an error. Try again later \:slight_frown:`)
            }

            let guild  = false
            if (!docs.length) {
                await exports.addServer(guildID, m.guild.systemChannelID)
                resolve(newServer(guildID, false))
            }
            else {
                guild = docs[0]
            }

            resolve(guild)
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
            guild = {
                announcements: channel ? true: false,
                announceChannel: channel
            }
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

exports.updateWhitelistChannels = async (m, channel, type) => {
    const guildID = m.guild.id

    //Lookup Guild
    db.servers.find({ guildID }, async (err, docs) => {
        if (err) {
            m.channel.send(`There's an error updating your channel whitetlist, try again later or message Bae \:slight_frown:`)
        }

        if (!docs.length) await exports.addServer(guildID)

        let updatedGuild = docs.length
            ? { ...docs[0] }
            : newServer(guildID, false)

        if (type === 'add') {
            if (updatedGuild.whitelistChannels && updatedGuild.whitelistChannels.includes(channel))
                return m.channel.send(`I already listen to this channel! \:wink: Aswell as:${listChannels(updatedGuild.whitelistChannels.filter(existing => existing !== channel))}`)
            else
                updatedGuild.whitelistChannels = updatedGuild.whitelistChannels
                    ? [ ...updatedGuild.whitelistChannels, channel ]
                    : [ channel ]
        }
        else if (type === 'remove') {
            if (!updatedGuild.whitelistChannels.length)
                return m.channel.send('I already listen to all channels for you \:ok_hand:')
            else if (!updatedGuild.whitelistChannels.includes(channel))
                return m.channel.send('I already don\'t listen here \:hear_no_evil:')
            else {
                updatedGuild.whitelistChannels = updatedGuild.whitelistChannels.filter(existing => existing !== channel)
            }
        }
        else return m.channel.send(`Please specify what you want me to do to this channel! \:pray:\`\n${prefix}whitetlist add\` **OR** \`${prefix}whitetlist remove\``)

        db.servers.update({ guildID }, updatedGuild, {}, err => {
            if (err) console.error(err)
            if (updatedGuild.whitelistChannels.length)
                return m.channel.send(`Gotcha \:thumbsup:\nI can only reply to messages in the following channels:${listChannels(updatedGuild.whitelistChannels)}`)
            else
                return m.channel.send('I now listen to all channels again \:relieved:')
        })
    })
}

const listChannels = channels => `\n\n<#${channels.join('>\n<#')}>`