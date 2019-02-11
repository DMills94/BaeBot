const fs = require('fs')
const Discord = require('discord.js')
const config = require('./config.json')
const database = require('./databases/requests.js')
const functions = require('./commands/exportFunctions.js')

const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync('./commands')

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

client.on('ready', async () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
    const devMode = await database.getDevMode()

    if (devMode) {
        client.user.setActivity(`In dev mode`)
    }
    else {
        client.user.setActivity(`messages! Try ${config.prefix}help!`, { type:"LISTENING" })
    }

    try {
        client.channels.get(config.updatesChannel).fetchMessage(config.commandsMessage)
            .then(msg => {
                let embed = new Discord.RichEmbed()
                    .setColor("#fd0000")
                    .setAuthor("List of bot commands")
                    .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
                    .addField(`${config.prefix}osu`, 'List of osu! commands')
                    .addField(`${config.prefix}ping`, 'Check if the bot is live')
                    .addField(`${config.prefix}roll`, 'Generate a random number between 1-100')
                    .addField(`${config.prefix}server`, 'Tells you what about the server you are in')
                    .addField(`${config.prefix}whoami`, 'Tell you about you')
                    .setFooter("Contact @Bae#3308 with any issues", "https://cdn.discordapp.com/avatars/122136963129147393/a_9ca3ec15b8776bf77cafe30d78b3ad96")
                msg.edit({ embed })
            })
            .catch(err => console.log(err))
    }
    catch(err) {
        console.log(err)
    }

    const emojis = client.guilds.find('id', config.privServer).emojis

    //Check bot hasn't left any servers, if so remove their db entries

    console.log('Starting tracking..')
    tracking(emojis, false)
    tracking(emojis, true)
    database.countryTrackUpdate(client.channels)

    setInterval(() => {
        tracking(emojis, false)
    }, 150000)

    setInterval(() => {
        tracking(emojis, true)
    }, 900000)

    setInterval(() => {
        database.countryTrackUpdate(client.channels)
    }, 7200000)
})

client.on('error', err => {
    console.log(err)
})

//Recording incoming messages
client.on('message', async message => {
    //Bot ignores self
    if (message.author.bot)
        return

    //Record message
    uI = message.content.toLowerCase()

    //Check for config.prefix
    if (uI.startsWith(config.prefix)) {

        const args = uI.slice(config.prefix.length).split(' ')
        for (let word in args) {
            if (args[word].includes('`'))
                return
        }

        let commandName = args.shift()

        if (commandName === 'restart' || commandName === 'psa') {
            if (message.author.id == config.baeID) {
                if (commandName === 'restart') {
                    return message.channel.send('I\'m restarting, see you soon!')
                    .then(() => client.destroy())
                    .then(() => {
                        client.login(config.token)
                    })
                }
                else if (commandName === 'psa') {
                    return client.commands.get('psa').execute(client, message, args)
                }
            }
            else
                return message.channel.send('Hey! What are you trying to do to me \:rage:')
        }


        let playNum
        let top5 = true

        if (commandName === 'r') {
            commandName = 'recent'
        }

        //If specific top play remove numbers
        if (commandName.includes('top') && commandName.length > 3) {
            playNum = parseInt(commandName.slice(3))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}topx\``)
            }
            if (!Number.isInteger(playNum))
                return message.channel.send(`Please use the follow format \`${config.prefix}top[x]\`\` where \`x\` is a number between 1 and 100, or \`${config.prefix}top\` to view the users top 5!`)
            commandName = 'top'
            top5 = false
        } else if (commandName.includes('top')) {
            playNum = 5
        }

        if (commandName.includes('rb') && commandName.length > 2) {
            playNum = parseInt(commandName.slice(2))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}rb[x]\``)
            }
            if (!Number.isInteger(playNum))
                return message.channel.send(`Please use the follow format \`${config.prefix}rb[x]\` where \`x\` is a number between 1 and 100!`)
            commandName = 'rb'
        } else if (commandName.includes('rb')) {
            playNum = 1
        }

        //config.prefix Commands
        if (!client.commands.has(commandName)) {
            message.channel.send(`Sorry that\'s not command I have :( \nIf you need help try \` ${config.prefix}help \` or for osu! commands try \` ${config.prefix}osu \`!`)
            return
        }
        
        const devMode = await database.getDevMode()
        if (devMode && message.author.id !== config.baeID)
            return message.channel.send('Bot is currently under maintenance, we will be back soon, promise!')

        const command = client.commands.get(commandName)

        try {
            const emojis = client.guilds.find('id', config.privServer).emojis

            command.execute(message, args, emojis, playNum, top5)

            functions.logCommand(client.channels, message, command.name, 'command', args)

        } 
        catch (error) {
            console.error(error)
            message.reply('There was an error with that command! Details: ' + error)
        }
    }

    //No-config.prefix Commands

    if (message.isMentioned(client.user) && message.author.id === config.wiquedID) {
        message.reply('begone thot.')
        console.log(`Called Wiqued a thot :)`)
    }

    if (uI.includes('pepehands')) {
        const emoji = client.emojis.find('name', 'PepeHands')
        message.react(emoji)
    }

    if (uI.startsWith('goodbye') || uI.startsWith('good bye')) {
        if (message.author.id === config.wiquedID) {
            message.reply(`cya thot! \:middle_finger:`)
            console.log(`Called Wiqued a thot :)`)
        } else {
            const konCha = client.emojis.find('name', 'KonCha')
            message.reply(`cya! ${konCha}`)
        }
    }

    if (uI === 'good bot' || uI === 'goodbot') {
        if (message.author.id === config.baeID) {
            message.channel.send('S...senpai owo')
        } else if (message.author.id === config.wiquedID) {
            message.reply('begone thot.')
            console.log(`Called Wiqued a thot :)`)
        } else {
            const itsbaeChamp = client.emojis.find('name', 'itsbaeChamp')
            message.channel.send(`Thanks! ${itsbaeChamp}`)
        }
    }

    if (uI === 'bad bot' || uI === 'badbot') {
        if (message.author.id === config.wiquedID) {
            message.reply('begone thot.')
            console.log(`Called Wiqued a thot :)`)
        } else {
            message.channel.send(`<@${config.baeID}> i'm being bullied \:sob:`)
        }
    }

    if (uI.match(/https?:\/\/(osu|new).ppy.sh\/([b]|[s]|beatmapsets)\//i)) {
        const emojis = client.guilds.find('id', config.privServer).emojis
        client.commands.get('recognise beatmap').execute(message, uI, emojis)
        functions.logCommand(client.channels, message, 'Recognise Beatmap', 'command')
    }
})

client.on('guildDelete', guild => {
    console.log(`BaeBot was removed from ${guild.name}, deleting database entries....`)

    database.deleteGuild(guild)
})

async function tracking(emojis, country) {
    const newScores = await client.commands.get('getTrackScores').execute(country)

    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)

    if (newScores.length > 0) {
        console.log(`${country ? '[COUNTRY TRACKING]' : '[TRACKING]'} ${newScores.length} new scores detected...: ${date} at ${time}`)

        for (let score in newScores) {
            client.commands.get('postnew').execute(newScores[score], emojis, client.channels, country)
        }
    } else {
        console.log(`${country ? '[COUNTRY TRACKING]' : '[TRACKING]'} No new scores detected: ${date} at ${time}`)
    }
}

//Start Bot
client.login(config.token)