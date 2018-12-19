const fs = require('fs')
const Discord = require('discord.js')
const config = require('./config.json')
const database = require('./databases/requests.js')

const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync('./commands')
// const functions = require('./commands/exportFunctions.js')

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

let devMode
let commandHistory = []

client.on('ready', async () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)

    let devMode = await database.getDevMode()
    if (devMode) {
        client.user.setActivity(`In dev mode`)
    }
    else {
        client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
    }

    const emojis = client.guilds.find('id', config.privServer).emojis

    //Check bot hasn't left any servers, if so remove their db entries

    console.log('Starting tracking..')
    tracking(emojis)

    setInterval(() => {
        tracking(emojis)
    }, 150000)
})

client.on('error', err => {
    console.log(err)
})

//Recording incoming messages
client.on('message', message => {
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
            commandName = 'top'
            top5 = false
        } else if (commandName.includes('top')) {
            playNum = 5
        }

        if (commandName.includes('rb') && commandName.length > 2) {
            playNum = parseInt(commandName.slice(2))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}rbx\``)
            }
            commandName = 'rb'
        } else if (commandName.includes('rb')) {
            playNum = 1
        }

        //config.prefix Commands
        if (!client.commands.has(commandName)) {
            message.channel.send('Sorry that\'s not command I have :( \nIf you need help try ``help`!')
            return
        }

        if (devMode && message.author.id !== config.baeID)
            return message.channel.send('Bot is currently under maintenance, please try again later!')

        const command = client.commands.get(commandName)

        try {
            if (command.name !== 'history') {
                const emojis = client.guilds.find('id', config.privServer).emojis

                command.execute(message, args, emojis, playNum, top5)

                //Update history
                commandHistory.unshift(uI.slice(config.prefix.length))
                if (commandHistory.length > 5) {
                    commandHistory.pop()
                }
            } else {
                command.execute(message, commandHistory)
            }

            logCommand(client, message, command.name, args)

        } catch (error) {
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
        logCommand(client, message, 'Recognise Beatmap')
    }
})

client.on('guildDelete', guild => {
    console.log(`BaeBot was removed from ${guild.name}, deleting database entries....`)
    client.channels.get(config.privChannel).send(`<@${config.baeID}> BaeBot was removed from ${guild.name}, please remove it's database entries!`)
    //Delete lastBeatmap
    // delete database.lastBeatmap[guild.id]

    // //Delete tracked users
    // console.log(guild)

    // let guildChannels = []

    // guild.channels.forEach(channel => {
    //     guildChannels.push(channel)
    // })

    // Object.keys(database.track).forEach(user => {
    //     guildChannels.forEach(channel => {
    //         if (Object.keys(database.track[user].channels).includes(channel))
    //             delete database.track[user].channels[channel]
    //     })
    // })

    // fs.writeFile('localdb.json', JSON.stringify(database, null, 4), err => {
    //     if (err) {
    //         console.log(`There was an issue removing data from the guild: ${guild.name}`)
    //         return console.log(err)
    //     }
    //     console.log(`Guild data removed for: ${guild.name}`)
    // })
})

const logCommand = (client, message, command, args = []) => {
    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)

    let embed = new Discord.RichEmbed()

    embed
        .setColor("#964B00")
        .setAuthor(`Server: ${message.channel.guild.name}`, message.channel.guild.iconURL)
        .setTitle(`Command: ${command}`)
        .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
        .setDescription(`Executed By: **${message.author.username}#${message.author.discriminator}**`)
        .setFooter(`${date} at ${time}`, message.author.avatarURL)

    client.channels.get(config.privChannel).send({ embed: embed })
}

async function tracking(emojis) {
    const newScores = await client.commands.get('getNewTrack').execute()

    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)

    if (newScores.length > 0) {
        console.log(`[TRACKING] ${newScores.length} new scores detected...posting: ${date} at ${time}`)
        console.log(newScores)
        for (let score in newScores) {
            client.commands.get('postnew').execute(newScores[score], emojis, client.channels)
        }
    } else {
        console.log(`[TRACKING] No new scores detected: ${date} at ${time}`)
    }
}

//Start Bot
client.login(config.token)