const fs = require("fs")
const Discord = require("discord.js")
const admin = require("firebase-admin")
const config = require("./config.json")

const client = new Discord.Client()
client.commands = new Discord.Collection()

const commandFiles = fs.readdirSync("./commands")
const functions = require("./commands/exportFunctions.js")

for (const file of commandFiles) {
    const command = require(`./commands/${file}`)
    client.commands.set(command.name, command)
}

let devMode
let commandHistory = []

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)

    const dbDev = db.ref('/devMode/')
    dbDev.once('value', value => {
        devMode = value.val()
    })
    if (devMode) {
        client.user.setActivity(`In dev mode`)
    } else {
        client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
    }

    if (client.user.id === "438366424805933056") {
        client.channels.get("476676731755823105").fetchMessage("476680709428346880")
            .then(message => {
                currentTime = new Date()
                date = currentTime.toDateString()
                time = currentTime.toTimeString()
                message.edit(`I am online! Last refresh on **${date}** at **${time}**`)
            })
            .catch(err => {
                console.log(err)
            })
    }

    const rankingEmojis = client.guilds.find("id", "486497815367778304").emojis

    console.log('Starting tracking..')
    updateTop100(rankingEmojis, db)

    setInterval(() => {
        updateTop100(rankingEmojis, db)
    }, 150000)
})

client.on("error", err => {
    console.log(err)
})

//Recording incoming messages
client.on("message", message => {
    //Bot ignores self
    if (message.author.bot)
        return

    //Record message
    uI = message.content.toLowerCase()

    //Check for config.prefix
    if (uI.startsWith(config.prefix)) {

        const args = uI.slice(config.prefix.length).split(" ")
        let commandName = args.shift()
        let playNum
        let top5 = true

        //If specific top play remove numbers
        if (commandName.includes("top") && commandName.length > 3) {
            playNum = parseInt(commandName.slice(3))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}topx\``)
            }
            commandName = "top"
            top5 = false
        } else if (commandName.includes("top")) {
            playNum = 5
        }

        if (commandName.includes("rb") && commandName.length > 2) {
            playNum = parseInt(commandName.slice(2))
            if (playNum < 1 || playNum > 100) {
                return message.channel.send(`Please select a number between 1-100 for \` ${config.prefix}rbx\``)
            }
            commandName = "rb"
        } else if (commandName.includes("rb")) {
            playNum = 1
        } else if (commandName === "toggledev") {
            if (message.author.id === config.baeID) {
                devMode = !devMode
                const dbRoot = db.ref('/')
                dbRoot.update({
                    "devMode": devMode
                })

                console.log(devMode)
                if (devMode) {
                    client.user.setActivity(`In dev mode`)
                } else {
                    client.user.setActivity(`Stuck? Try ${config.prefix}help!`)
                }
                return message.channel.send(`Dev mode is now ${devMode ? 'active' : 'inactive'}`)
            } else {
                return message.channel.send("Sorry this command isn't for you!")
            }
        }

        //config.prefix Commands
        if (!client.commands.has(commandName)) {
            return message.channel.send("Sorry that's not command I have :( \nIf you need help try ` `help`!")
        }

        if (devMode && message.author.id !== config.baeID)
            return message.channel.send("Bot is currently under maintenance, please try again later!")

        const command = client.commands.get(commandName)

        try {
            if (command.name !== "history") {
                const rankingEmojis = client.guilds.find("id", "486497815367778304").emojis

                command.execute(message, args, db, rankingEmojis, playNum, top5)

                //Update history
                commandHistory.unshift(uI.slice(config.prefix.length))
                if (commandHistory.length > 5) {
                    commandHistory.pop()
                }
            } else {
                command.execute(message, args, commandHistory)
            }

            logCommand(message, command.name)

        } catch (error) {
            console.error(error)
            message.reply("There was an error with that command! Details: " + error)
        }
    }

    //No-config.prefix Commands

    if (message.isMentioned(client.user) && message.author.id === config.wiquedID) {
        message.reply("begone thot.")
        console.log(`Called Wiqued a thot :)`)
    }

    if (uI.includes(":pepehands:")) {
        const emoji = client.emojis.find("name", "PepeHands")
        message.react(emoji)
    }

    if (uI.startsWith("goodbye") || uI.startsWith("good bye")) {
        if (message.author.id === config.wiquedID) {
            message.reply(`cya thot! \:middle_finger:`)
            console.log(`Called Wiqued a thot :)`)
        } else {
            const konCha = client.emojis.find("name", "KonCha")
            message.reply(`cya! ${konCha}`)
        }
    }

    if (uI === "good bot" || uI === "goodbot") {
        if (message.author.id === config.baeID) {
            message.channel.send("S...senpai owo")
        } else if (message.author.id === config.wiquedID) {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`)
        } else {
            const itsbaeChamp = client.emojis.find("name", "itsbaeChamp")
            message.channel.send(`Thanks! ${itsbaeChamp}`)
        }
    }

    if (uI === "bad bot" || uI === "badbot") {
        if (message.author.id === config.wiquedID) {
            message.reply("begone thot.")
            console.log(`Called Wiqued a thot :)`)
        } else {
            message.channel.send("I am sorry :( If i am not working correctly please contact my owner `@Bae#3308`")
        }
    }

    if (uI.match(/^https?:\/\/(osu|new).ppy.sh\/([bs]|beatmapsets)\/(\d+)\/?(#osu\/\d+)?/i)) {
        client.commands.get("recognise beatmap").execute(message, uI, db)
        logCommand(message, "Recognise Beatmap")
    }
})

client.on('guildDelete', guild => {
    console.log(`BaeBot was removed from ${guild.name}, deleting database entries....`)
    //Delete lastBeatmap
    const dbLastBeatmap = db.ref('/lastBeatmap/')
    dbLastBeatmap.child(guild.id).remove()
        .then(() => {
            console.log('--- Last beatmap deleted')
        })
        .catch(() => {
            console.log(`--- Error deleting last beatmap (Guild ID: ${guild.id}`)
        })

    //Delete tracked users
    const dbTrack = db.ref('/track/')
    dbTrack.child(guild.id).remove()
        .then(() => {
            console.log('--- Tracking deleted')
        })
        .catch(() => {
            console.log(`--- Error deleting last beatmap (Guild ID: ${guild.id}`)
        })
})

const logCommand = (message, command) => {
    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)
    console.log(`[EXECUTED COMMAND] in [${message.channel.guild.name}] for [${message.author.username}#${message.author.discriminator}]: ${command} on ${date} at ${time}`)
}

async function updateTop100(rankingEmojis, db) {
    const newScoresDuplicates = await functions.getTrackedUsersTop100(db)

    const newScores = newScoresDuplicates.filter((object, index) =>
        index === newScoresDuplicates.findIndex((obj) => (
            obj.date === object.date
        ))
    )

    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)
    if (newScores.length > 0) {
        console.log(newScores)
        console.log(`[TRACKING] ${newScores.length} new scores detected...posting: ${date} at ${time}`)
        for (let score in newScores) {
            client.commands.get("postnew").execute(newScores[score], db, rankingEmojis, client.channels)
        }
    } else {
        console.log(`[TRACKING] No new scores detected: ${date} at ${time}`)
    }
}

//Database Auth
admin.initializeApp({
    credential: admin.credential.cert(config.serviceAccountKey),
    databaseURL: config.dbUrl
})

//Assign database
const db = admin.database()

//Start Bot
client.login(config.token)
