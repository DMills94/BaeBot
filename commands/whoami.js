const Discord = require('discord.js')

module.exports = {
    name: "whoami",
    description: "User Information",
    execute(m, args) {
        let targetUser
        let leadMessage

        if (args.length === 0) {
            const targetID = m.author.id
            targetUser = m.guild.members.get(targetID)
            leadMessage = "Here's some information about yourself!"
        }
        else if (args[0].includes("<@")) {
            let targetID = args[0].slice(2,args[0].length - 1)
            targetID.startsWith("!") ? targetID = targetID.slice(1, targetID.length) : targetID
            targetUser = m.guild.members.get(targetID)
            leadMessage = `<@${m.author.id}>, here's some information about ${targetUser.user.username}!`
        }
        else {
            return m.channel.send("It appears you're trying to look up someone's information! Please use ` `whoami @user` feature so I know who you're looking for!")
        }

        const discordUsername = targetUser.user.username
        const discordDiscrim = targetUser.user.discriminator
        const discordAvatar = targetUser.user.avatarURL
        const discordNick = targetUser.nickname ? targetUser.nickname : targetUser.user.username0
        let discordJoined = new Date(targetUser.user.createdTimestamp)
        let serverJoined = new Date(targetUser.joinedTimestamp)
        let serverRolesRaw = targetUser.roles
        let serverRoles = []

        serverRolesRaw.forEach(role => {
            serverRoles.push(role.name)
        })

        //remove @everyone
        serverRoles.shift()
        //make string
        serverRoles = serverRoles.join(', ')

        discordJoined = isoFormatting(discordJoined)
        serverJoined = isoFormatting(serverJoined)

        let embed = new Discord.RichEmbed()
            .setColor('#5cd6eb')
            .setAuthor(`Account info for: ${discordUsername}#${discordDiscrim}`)
            .setThumbnail(discordAvatar)
            .addField("Server Nickname", discordNick ? discordNick : discordUsername)
            .addField("Server Roles", serverRoles)
            .addField("Discord Join Date", discordJoined, true)
            .addField("Server Join Date", serverJoined, true)
            .setFooter(`Generated in: ${m.channel.guild.name}`, m.channel.guild.iconURL)

        m.channel.send(leadMessage, {embed: embed})
    }
}

const isoFormatting = (isoString) => {
    date = isoString.toDateString()
    time = isoString.toTimeString().split(" ")[0]
    return date + ", " + time
}
