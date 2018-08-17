const Discord = require('discord.js')

module.exports = {
    name: "whoami",
    description: "User Information",
    execute(m, args) {
        let discordUsername;
        let discordDiscrim;
        let discordAvatar;
        let discordNick;
        let discordJoined;
        let serverJoined;
        let leadMessage;

        if (args.length === 0) {
            discordUsername = m.author.username;
            discordDiscrim = m.author.discriminator;
            discordAvatar = m.author.avatarURL;
            discordNick = m.member.nickname ? m.member.nickname : m.author.username0;
            discordJoined = new Date(m.author.createdTimestamp);
            serverJoined = new Date(m.member.joinedTimestamp);
            leadMessage = "Here's some information about yourself!";
        }
        else if (args[0].includes("<@")) {
            let targetID = args[0].slice(2,args[0].length - 1);
            targetID.startsWith("!") ? targetID = targetID.slice(1, targetID.length) : targetID;
            const targetUser = m.guild.members.get(targetID);

            discordUsername = targetUser.user.username;
            discordDiscrim = targetUser.user.discriminator;
            discordAvatar = targetUser.user.avatarURL;
            discordNick = targetUser.nickname ? targetUser.nickname : targetUser.user.username0;
            discordJoined = new Date(targetUser.user.createdTimestamp);
            serverJoined = new Date(targetUser.joinedTimestamp);
            leadMessage = `<@${m.author.id}>, here's some information about ${targetUser.user.username}!`;
        }
        else {
            return m.channel.send("It appears you're trying to look up someone's information! Please use ` `whoami @user` feature so I know who you're looking for!");
        }

        discordJoined = new Date(discordJoined);
        serverJoined = new Date(serverJoined);

        discordJoined = isoFormatting(discordJoined);
        serverJoined = isoFormatting(serverJoined);

        let embed = new Discord.RichEmbed()
            .setColor('#5cd6eb')
            .setAuthor(discordUsername + "@" + discordDiscrim)
            .setThumbnail(discordAvatar)
            .addField("Server Nickname", discordNick ? discordNick : discordUsername)
            .addField("Discord Join Date", discordJoined, true)
            .addField("Server Join Date", serverJoined, true)
            .setFooter(`Generated in: ${m.channel.guild.name}`, m.channel.guild.iconURL)
            .setTimestamp()

        m.channel.send(leadMessage, {embed: embed});
    }
};

const isoFormatting = (isoString) => {
    date = isoString.toDateString();
    time = isoString.toTimeString().split(" ")[0];
    return date + ", " + time;
}
