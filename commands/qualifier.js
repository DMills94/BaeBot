const Discord = require('discord.js')
const icons = require('../tournaments.json')

module.exports = {
    name: 'qualifier',
    description: 'Qualifier management object',
    async execute(m, args) {
        channel = m.channel

        const awaitFilter = msg => msg.author.id === m.author.id
        const processUserMessage = msgCollection => {
            const msg = msgCollection.first()
            
            msg.delete()
            return msg.content
        }


        if (args[0] === 'start') {
            let botMsg = await channel.send('Welcome to BaeBot qualifier setup! 😄 I need to ask a few questions to configure your qualifier! Firstly, what is your qualifier\'s name? 🤔')
            let usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const qualifierName = processUserMessage(usersReply)

            botMsg.edit('Have a Spreadsheet/URL for your qualifier? 📈')
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const qualifierURL = processUserMessage(usersReply)
            
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
            
            botMsg.edit(`${mapCount} maps, ${mapIterations} times through. Amazing! Is your qualifier associated with a tournament? If so what's their acronym? If not just reply 'pass'
*NB: If you haven't already give your logo to @Bae#3308 and he can add it to my code! 😊*`)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const acronym = processUserMessage(usersReply)

            botMsg.edit(`Amazing! Here's your config so far...
test
\`\`\`Name: ${qualifierName}
Players: ${playerCount}\n
Players progress: ${numberQualify}
Number of maps: ${mapCount} maps, ${mapIterations} times through
Acronym: ${acronym}\`\`\`

Is this correct? (Yes/No)
            `)
            usersReply = await channel.awaitMessages(awaitFilter, {max: 1})
            const proceed = ['yes', 'y'].includes(processUserMessage(usersReply).toLowerCase())

            if (proceed) {
                m.delete()
                botMsg.edit('Setting up your qualifier!')
                let embed = new Discord.RichEmbed()
                    .setAuthor(qualifierName, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', qualifierURL)
                    .setTitle(`Number of players: ${playerCount}\nPlayers to progress: ${numberQualify}`)
                    .setThumbnail(icons[acronym] ? icons[acronym] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')
                    .addField('Maps', `
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
TEMPLATE - TEMPLATE [TEMPLATE] | Current MVP: TEMPLATE
                    `)
                    .addField('Leaderboard', 'Nobody has played currently!')

                botMsg.edit({ embed })
            }
            else {
                botMsg.edit('Alright, aborting 😫')
                m.delete()
                botMsg.delete(5000)
            }
        }
        else if (args[0] === 'add') {

        }
        else if (args[0] === 'end') {
            channel.send('Qualifier ended')
        }
        else if (args[0] === 'help') {
            
        }
    }

}