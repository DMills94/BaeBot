const Datastore = require('nedb')
const Discord = require('discord.js')
const axios = require('axios')
const HTMLParser = require('node-html-parser')
const functions = require('../commands/exportFunctions')

let db = {}

db.devMode = new Datastore({ filename: './databases/stores/devMode', autoload: true })
db.lastBeatmap = new Datastore({ filename: './databases/stores/lastBeatmap', autoload: true })
db.linkedUsers = new Datastore({ filename: './databases/stores/links', autoload: true })
db.servers = new Datastore({ filename: './databases/stores/servers', autoload: true })
db.track = new Datastore({ filename: './databases/stores/track', autoload: true })
db.countryTrack = new Datastore({ filename: './databases/stores/countryTrack', autoload: true })

db.countryTrack.persistence.setAutocompactionInterval(43200000)
db.track.persistence.setAutocompactionInterval(43200000)

//Dev Mode
exports.addDevMode = () => {
    db.devMode.insert({ devMode: false }, err => {
        if (err) console.log(err)
    })
}

exports.getDevMode = () => {
    return new Promise(resolve => {
        db.devMode.find({}, (err, docs) => {
            if (err) console.log(err)
            if (docs.length > 0)
                resolve(docs[0].devMode)
            else resolve(undefined)
        })
    })
}

exports.toggleDev = (devStatus, m) => {
    db.devMode.update({ devMode: !devStatus }, { $set: { devMode: devStatus } }, {}, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`Unable to toggle dev mode right now! \:slight_frown:`)
        }
        m.react('✅')
        return m.channel.send(`Dev mode is now ${devStatus ? 'active' : 'inactive'} \:sunglasses:`)
    })
}

//Last Beatmap
exports.storeBeatmap = (channelid, beatmap, performance) => {

    db.lastBeatmap.find({ channelid }, (err, docs) => {
        if (err) console.log(err)
        if (docs.length < 1) { //New guild
            const beatmapObj = {
                channelid,
                beatmap: beatmap,
                performance: performance
            }

            db.lastBeatmap.insert(beatmapObj, err => {
                if (err) console.log(err)
            })
        }
        else {
            db.lastBeatmap.update({ channelid }, { $set: { beatmap, performance } }, {}, err => {
                if (err) console.log(err)
            })
        }
    })
}

exports.fetchBeatmap = channelid => {
    return new Promise(resolve => {
        db.lastBeatmap.find({ channelid }, (err, docs) => {
            if (err) resolve([])
            resolve(docs[0])
        })
    })
}

//Linking
exports.newLink = (discordid, osuIGN, m) => {
    let data = {
        discordid,
        osuIGN
    }
    db.linkedUsers.insert(data, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`There was an issue linking your account! Please try again later.`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully been linked to \`${osuIGN}\` \:tada:`)
    })
}

exports.deleteLink = (discordid, osuIGN, m) => {
    db.linkedUsers.remove({ discordid }, {}, err => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`There was an error unlinking your account, please try again later!`)
        }
        m.react('✅')
        return m.channel.send(`You have successfully unlinked from ${osuIGN} \:tada:`)
    })
}

exports.checkForLink = discordid => {
    return new Promise(resolve => {
        db.linkedUsers.find({ discordid }, (err, docs) => {
            if (err) console.log(err)
            resolve(docs)
        })
    })
}

//Servers
exports.addServer = (guildID, channelID) => {
    const serverToggles = {
        guildID,
        announcements: true,
        announceChannel: channelID
    }
    db.servers.insert(serverToggles, err => {
        if (err) console.log(err)
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
    db.servers.find({ guildID }, async (err, docs) => {
        if (err) {
            return m.channel.send(`There's an error with toggling this at the moment! Sorry about that, try again later \:slight_frown:`)
        }

        let guild
        if (docs.length == 0) {
            await exports.addServer(guildID)
            guild = {announcements: channel ? true: false, announceChannel: channel}
        }
        else {
            guild = docs[0]
            guild.announcements = channel ? true : !guild.announcements
            if (channel) {
                guild.announceChannel = channel
            }
        }

        db.servers.update({ guildID }, {$set: { announcements: guild.announcements, announceChannel: guild.announceChannel }}, {}, err => {
            if (err) console.log(err)
            m.channel.send(`\:mega: Announcements have been ${guild.announcements ? `\`enabled\` in \`#${m.guild.channels.get(channel).name}\`  \:smile:` : '`disabled` \:slight_frown:'}`)
        })
    })
}

exports.announceHere = (channelID, guildID) => {
    return new Promise(promise => {
        db.servers.update({ guildID }, {$set: { announceChannel: channelID }}, {}, err => {
            if (err) {
                console.log(err)
                resolve(false)
            }
            resolve(true)
        })
    })

}


//Tracking
exports.checkForTrack = username => {
    return new Promise(resolve => {
        db.track.find({ username }, (err, docs) => {
            if (err) resolve([])
            if (docs.length == 0) resolve(false)
            else resolve(docs[0])
        })
    })
}

exports.addNewTrack = (m, channelid, trackInfo, action) => {
    //check for username
    db.track.find({ username: trackInfo.username }, (err, docs) => {
        if (err) console.log(err)
        if (action === 'add') {
            let data = {
                username: trackInfo.username,
                pp: trackInfo.pp,
                channels: {
                    [channelid]: trackInfo.limit
                },
                userBest: trackInfo.userBest,
                recent24hr: trackInfo.recent24hr
            }
            db.track.insert(data, err => {
                if (err) {
                    console.log(err)
                    m.react('❎')
                    return m.channel.send(`There was an error adding \`${trackInfo.username}\` to tracking. Please try again later!`)
                }        
                m.react('✅')
                return m.channel.send(`\`${trackInfo.username}\` is being added to the tracking for osu! standard scores in their \`top ${trackInfo.limit}\`! \:tada:`)
            })
        }
        else if (action === 'update') { //Update'
            db.track.find({ username: trackInfo.username }, (err, docs) => {
                if (err) console.log(err)
                let newChannels = { ...docs[0].channels }
                newChannels[channelid] = trackInfo.limit

                db.track.update({ username: trackInfo.username }, { $set: { channels: newChannels } }, {}, err => {
                    if (err) console.log(err)
                })
            })

        }
    })
}

exports.deleteTrack = (m, size, channelid, username = '') => {
    if (size === 'all') {
        db.track.find({ $where: function () { return Object.keys(this.channels).includes(channelid) } }, async (err, docs) => {
            if (err) {
                console.log(err)
                m.react('❎')
                return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
            }

            const deleteMessage = await m.channel.send("Deleting entries..")

            for (let user in docs) {
                let username = docs[user].username
                let newChannels = { ...docs[user].channels }
                delete newChannels[channelid]

                if (Object.keys(newChannels).length < 1) {
                    db.track.remove({ username }, {}, err => {
                        if (err) {
                            console.log(err)
                            m.channel.send(`Unable to delete ${username} \:sob:`)
                        }
                    })
                }
                else {
                    db.track.update({ username }, { $set: { channels: newChannels } }, {}, err => {
                        if (err) {
                            console.log(err)
                            m.channel.send(`Unable to delete ${username} \:sob:`)
                        }
                    })
                }
            }

            deleteMessage.edit('Finished deleting entries, any issues will be posted below! \:tada:')
        })
    }
    else if (size === 'one') {
        let searchName = new RegExp(username, "i")
        db.track.find({ username: searchName }, (err, docs) => {
            if (err) {
                console.log(err)
                m.react('❎')
                return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
            }
            if (docs.length < 1)
                return m.channel.send(`Oh, they don't appear to be tracked \:flushed:`)
            const userToEdit = docs[0]

            let newChannels = { ...userToEdit.channels }
            delete newChannels[channelid]

            if (Object.keys(newChannels).length < 1) {
                db.track.remove({ username: searchName }, {}, err => {
                    if (err) {
                        console.log(err)
                        m.react('❎')
                        return m.channel.send(`Unable to delete ${userToEdit.username} \:sob:`)
                    }
                })
                m.react('✅')
                return m.channel.send(`\`${userToEdit.username}\` has been removed from tracking! \:tada:`)
            }
            else {
                db.track.update({ username: searchName }, { $set: { channels: newChannels } }, {}, err => {
                    if (err) {
                        console.log(err)
                        m.react('❎')
                        return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
                    }
                    m.react('✅')
                    return m.channel.send(`\`${userToEdit.username}\` has been removed from tracking! \:tada:`)
                })
            }
        })
    }
}

exports.allTracks = () => {
    return new Promise(resolve => {
        db.track.find({}, (err, docs) => {
            if (err) console.log(err)
            resolve(docs)
        })
    })
}

exports.userTrack = (username) => {
    return new Promise(resolve => {
        db.track.find({ username }, (err, docs) => {
            if (err) console.log(err)
            resolve(docs[0])
        })
    })
}

exports.trackList = channelid => {
    return new Promise(resolve => {
        db.track.find({ $where: function () { return Object.keys(this.channels).includes(channelid) } }, (err, docs) => {
            if (err) console.log(err)
            resolve(docs)
        })
    })
}

exports.updateTrack = (username, scoreDates, pp, country) => {
    if (scoreDates != null && !country) {
        db.track.update({ username }, { $set: { userBest: scoreDates } }, {}, err => {
            if (err) console.log(err)
        })
    }
    else if (pp != null && !country) {
        db.track.update({ username }, { $set: { pp } }, {}, err => {
            if (err) console.log(err)
        })
    }
    else if (country) {
        db.countryTrack.find({ "players.username": username }, (err, docs) => {
            if (err) console.log(err)
            const playersInfo = [ ...docs[0].players ]

            if (scoreDates != null) {
                for (let user in playersInfo) {
                    if (playersInfo[user].username === username) {
                        playersInfo[user].userBest = scoreDates
                        break
                    }
                }
                db.countryTrack.update({ "players.username": username }, { $set: { players: playersInfo } }, {}, err => {
                    if (err) console.log(err)
                })
            }
            else if (pp != null) {
                for (let user in playersInfo) {
                    if (playersInfo[user].username === username) {
                        playersInfo[user].pp = pp
                        break
                    }
                }
                db.countryTrack.update({ "players.username": username }, { $set: { players: playersInfo } }, {}, err => {
                    if (err) console.log(err)
                })
            }
        })
    }
}

exports.countryTracks = (country) => {
    return new Promise(resolve => {
        if (country) {
            db.countryTrack.find({ country }, (err, docs) => {
                if (err) console.log(err)
                resolve(docs)
            })
        }
        else {
            db.countryTrack.find( {}, (err, docs) => {
                if (err) console.log(err)
                resolve(docs)
            })
        }

    })
}

exports.checkCountryTrack = (country, channelID, filters) => {
    return new Promise(resolve => {
        db.countryTrack.find({ country }, (err, docs) => {
            if (err) console.log(err)
            if (docs.length < 1)
                return resolve(false)
            
            if (filters.limit === undefined) {
                filters.limit = docs[0].channels[channelID] ? docs[0].channels[channelID].limit : 10
            }
            if (filters.top === undefined) {
                filters.top = docs[0].channels[channelID] ? docs[0].channels[channelID].top : 100
            }
            
            if (docs.length < 1) {
                resolve(false)
            }
            else if (!docs[0].channels.hasOwnProperty(channelID)) {
                resolve(false)
            }
            else if (docs[0].channels[channelID].limit !== filters.limit || docs[0].channels[channelID].top !== filters.top) {
                resolve(false)
            }
            else {
                resolve(true)
            }
        })

    })
}

exports.addCountryTrack = (country, m, filters) => {
    if (filters.limit === undefined) {
        filters.limit = 10
    }
    if (filters.top === undefined) {
        filters.top = 100
    }

    const trackInfo = {
        country,
        channels: {
            [m.channel.id]: filters
        }
    }

    db.countryTrack.find({ country }, (err, docs) => {
        if (err) console.log(err)

        if (docs.length > 0) {
            let newChannels = { ...docs[0].channels }
            newChannels[m.channel.id] = filters
            db.countryTrack.update({ country }, { $set: { channels: newChannels } }, {}, err => {
                if (err) console.log(err)
                m.react('✅')
                return m.channel.send(`The top \`${filters.limit}\` \:flag_${country.toLowerCase()}: players are being tracked for changes in their \`top ${filters.top}\` and rank changes! \:tada:`)
            })
        }
        else {
            db.countryTrack.insert(trackInfo, err => {
                if (err) {
                    m.react('❎')
                    return m.channel.send(`There was an error adding \:flag_${country.toLowerCase()}: to tracking. Please try again later!`)
                }
                m.react('✅')
                return m.channel.send(`The top \`${filters.limit}\` \:flag_${country.toLowerCase()}: players are being tracked for changes in their \`top ${filters.top}\` and rank changes! \:tada:`)
            })
        }
    })
}

exports.deleteCountryTrack = (country, channelID, m) => {
    db.countryTrack.find({ country }, (err, docs) => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
        }
        if (docs.length < 1)
            return m.channel.send(`Oh, that country doesn't appear to be tracked \:flushed:`)
        const countryToEdit = docs[0]

        if (!countryToEdit.channels[channelID])
            return m.channel.send(`Oh, that country doesn't appear to be tracked \:flushed:`)

        let newChannels = { ...countryToEdit.channels }
        delete newChannels[channelID]

        if (Object.keys(newChannels).length < 1) {
            db.countryTrack.remove({ country }, {}, err => {
                if (err) {
                    console.log(err)
                    m.react('❎')
                    return m.channel.send(`Unable to delete the country ${country} \:sob:`)
                }
                m.react('✅')
                return m.channel.send(`\:flag_${country.toLowerCase()}: has been removed from tracking! \:tada:`)
            })
        }
        else {
            db.countryTrack.update({ country }, { $set: { channels: newChannels } }, {}, err => {
                if (err) {
                    console.log(err)
                    m.react('❎')
                    return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
                }
                m.react('✅')
                return m.channel.send(`\:flag_${country.toLowerCase()}: has been removed from tracking! \:tada:`)
            })
        }
    })
}

exports.countryTrackUpdate = (client) => {
    console.log('[COUNTRY TRACKING] Checking for country tracks to update.')

    db.countryTrack.find({}, (err, docs) => {
        if (err) {
            console.log('Issue retrieving country track DB.')
            console.log(err)
        }

        if (docs.length < 1) {
            return console.log('[COUNTRY TRACKING || DB] No countries to update.')
        }
        
        for (let countryObj in docs) {
            let country = docs[countryObj].country
            let userArr = []
            axios.get('rankings/osu/performance', {
                params: {
                    country
                }
            })
                .then(async resp => {
                    const parsed = HTMLParser.parse(resp.data)
                    let users = parsed.querySelectorAll('.js-usercard')
    
                    for (let user in users) {
                        const username = users[user].rawText.trim()
                        const userInfo = await functions.getUser(username)
                        const userBest = (await functions.getUserTop(username, 100)).map(play => play.date)
                        const userObj = {
                            username,
                            userBest,
                            pp: userInfo.pp_raw,
                            countryRank: Number(user) + 1,
                            country
                        }
                        userArr.push(userObj)
                    }

                    if (docs[countryObj].players) {
                        for (let player in docs[countryObj].players) {                            
                            if (docs[countryObj].players[player].username != userArr[player].username) {
                                const oldTop50 = docs[countryObj].players.map(user => user.username)
                                const newUser = userArr[player].username
                                const newRank = Number(player) + 1

                                if (!oldTop50.includes(newUser)) {
                                    Object.keys(docs[countryObj].channels).forEach(channel => {
                                        if (newRank <= channel.limit && channel.rankUpdates)
                                            client.get(channel).send(`\`${newUser}\` has entered the \:flag_${docs[countryObj].country.toLowerCase()}: top \`${docs[countryObj].channels[channel].limit}\`! \:tada: Country rank: \`${newRank}\``)
                                    })
                                }
                                else {
                                    const oldRank = docs[countryObj].players.filter(player => {
                                        return player.username === newUser
                                    })[0].countryRank
                                    let rankChange = oldRank - newRank
        
                                    if (rankChange != 0) {
                                        let color = '#3B94D9'

                                        if (rankChange > 0) {
                                            rankChange = '+' + rankChange
                                            color = '#DD2E44'
                                        }
                                        
                                        Object.keys(docs[countryObj].channels).forEach(channel => {
                                            if (newRank <= channel.limit && channel.rankUpdates) {
                                                let embed = new Discord.RichEmbed()
                                                    .setColor(color)
                                                    .addField('Old Rank', oldRank, true)
                                                    .addField('New Rank', newRank, true)
                                            
                                                client.get(channel).send(`\:flag_${docs[countryObj].country.toLowerCase()}: \`${newUser}\` has changed ranks! ${rankChange > 0 ? '\:chart_with_upwards_trend:' : '\:chart_with_downwards_trend:'} ${rankChange}`, { embed })
                                            }
                                        })
                                    }
                                }
                            }
                        }
                    }

                    db.countryTrack.update({ country }, { $set: { players: userArr } }, {}, err => {
                        if (err) console.log(err)
                        console.log(`[COUNTRY TRACKING] Finished updating database for ${country}!`)
                    })
                })
                .catch(err => console.log(err))
        }
    })
}

exports.toggleRankTrack = (m, channelID) => {
    db.countryTrack.find({ $where: function() { return Object.keys(this.channels).includes(channelID) } }, (err, docs) => {
        if (err) {
            console.log(err)
            m.react('❎')
            return m.channel.send(`Unable to toggle rank tracking right now \:sob:`)
        }

        if (docs.length < 1) {
            return m.channel.send(`Seems no countries are being tracked \:thinking:`)
        }

        for (let country in docs) {
            let newChannels = docs[country].channels
            newChannels[channelID].rankUpdates = !newChannels[channelID].rankUpdates

            db.countryTrack.update({ country: docs[country].country }, { $set: { channels: newChannels }}, {}, err => {
                if (err) {
                    console.log(err)
                    m.react('❎')
                    return m.channel.send(`Unable to toggle rank tracking right now \:sob:`)
                }
                m.react('✅')
                return m.channel.send(`Country rank tracking has been \`${newChannels[channelID].rankUpdates ? 'enabled' : 'disabled'}\` \:tada:`)
            })
        }
    })
}

// Delete Guild information
exports.deleteGuild = guild => {
    guildChannels = guild.channels.map(chan => chan.id)

    for (let chanid in guildChannels) {
        //Last Beatmap
        db.lastBeatmap.remove({ channelid: guildChannels[chanid] }, {}, err => {
            if (err) console.log(err)
        })

        //Tracking
        db.track.find({}, (err, docs) => {
            if (err) console.log(err)

            for (let user in docs) {
                if (Object.keys(docs[user].channels).includes(guildChannels[chanid])){
                    newChannels = { ...docs[user].channels }
                    delete newChannels[guildChannels[chanid]]

                    if (Object.keys(newChannels).length === 0) {
                        db.track.remove({ username: docs[user].username }, {}, err => {
                            if (err) console.log(err)
                        })
                    }
                    else {
                        db.track.update({ username: docs[user].username }, { $set: { channels: newChannels } }, {}, err => {
                            if (err) console.log(err)
                        })
                    }
                }
            }
        })
    }
}