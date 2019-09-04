const Discord = require('discord.js')
const icons = require('../tournaments.json')
const { newQualifier, lookupQualifier, editQualifier, processNewMp, finishQualifier } = require('../databases/requests/qualifiers')
const { prefix } = require('../config.json')
const { orderBy } = require('lodash')

module.exports = {
    name: 'qualifier',
    description: 'Qualifier management object',
    async execute(m, args) {
        channel = m.channel
        m.delete()

        const awaitFilter = msg => msg.author.id === m.author.id
        const processUserMessage = msgCollection => {
            const msg = msgCollection.first()
            
            msg.delete()
            return msg.content
        }


        if (args[0] === 'start') {
            const qualifierExists = await lookupQualifier(channel.id, true)
            if (qualifierExists) {
                const existMsg = await channel.send(`There\'s already a qualifier here! Please use \`${prefix}qualifier end\` before creating a new one!`) 
                return existMsg.delete(5000)
            }
            let botMsg = await channel.send('Welcome to BaeBot qualifier setup! 😄 I need to ask a few questions to configure your qualifier! Firstly, what is your qualifier\'s name? 🤔')
            let usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const qualifierName = processUserMessage(usersReply)

            botMsg.edit(`Have a Spreadsheet/URL for ${qualifierName}? 📈 Type \`pass\` if you don't have one`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            let qualifierURL = processUserMessage(usersReply)
            if (qualifierURL.toLowerCase() === 'pass') qualifierURL = null
            
            botMsg.edit(`Awesome, let's get ${qualifierName} configured! How many players in your qualifiers? 👨‍🌾`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const playerCount = processUserMessage(usersReply)
            
            botMsg.edit(`${playerCount} player? Great! How many will progress? 🏆`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const numberQualify = processUserMessage(usersReply)

            botMsg.edit(`${numberQualify} out of ${playerCount} to progress, got it. How many maps will they play? 🎮`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const mapCount = processUserMessage(usersReply)

            botMsg.edit(`${mapCount} maps. How many times? ⏲`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const mapIterations = processUserMessage(usersReply)
            
            botMsg.edit(`${mapCount} maps, ${mapIterations} times through. Amazing! Is your qualifier associated with a tournament? If so what's their acronym?  Type \`pass\` if you don't have one
*NB: If you haven't already give your logo to @Bae#3308 and he can add it to my code! 😊*`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            let acronym = processUserMessage(usersReply)
            if (acronym.toLowerCase() === 'pass') acronym = false

            botMsg.edit(`Amazing! Here's your config so far...
\`\`\`Name: ${qualifierName}
Players: ${playerCount}
Players progress: ${numberQualify}
Number of maps: ${mapCount} maps, ${mapIterations} times through
${acronym ? `Acronym: ${acronym}` : ''}\`\`\`

Is this correct? (Yes/No)
            `)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const proceed = ['yes', 'y'].includes(processUserMessage(usersReply).toLowerCase())

            if (proceed) {
                botMsg.edit('Setting up your qualifier!')

                // Save Qualifier to DB
                let attempts = 0
                while (attempts < 3) {
                    const dbObj = {
                        channelId: channel.id,
                        embedId: botMsg.id,
                        config: {
                            qualifierName,
                            qualifierURL,
                            playerCount,
                            numberQualify,
                            mapCount,
                            mapIterations,
                            acronym,
                        },
                        results: [] // Array of Player Objects containing results
                    }

                    const addQualifier = await newQualifier(dbObj)
                    if (addQualifier.success) {
                        let embed = qualifierEmbed(dbObj)
                        return botMsg.edit({ embed })
                    }
                    botMsg.edit(`Uhoh, I failed to save this. Trying again... \`${attempts + 1}/3\``)
                    attempts++
                }
                botMsg.edit('Ahh shit, I couldn\'t save your qualifier 😭 contact @Bae#3308, or try again later!', { embed: null })
                botMsg.delete(5000)
            }
            else {
                botMsg.edit('Alright, aborting 😫')
                botMsg.delete(5000)
            }
        }
        else if (args[0] === 'add') {
            const qualifierExists = await lookupQualifier(channel.id, true)
            if (!qualifierExists) {
                const existMsg = await channel.send(`There\'s no qualifier running right now! Please use \`${prefix}qualifier start\` to set a new one up!`) 
                return existMsg.delete(5000)
            }

            const processingMsg = await channel.send('🔨 Processing that MP, one moment...')

            const mpUrl = args[1]
            const mpId = mpUrl.split('/').slice(-1)[0]

            const addMp = await processNewMp(channel.id, mpId)
            processingMsg.delete()
            if (addMp.success) {
                const successMsg = await channel.send('Added successfully!')

                const newLeaderboardRaw = addMp.embedInfo.results
                const sortedLeaderboard = orderBy(newLeaderboardRaw, obj => obj[Object.keys(obj)[0]].total, 'desc')

                let updatedEmbed = qualifierEmbed({
                    ...addMp.embedInfo,
                    results: sortedLeaderboard
                })

                const embedMessage = await channel.fetchMessage(addMp.embedInfo.embedId)

                embedMessage.edit({ embed: updatedEmbed })

                successMsg.delete(5000)
            }
            else {
                const errorMsg = await channel.send('Error in adding mp to your qualifier! Contact @Bae#3308, or try again later!')
                errorMsg.delete(5000)
            }
        }
        else if (args[0] === 'end') {
            const qualifierExists = await lookupQualifier(channel.id, true)
            if (!qualifierExists) {
                const existMsg = await channel.send(`There\'s no qualifier to end! Please use \`${prefix}qualifier start\` to set a new one up!`) 
                return existMsg.delete(5000)
            }

            const endQualifier = await finishQualifier(channel.id)
            if (endQualifier.success) {
                const endMsg = await channel.send('Qualifier ended!')
                return endMsg.delete(5000)
            }
            else {
                const endFailedMsg = await channel.send('I failed to end your qualifier 😟 contact @Bae#3308, or try again later!')
                endFailedMsg.delete(5000)
            }
        }
        else if (args[0] === 'help') {

        }
    }
}

const qualifierEmbed = (dbObj) => {
    const results = dbObj.results
    const leaderboard = results.length === 0
        ? 'Nobody has played yet!'
        : `${results.slice(0, 10).map((player, i) => {
            const playerName = Object.keys(player)[0]
            return `\`${playerName.padEnd(16, ' ')}-\` (${player[playerName].total.toLocaleString('en')}) ${i === 0 ? '🏆' : ''}${i === 1 ? '🥈' : ''}${i === 2 ? '🥉' : ''}`
        }).join('\n')}`

    const cutOff = () => {
        const cutOffObj = results[dbObj.config.numberQualify]
        console.log(cutOffObj)
        if (cutOffObj) {
            return Object.keys(cutOffObj[Object.keys(cutOffObj)[0]].total)
        }
        else {
            return Object.keys(results.slice(-1)[0][Object.keys(results.slice(-1)[0])[0]].total)
        }
    }

    return new Discord.RichEmbed()
        .setAuthor(dbObj.config.qualifierName, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', dbObj.config.qualifierURL)
        .setTitle(`Number of players: ${dbObj.config.playerCount}\nPlayers to progress: ${dbObj.config.numberQualify}`)
        .setThumbnail(icons[dbObj.config.acronym] ? icons[dbObj.config.acronym] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')
        .addField(`Top 10 Leaderboard (${results.length}/${dbObj.config.playerCount})`, leaderboard)
        .addField(`Current Cutoff`, cutOff())
        .setFooter('Beta feature | any issues/suggestions, contact @Bae#3308')
        
}