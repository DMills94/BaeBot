const axios = require('axios')
const {osuApiKey, baeID} = require('../config.json')

module.exports = {
    name: 'track',
    description: 'Adds a user to tracking',
    execute(m, args, db) {
        if (!m.channel.permissionsFor(m.member).has("ADMINISTRATOR") && m.author.id !== baeID) {
            return m.reply('sorry brah, this is currently only a feature for users with Administrative permissions.')
        }

        let existingLink = false

        const dbTrack = db.ref(`/track/${m.guild.id}`)

        if (args[0] === '-help') {
            let helpText = `Tracking Commands | \`track [command]`
            helpText += '\n ```\t-help : Hey, you are already here!'
            helpText += '\n\t-add [osu username],[osu username]...: Adds a users to be tracked, separated by a comma'
            helpText += '\n\t-delete [osu username] : Removes a user from being tracked'
            helpText += '\n\t-list : List the users currently being tracked```'
            helpText += '\nTracking is currently a test feature, it will only track osu standard and also will always track the top 100 scores of the user.'

            m.channel.send(helpText)
        }
        else if (args[0] === '-add') {
            args.shift()
            let argUsernamesRaw = args.join(' ').split(',')
            let argUsernames = []
            let trackLimit = 100

            for (let user in argUsernamesRaw) {
                let nameToTrack
                const userToTrack = argUsernamesRaw[user].trim()
                const userToTrackArr = userToTrack.split(' ')

                for (let index in userToTrackArr) {
                    if (userToTrackArr[index].startsWith('top=')) {
                        trackLimit = parseInt(userToTrackArr[index].substring(4))
                        userToTrackArr.splice(index, 1)
                    }
                }

                nameToTrack = userToTrackArr.join('_')

                trackInfo = {
                    username: nameToTrack,
                    limit: trackLimit
                }

                argUsernames.push(trackInfo)
                trackLimit = 100 //something
            }

            if (argUsernames.length > 10)
                m.channel.send('Wow that is a lot of names, I might have issue adding them all! If I do, try adding users in small groups of maximum 10!')

            //multiadd
            for (let arg in argUsernames) {

                let username = argUsernames[arg].username

                //check username exists
                axios.get('api/get_user', {
                    params: {
                        k: osuApiKey,
                        u: username
                    }
                })
                    .then(resp => {
                        if (resp.data.length < 1) {
                            return m.reply(`The username ${username} doesn't exist! Please try again`)
                        }

                        username = resp.data[0].username

                        axios.get('api/get_user_best', {
                            params: {
                                k: osuApiKey,
                                u: username,
                                limit: argUsernames[arg].limit
                            }
                        })
                            .then(resp => {
                                const userBest = resp.data

                                dbTrack.once('value', obj => {

                                    const trackedUsers = obj.val()

                                    for (let user in trackedUsers) {
                                        if (trackedUsers[user].osuName === username && m.channel.id === trackedUsers[user].channel) {
                                            existingLink = true
                                            break
                                        }
                                    }

                                    if (!existingLink) {

                                        const trackInfo = {
                                            osuName: username,
                                            channel: m.channel.id,
                                            limit: argUsernames[arg].limit,
                                            userBest: userBest
                                        }

                                        dbTrack.push().set(trackInfo)
                                            .then(() => {
                                                console.log("[TRACK] ADD - POST SUCCESS")
                                                return m.channel.send(`\`${username}\` is now being tracked for osu! standard scores in their \`top ${argUsernames[arg].limit}\`!`)
                                            })
                                            .catch(err => {
                                                console.log(err)
                                                return m.channel.send(`I'm sorry there's an issue adding users to tracking right now. Please try again later.`)
                                            })
                                    }
                                    else {
                                        return m.channel.send(`\`${username}\` is already being tracked!`)
                                    }


                                })
                            })
                            .catch(err => {
                                console.log(err)
                                m.channel.send("There was an error! More info: " + err)
                            })
                    })
                    .catch(err => {
                        console.log(err)
                        m.channel.send("There was an error! More info: " + err)
                    })
            }
        }
        else if (args[0] === '-delete') {
            args.shift()
            let username = args.join('_')

            if (username === '--all') {

                dbTrack.once('value', obj => {
                    const trackedUsers = []
                    let error = false

                    for (let key in obj.val()) {
                        trackedUsers.push({
                            ...obj.val()[key],
                            id: key
                        })
                    }

                    for (let user in trackedUsers) {
                        if (m.channel.id === trackedUsers[user].channel) {
                            dbTrack.child(trackedUsers[user].id).remove()
                                .catch(err => {
                                    error = true
                                    console.log(`There was an error removing \`${trackedUsers[user].osuName}\` from track`)
                                })
                        }
                    }

                    if (error) {
                        m.reply("there's an error deleting users from tracking right now, please try again later.")
                    }
                    else {
                        m.channel.send(`All tracked users in this channel have been removed.`)
                        console.log("[TRACK] DELETE POST SUCCESS")
                    }
                })
            }
            else {
                axios.get('api/get_user', {
                    params: {
                        k: osuApiKey,
                        u: username
                    }
                })
                    .then(resp => {
                        username = resp.data[0].username
                        let keyToDelete

                        dbTrack.once('value', obj => {
                            const trackedUsers = []

                            for (let key in obj.val()) {
                                trackedUsers.push({
                                    ...obj.val()[key],
                                    id: key
                                })
                            }

                            for (let user in trackedUsers) {
                                if (trackedUsers[user].osuName === username && m.channel.id === trackedUsers[user].channel) {
                                    existingLink = true
                                    username = trackedUsers[user].osuName
                                    keyToDelete = trackedUsers[user].id
                                }
                            }

                            if (!existingLink) {
                                return m.reply("that username isn't being tracked!")
                            }
                            else {
                                dbTrack.child(keyToDelete).remove()
                                    .then(() => {
                                        console.log("[POST SUCCESS]")
                                        m.channel.send(`\`${username}\` has been removed from tracking.`)
                                    })
                                    .catch(err => {
                                        m.reply(`there's an error deleting users from track right now, please try again later!`)
                                        console.log(err)
                                    })
                            }
                        })
                    })
            }
        }
        else if (args[0] === '-list') {

            dbTrack.once('value', obj => {
                let usernameArr = []
                let trackedText = ''

                for (let entry in obj.val()) {
                    if (m.channel.id === obj.val()[entry].channel) {
                        usernameArr.push({
                            username: obj.val()[entry].osuName,
                            limit: obj.val()[entry].limit
                        })
                    }
                }
                if (usernameArr.length > 0) {
                    trackedText += `__List of tracked users in this channel__ \n\`\`\``

                    for (let name in usernameArr) {
                        trackedText += `\n - Top: ${(usernameArr[name].limit).toString().length === 2 ? usernameArr[name].limit + ' ' : usernameArr[name].limit} | ${usernameArr[name].username}`
                    }

                    trackedText += "```"

                    m.channel.send(trackedText)
                }
                else {
                    m.channel.send("There are currently no users being tracked. Get started with ` `track -help`!")
                }
            })
        }
        else {
            return m.reply('invalid arguments! Lost? Try ` `track -help`')
        }
    }
}
