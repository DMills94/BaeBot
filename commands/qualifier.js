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
                        mps: [],
                        results: [] // Array of Player Objects containing results
                    }

                    const addQualifier = await newQualifier(dbObj)
                    if (addQualifier.success) {
                        let embed = qualifierEmbed(addQualifier.dbObj)
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
            // Require lobby name
            if (!args[2]) {
                return channel.send('Please add the name of the mp on the end of the command! 😬')
                    .then(msg => msg.delete(5000))
            }

            const processingMsg = await channel.send('🔨 Processing that MP, one moment...')

            const mpUrl = args[1]
            const mpId = mpUrl.split('/').slice(-1)[0]
            const mpName = args.slice(2).join(' ')

            const addMp = await processNewMp(channel.id, mpId, mpName)
            processingMsg.delete()
            if (addMp.success) {
                const successMsg = await channel.send('Added successfully! 😚')

                const leaderboard = sortLeaderboard(addMp.results)

                let updatedEmbed = qualifierEmbed({
                    ...addMp,
                    results: leaderboard
                })

                const embedMessage = await channel.fetchMessage(addMp.embedId)

                embedMessage.edit({ embed: updatedEmbed })

                successMsg.delete(5000)
            }
            else {
                const errorMsg = await channel.send('Error in adding mp to your qualifier! 🙅 Check the url is correct, contact @Bae#3308, or try again later!')
                errorMsg.delete(5000)
            }
        }
        else if (args[0] === 'end') {
            const qualifierExists = await lookupQualifier(channel.id)
            if (!qualifierExists) {
                const existMsg = await channel.send(`There\'s no qualifier to end! Please use \`${prefix}qualifier start\` to set a new one up!`) 
                return existMsg.delete(5000)
            }

            const endQualifier = await finishQualifier(channel.id)
            if (endQualifier.success) {
                const leaderboard = sortLeaderboard(qualifierExists.results)
                let updatedEmbed = qualifierEmbed({
                        ...qualifierExists,
                        results: leaderboard
                }, true)
                    .setImage('https://media.giphy.com/media/SeysxkSfenHY4/giphy.gif')
                    .setTitle(`**${qualifierExists.config.qualifierName} ENDED**`)
                    
                const embedMessage = await channel.fetchMessage(qualifierExists.embedId, true)
                embedMessage.edit({ embed: updatedEmbed })

                const endMsg = await channel.send('Qualifier ended!')
                return endMsg.delete(5000)
            }
            else {
                const endFailedMsg = await channel.send('I failed to end your qualifier 😟 contact @Bae#3308, or try again later!')
                endFailedMsg.delete(5000)
            }
        }
        else if (args[0] === 'mps') {
            const qualifierId = m.content.split(' ')[2]

            const qualifier = await lookupQualifier(qualifierId)

            const mps = qualifier.mps

            if (mps.length === 0)
                return m.channel.send('No MPs have been processed for this qualifier!')
                    .then(msg => msg.delete(5000))
            else {
                return m.channel.send(`**MPs for ${qualifier.config.qualifierName}**\n${mps.map(mp => `\`${mp.name}\` - <${mp.url}>`).join('\n')}`)
                    .then(msg => msg.delete(60000))
            }
        }
        else if (args[0] === 'forceupdate') {
            const qualifierId = m.content.split(' ')[2]
            const qualifier = await lookupQualifier(qualifierId)
            const successMsg = await channel.send('Updated the leaderboard')
            return editEmbed(qualifier, successMsg)
        }
        else if (args[0] === 'help') {

        }
    }
}

const sortLeaderboard = resultsObj => orderBy(resultsObj, obj => obj[Object.keys(obj)[0]].total, 'desc')

const editEmbed = async (qualObj, successMsg) => {
    const leaderboard = sortLeaderboard(qualObj.results)

    let updatedEmbed = qualifierEmbed({
        ...qualObj,
        results: leaderboard
    })

    const embedMessage = await channel.fetchMessage(qualObj.embedId)

    embedMessage.edit({ embed: updatedEmbed })

    successMsg.delete(5000)
}

const qualifierEmbed = (dbObj, finished = false) => {
    console.log(dbObj)
    const results = dbObj.results
    const leaderboard = results.length === 0
        ? 'Nobody has played yet!'
        : `${results.slice(0, 10).map((player, i) => {
            const playerName = Object.keys(player)[0]
            return `\`${String((i+1) + '.').padEnd(3)}\`\:flag_${player[playerName].country.toLowerCase()}: **${playerName}** (${player[playerName].total.toLocaleString('en')}) ${i === 0 ? '🏆' : ''}${i === 1 ? '🥈' : ''}${i === 2 ? '🥉' : ''}`
        }).join('\n')}`

    const cutOff = embed => {
        const cutOffObj = results[Number(dbObj.config.numberQualify) - 1]

        if (cutOffObj) {
            const cutOffPlayer = Object.keys(cutOffObj)[0]
            embed.addBlankField()
            embed.addField('Who to beat 🥊', `\`${dbObj.config.numberQualify}.\` \:flag_${cutOffObj[cutOffPlayer].country.toLowerCase()}: **${cutOffPlayer}** (${cutOffObj[cutOffPlayer].total.toLocaleString('en')})`)
        }
        return embed
    }

    const finalStats = embed => {
        let runningTotal = 0

        for (const player of results) {
            const playerName = Object.keys(player)[0]
            runningTotal += player[playerName].total
        }

        const winnerName = Object.keys(results[0])[0]
        const averageScore = Math.round(runningTotal/dbObj.results.length).toLocaleString('en')
        let cutOffScore = '__All players progress!__' // Assuming number of players isn't equal to the cut off

        const cutOffObj = results[Number(dbObj.config.numberQualify) - 1]
        if (cutOffObj) {
            const cutOffPlayer = Object.keys(cutOffObj)[0]
            cutOffScore = `${cutOffObj[cutOffPlayer].total.toLocaleString('en')} \`(${dbObj.config.numberQualify}. ${cutOffPlayer})\``
        }

        embed.addBlankField()
        embed.addField('QUALIFIER RESULTS 📈', `🏆 Winner: **${winnerName}**\n👍 Average Score: ${averageScore}\n😱 Cut Off: ${cutOffScore}`)
        return embed
    }

    let embed = new Discord.RichEmbed()
        .setColor('#fcee03')
        .setAuthor(dbObj.config.qualifierName, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', dbObj.config.qualifierURL)
        .setTitle(`\:spy: Number of players: ${dbObj.config.playerCount}\n👉 Players to progress: ${dbObj.config.numberQualify}`)
        .setThumbnail(icons[dbObj.config.acronym] ? icons[dbObj.config.acronym] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')
        .addField(`Top 10 Leaderboard (${results.length}/${dbObj.config.playerCount})`, leaderboard)
        .setImage('https://media.giphy.com/media/mqWZoUiub0cyA/giphy.gif')
        .setFooter(`${dbObj._id} | Beta feature | any issues/suggestions, contact @Bae#3308`)
    
    if (finished) {
        embed = finalStats(embed)
    }
    else {
        embed = cutOff(embed)
    }

    return embed
}