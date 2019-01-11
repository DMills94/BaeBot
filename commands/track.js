const database = require('../databases/requests.js')
const config = require('../config.json')
const countries = require('../databases/countries.json')


const functions = require('./exportFunctions.js')

module.exports = {
    name: 'track',
    description: 'Adds a user to tracking',
    async execute(m, args) {
        const channelID = m.channel.id

        if (!m.channel.permissionsFor(m.member).has("ADMINISTRATOR") && m.author.id !== config.baeID) {
            return m.reply('sorry brah, this is currently only a feature for users with Administrative permissions.')
        }

        if (args[0] === '-help' || args[0] === '-h') {
            let helpText = `Tracking Commands | ${config.prefix}track [command]`
            helpText += '\n ```\t-help : Hey, you are already here!'
            helpText += '\n\t-add/-a [osu username] [top=x],[osu username]...: Adds a users to be tracked, separated by a comma. top=x optional, default is 100.'
            helpText += '\n\t-delete/-d [osu username] : Removes a user from being tracked'
            helpText += '\n\t-list/-l : List the users currently being tracked```'
            helpText += '\nTracking is currently a test feature, it will only track osu standard and also will always track the top 100 scores of the user.'

            m.channel.send(helpText)
        }
        else if (args[0] === '-country' || args[0] === '-c') {
            args.shift()

            let filters = {
                limit: undefined,
                top: undefined
            }

            let delCountry = false
            let countryArgs = []

            for (let arg in args) {
                if (args[arg].startsWith('l=')) {
                    if (Math.round(Number(args[arg].slice(2))) > 50 || Math.round(Number(args[arg].slice(2))) < 1)
                        return m.channel.send(`Please enter a limit between \`1\` and \`50\` users!`)
                    filters.limit = args[arg].slice(2)
                    continue
                }
                else if (args[arg].startsWith('t=')) {
                    if (Math.round(Number(args[arg].slice(2))) > 100 || Math.round(Number(args[arg].slice(2))) < 1)
                        return m.channel.send(`Please enter a top player number between \`1\` and \`100\` plays!`)
                    filters.top = args[arg].slice(2)
                }
                else {
                    countryArgs.push(args[arg])
                }
            }

            for (let arg in countryArgs)
                if (countryArgs[arg] == '-d' || countryArgs[arg] == '-delete') {
                    delCountry = true
                    countryArgs.splice(arg, 1)
            }

            let country = countryArgs.join(' ')
            if (country.length === 2) {
                country = country.toUpperCase()
            }
            else {
                const countryWords = country.split(' ')
                for (let word in countryWords) {
                    countryWords[word] = countryWords[word].charAt(0).toUpperCase() + countryWords[word].slice(1)
                }
                country = countryWords.join(' ')
            }

            if (country == 'UK')
                country = 'GB'
            if (country.toUpperCase() == 'USA')
                country = 'US'

            if (country.length != 2) {
                country = Object.keys(countries).find(key => countries[key] === country)
                if (!country)
                    return m.channel.send(`Invalid country name! Make sure it matches the osu website or use the 2 letter country codes!`)
            }

            if (delCountry) {
                database.deleteCountryTrack(country, m.channel.id, m)
            }
            else {
                const existingTrack = await database.checkCountryTrack(country, m.channel.id, filters)

                if (existingTrack) {
                    m.channel.send(`\:flag_${country.toLowerCase()}: is already being tracked!`)
                }
                else {
                    database.addCountryTrack(country, m, filters)
                }
            }
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
                username = argUsernames[arg].username

                if (username === '')
                    continue

                //check username exists + format correctly
                usernameInfo = await functions.getUser(username, 0)

                if (!usernameInfo) {
                    m.channel.send(`The username \`${username}\` doesn't exist! \:angry:`)
                    continue
                }

                username = usernameInfo.username
                
                const userBest = (await functions.getUserTop(username)).map(top => {
                    return top.date
                })

                //CHECK IF EXISTING USERNAME IN TRACK
                const existingTrack = await database.checkForTrack(username)

                const trackInfo = {
                    username,
                    pp: usernameInfo.pp_raw,
                    limit: argUsernames[arg].limit,
                    userBest
                }

                //ADD IF NOT EXISTING, IF SO UPDATE CHANNELS
                if (!existingTrack) {

                    database.addNewTrack(m, channelID, trackInfo, 'add')
                }
                else {
                    if (Object.keys(existingTrack.channels).includes(channelID)) {
                        if (existingTrack.channels[channelID] === argUsernames[arg].limit) {
                            m.channel.send(`\`${username}\` is already being tracked! \:confused:`)
                        }
                        else {
                            existingTrack.channels[channelID] = argUsernames[arg].limit

                            database.addNewTrack(m, channelID, trackInfo, 'update')
                            m.channel.send(`\`${username}\` has had their limit updated to track their \`top ${argUsernames[arg].limit}\`! \:tada:`)
                        }
                    }
                    else {

                        database.addNewTrack(m, channelID, trackInfo, 'update')
                        m.channel.send(`\`${username}\` is being added to tracking for osu! standard scores in their \`top ${argUsernames[arg].limit}\`! \:tada:`)
                    }
                }
            }
        }
        else if (args[0] === '-delete' || args[0] === '-d') {
            args.shift()
            let username = args.join('_')

            if (username === '--all') {
                database.deleteTrack(m, 'all', channelID)
            }
            else {
                database.deleteTrack(m, 'one', channelID, username)
            }
        }
        else if (args[0] === '-list' || args[0] === '-l') {
            let usersTrack = await database.trackList(channelID)

            let usernameArr = []
            let trackedText = ''

            usersTrack.forEach(user => {
                if (Object.keys(user.channels).includes(channelID)) {
                    usernameArr.push({
                        username: user.username,
                        limit: user.channels[channelID]
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
