const fs = require('fs')
const { baeID } = require('../config.json')
const database = require('../localdb.json')
const config = require('../config.json')

const functions = require('./exportFunctions.js')

module.exports = {
    name: 'track',
    description: 'Adds a user to tracking',
    async execute(m, args) {
        const channelID = m.channel.id

        if (!m.channel.permissionsFor(m.member).has("ADMINISTRATOR") && m.author.id !== baeID) {
            return m.reply('sorry brah, this is currently only a feature for users with Administrative permissions.')
        }

        let existingTrack = false

        if (args[0] === '-help' || args[0] === '-h') {
            let helpText = `Tracking Commands | ${config.prefix}track [command]`
            helpText += '\n ```\t-help : Hey, you are already here!'
            helpText += '\n\t-add/-a [osu username] [top=x],[osu username]...: Adds a users to be tracked, separated by a comma. top=x optional, default is 100.'
            helpText += '\n\t-delete/-d [osu username] : Removes a user from being tracked'
            helpText += '\n\t-list/-l : List the users currently being tracked```'
            helpText += '\nTracking is currently a test feature, it will only track osu standard and also will always track the top 100 scores of the user.'

            m.channel.send(helpText)
        }
        else if (args[0] === '-add' || args[0] === '-a') {
            args.shift()
            let argUsernamesRaw = args.join(' ').split(',')
            let argUsernames = []

            for (let user in argUsernamesRaw) {
                let nameToTrack
                const userToTrack = argUsernamesRaw[user].trim()
                const userToTrackArr = userToTrack.split(' ')
                let trackLimit = 100

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
            }

            if (argUsernames.length > 10)
                m.channel.send('Wow that is a lot of names, I might have issue adding them all! If I do, try adding users in small groups of maximum 10!')

            //multiadd
            for (let arg in argUsernames) {
                //reset link match
                existingTrack = false

                username = argUsernames[arg].username

                //check username exists + format correctly
                usernameInfo = (await functions.getUser(username, 0))

                if (!usernameInfo) {
                    m.channel.send(`The username \`${username}\` doesn't exist!`)
                    continue
                }

                username = usernameInfo.username

                const userBest = await functions.getUserTop(username, argUsernames[arg].limit)

                const userRecent = await functions.getUserRecent(username, 50)

                //CHECK IF TRACK IS EMPTY
                const trackEmpty = Object.keys(database.track).length < 1

                if (trackEmpty) {
                    const trackInfo = {
                        channels: {
                            [channelID]: argUsernames[arg].limit
                        },
                        userBest,
                        recent24hr: userRecent
                    }

                    database.track[username] = trackInfo
                    m.channel.send(`\`${username}\` is being added to the tracking for osu! standard scores in their \`top ${argUsernames[arg].limit}\`!`)
                }
                else {
                    //CHECK IF EXISTING USERNAME IN TRACK
                    if (Object.keys(database.track).includes(username)) {
                        existingTrack = true
                    }

                    //ADD IF NOT EXISTING, IF SO UPDATE CHANNELS
                    if (!existingTrack) {
                        const trackInfo = {
                            channels: {
                                [channelID]: argUsernames[arg].limit
                            },
                            userBest,
                            recent24hr: userRecent
                        }

                        database.track[username] = trackInfo
                        m.channel.send(`\`${username}\` is being added to the tracking for osu! standard scores in their \`top ${argUsernames[arg].limit}\`!`)
                    }
                    else {
                        if (Object.keys(database.track[username].channels).includes(channelID)) {
                            if (database.track[username].channels[channelID] === argUsernames[arg].limit) {
                                m.channel.send(`\`${username}\` is already being tracked!`)
                            }
                            else {
                                database.track[username].channels[channelID] = argUsernames[arg].limit

                                m.channel.send(`\`${username}\` is being added to the tracking for osu! standard scores in their \`top ${argUsernames[arg].limit}\`!`)
                            }
                        }
                        else {
                            database.track[username].channels = {
                                ...database.track[username].channels,
                                [channelID]: argUsernames[arg].limit
                            }

                            m.channel.send(`\`${username}\` is being added to the tracking for osu! standard scores in their \`top ${argUsernames[arg].limit}\`!`)
                        }
                    }
                }

                fs.writeFile('localdb.json', JSON.stringify(database), err => {
                    if (err) {
                        console.log(err)
                        return m.channel.send(`I'm sorry there's an issue adding users to tracking right now. Please try again later.`)
                    }
                    console.log("[TRACK] ADD - POST SUCCESS")
                })
            }
        }
        else if (args[0] === '-delete' || args[0] === '-d') {
            args.shift()
            let username = args.join('_')

            if (username === '--all') {

                Object.keys(database.track).forEach(user => {
                    if (Object.keys(database.track[user].channels).includes(channelID)) {
                        delete database.track[user].channels[channelID]
                    }
                })
            }
            else {
                userInfo = await functions.getUser(username, 0)

                if (!userInfo) {
                    return m.channel.send(`\`${username}\` is not a valid username, or being tracked! Please try again!`)
                }

                username = userInfo.username
                delete database.track[username].channels[channelID]
                console.log(`[TRACK] DELETE TRACK | POST SUCCESS`)
                m.channel.send(`\`${username}\` has been removed from tracking!`)
            }

            Object.keys(database.track).forEach(user => {
                if (Object.keys(database.track[user].channels).length < 1) {
                    delete database.track[user]
                }
            })

            fs.writeFile('localdb.json', JSON.stringify(database), err => {
                if (err) {
                    console.log(err)
                    return m.channel.send(`There's an error deleting users from tracking right now, please try again later.`)
                }
                console.log(`[TRACK] DELETE ALL | POST SUCCESS`)
                m.channel.send(`All tracked users in this channel have been successfully removed!`)
            })
        }
        else if (args[0] === '-list' || args[0] === '-l') {
            let usersTrack

            try {
                usersTrack = database.track
            }
            catch (err) {
                return m.channel.send(`There are no users being tracked in this channel!`)
            }

            if (!usersTrack) {
                return m.channel.send(`There are no users being tracked in this channel!`)
            }

            let usernameArr = []
            let trackedText = ''

            Object.keys(usersTrack).forEach(user => {
                if (Object.keys(usersTrack[user].channels).includes(channelID)) {
                    usernameArr.push({
                        username: user,
                        limit: usersTrack[user].channels[channelID]
                    })
                }
            })

            if (usernameArr.length < 1) {
                return m.channel.send(`There are no tracked users in this channel!`)
            }

            usernameArr.sort((a, b) => (a.username.toUpperCase() > b.username.toUpperCase()) ? 1 : ((b.username.toUpperCase() > a.username.toUpperCase()) ? -1 : 0))    

            trackedText += `__List of tracked users in this channel__ \n\`\`\``

            for (let name in usernameArr) {
                trackedText += `\n - Top: ${(usernameArr[name].limit).toString().length === 2 ? usernameArr[name].limit + ' ' : usernameArr[name].limit} | ${usernameArr[name].username}`
            }

            trackedText += "```"

            m.channel.send(trackedText)
        }
        else {
            return m.reply('invalid arguments! Lost? Try ` `track -help`')
        }
    }
}
