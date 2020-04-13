const fs = require('fs')
const Discord = require('discord.js')
const config = require('./config.json')
const database = require('./databases/requests/track.js')
const { getDevMode } = require('./databases/requests/devMode.js')
const { checkServer } = require('./databases/requests/servers.js')
const functions = require('./commands/exportFunctions.js')
const c = require('colors')

const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync('./commands')

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

client.on('ready', async () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
    functions.logCommand(client)
    const devMode = await getDevMode()

    if (devMode) {
        client.user.setActivity(`In dev mode`)
    }
    else {
        client.user.setActivity(`messages! Try ${config.prefix}help!`, { type:'LISTENING' })
    }

    client.channels.get(config.updatesChannel).fetchMessage(config.commandsMessage)
        .then(msg => {
            let embed = new Discord.RichEmbed()
                .setColor('#fd0000')
                .setAuthor('List of bot commands')
                .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
                .addField(`${config.prefix}osu`, 'List of osu! commands')
                .addField(`${config.prefix}ping`, 'Check if the bot is live')
                .addField(`${config.prefix}roll`, 'Generate a random number between 1-100')
                .addField(`${config.prefix}roulette [@user]`, 'Fight to the death in the classic pistol shootiing game')
                .addField(`${config.prefix}server`, 'Tells you what about the server you are in')
                .addField(`${config.prefix}toggle`, '**__[ADMIN COMMAND]__**\nChange some bot settings via this command!')
                .addField(`${config.prefix}whoami [@user]`, 'Tell you about you, or someone else!')
                .setFooter('Contact @Bae#3308 with any issues')

            msg.edit({ embed })
                .catch(() => console.error('RUNNING BOT IN TEST MODE'.white.bgRed))
        })

    const emojis = client.guilds.find('id', config.privServer).emojis

    //Check bot hasn't left any servers, if so remove their db entries
    console.log('Starting tracking..'.rainbow)
    tracking(emojis, 'user')
    tracking(emojis, 'country')
    tracking(emojis, 'global')
    database.countryTrackUpdate(client.channels)
    database.globalTrackUpdate(client.channels)
})

//Recording incoming messages
client.on('message', async message => {
    //Bot ignores self
    if (message.author.bot) return

    //Record message
    psaText = message.content.slice(5)
    uI = message.content.toLowerCase()

    //Check for config.prefix
    if (uI.startsWith(config.prefix)) {

        const args = uI.slice(config.prefix.length).split(' ')

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
                    return client.commands.get('psa').execute(client, message, psaText)
                }
            }
            else
                return message.channel.send('Hey! What are you trying to do to me \:rage:')
        }

        // Check if channel is whitelisted, if not (whitelist array isn't empty AND channel id isn't in it) ignore the message
        if (commandName === 'whitelist') {
            if (!message.channel.permissionsFor(message.member).has('ADMINISTRATOR') && message.author.id !== config.baeID) return
        }
        else {
            const guild = await checkServer(message.guild.id, message)

            if (guild.whitelistChannels && guild.whitelistChannels.length && !guild.whitelistChannels.includes(message.channel.id)) {
                return
            }
        }

        let playNum
        let top5 = true

        if (commandName === 'r')
            commandName = 'recent'
        else if (commandName === 'u')
            commandName = 'user'
        else if (commandName === 'c')
            commandName = 'compare'

        //If specific top play remove numbers
        if (commandName.includes('top') && commandName.length > 3) {
            if (commandName.startsWith('osutop'))
                return message.channel.send(`Excuse me?! This isn't owo \:angry:\nTry using \` ${config.prefix}top\` or \` ${config.prefix}top[x]\` where \`x\` is a number between 1 and 100`)
            playNum = parseInt(commandName.slice(3))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}top[x]\``)
            }
            if (!Number.isInteger(playNum))
                return message.channel.send(`Not quite! Try again with the following format \` ${config.prefix}top[x]\` where \`x\` is a number between 1 and 100, or \` ${config.prefix}top\` to view the users top 5!`)
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
            message.channel.send(`Sorry, that's not a command I can help you with 😭\nIf you need help try \`${config.prefix}help\` or for **osu! commands** try \`${config.prefix}osu\`!`)
            return
        }
        
        const devMode = await getDevMode()
        if (devMode && message.author.id !== config.baeID)
            return message.channel.send('Bot is currently under maintenance, we will be back soon, promise!')

        const command = client.commands.get(commandName)

        message.channel.startTyping()
        try {
            const emojis = client.guilds.find('id', config.privServer).emojis

            command.execute(message, args, emojis, playNum, top5)

            functions.logCommand(client.channels, message, command.name, 'command', args)

        } 
        catch (error) {
            console.error(error)
            message.reply('There was an error with that command! Details: ' + error)
        }
        message.channel.stopTyping()
    }

    //No-config.prefix Commands
    const itsbaeChamp = client.emojis.find('name', 'itsbaeChamp')
    if (uI.includes('pepehands')) {
        const emoji = client.emojis.find('name', 'PepeHands')
        message.react(emoji)
    }

    if (uI.startsWith('goodbye') || uI.startsWith('good bye')) {
        message.reply(`cya! ${itsbaeChamp}`)
    }

    if (uI === 'good bot' || uI === 'goodbot') {
        if (message.author.id === config.baeID) {
            message.channel.send('S...senpai owo')
        }
        else {
            message.channel.send(`Thanks! ${itsbaeChamp}`)
        }
    }

    if (uI === 'bad bot' || uI === 'badbot') {
        if (message.author.id === config.baeID) {
            message.channel.send('I\'m sorry master, shall I grab the belt \:flushed:')
        }
        else {
            message.channel.send(`<@${config.baeID}> i'm being bullied \:sob:`)
        }
    }

    // Beatmap recognition
    if (uI.match(/https?:\/\/(osu|new).ppy.sh\/([b]|[s]|beatmapsets)\//i)) {
        const emojis = client.guilds.find('id', config.privServer).emojis
        client.commands.get('recognise beatmap').execute(message, uI, emojis)
        functions.logCommand(client.channels, message, 'Recognise Beatmap', 'command')
    }

    // User recognition
    if (uI.match(/https?:\/\/(osu|new).ppy.sh\/([u]|users)\//i)) {
        const emojis = client.guilds.find('id', config.privServer).emojis
        client.commands.get('recognise user').execute(message, uI, emojis)
        functions.logCommand(client.channels, message, 'Recognise User', 'command')
    }

    // MP recognition
    if (uI.match(/https?:\/\/(osu|new).ppy.sh\/community\/matches\//i) || uI.match(/https?:\/\/(osu|new).ppy.sh\/mp\//i)) {
        if (uI.includes(`${config.prefix}qualifier`)) return
        const emojis = client.guilds.find('id', config.privServer).emojis
        client.commands.get('recognise multi').execute(message, uI, emojis)
        functions.logCommand(client.channels, message, 'Recognise MP', 'command')
    }
})

client.on('guildDelete', guild => {
    console.log(`BaeBot was removed from ${guild.name}, deleting database entries....`)

    database.deleteGuild(guild)
})

const tracking = async (emojis, trackType) => {

    // Start the loop to repeat the check for new scores
    let timeout = 150000 // Timeout for user tracking
    if (trackType !== 'user')
        timeout = 900000


    setTimeout(() => {
        tracking(emojis, trackType)
    }, timeout)

    const newScores = await client.commands.get('getTrackScores').execute(trackType)

    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)

    if (newScores.length > 0) {
        console.log(`[${trackType.toUpperCase()} TRACKING] ${newScores.length} new scores detected...: ${date} at ${time}`.red.bold)

        for (let score in newScores) {
            client.commands.get('postnew').execute(newScores[score], emojis, client.channels, trackType)
        }
    } else {
        console.log(`[${trackType.toUpperCase()} TRACKING] No new scores detected: ${date} at ${time}`.yellow)
    }
}

//Start Bot
client.login(config.token)