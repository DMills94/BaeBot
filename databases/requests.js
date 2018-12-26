const Datastore = require('nedb')

let db = {}

db.devMode = new Datastore({ filename: './databases/stores/devMode', autoload: true })
db.lastBeatmap = new Datastore({ filename: './databases/stores/lastBeatmap', autoload: true })
db.linkedUsers = new Datastore({ filename: './databases/stores/links', autoload: true })
db.track = new Datastore({ filename: './databases/stores/track', autoload: true })

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

//Tracking
exports.checkForTrack = username => {
    return new Promise(resolve => {
        db.track.find({ username }, (err, docs) => {
            if (err) resolve([])
            if (docs.length < 1) resolve(false)
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
                channels: {
                    [channelid]: trackInfo.limit
                },
                userBest: trackInfo.userBest,
                recent24hr: trackInfo.recent24hr
            }
            db.track.insert(data, err => {
                if (err) {
                    console.log(err)
                    return m.channel.send(`There was an error adding \`${trackInfo.username}\` to tracking. Please try again later!`)
                }
                m.channel.send(`\`${trackInfo.username}\` is being added to the tracking for osu! standard scores in their \`top ${trackInfo.limit}\`! \:tada:`)
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
        db.track.find({ username }, (err, docs) => {
            if (err) {
                console.log(err)
                m.react('❎')
                return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
            }
            const userToEdit = docs[0]

            let newChannels = { ...userToEdit.channels }
            delete newChannels[channelid]

            if (Object.keys(newChannels).length < 1) {
                db.track.remove({ username }, {}, err => {
                    if (err) {
                        console.log(err)
                        m.channel.send(`Unable to delete ${username} \:sob:`)
                    }
                })
                m.react('✅')
                return m.channel.send(`\`${username}\` has been removed from tracking! \:tada:`)
            }
            else {
                db.track.update({ username }, { $set: { channels: newChannels } }, {}, err => {
                    if (err) {
                        console.log(err)
                        m.react('❎')
                        return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
                    }
                    m.react('✅')
                    return m.channel.send(`\`${username}\` has been removed from tracking! \:tada:`)
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

exports.updateTrack = (username, scoreDates) => {
    db.track.update({ username }, { $set: { userBest: scoreDates } }, {}, err => {
        if (err) console.log(err)
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