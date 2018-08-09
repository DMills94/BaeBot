const Discord = require('discord.js')

module.exports = {
    name: "whoami",
    description: "User Information",
    execute(m, args) {
        let discordJoined = new Date(m.author.createdTimestamp);
        let serverJoined = new Date(m.member.joinedTimestamp);

        discordJoined = isoFormatting(discordJoined);
        serverJoined = isoFormatting(serverJoined);

        // console.log(m.member);

        let embed = new Discord.RichEmbed()
            .setColor('#5cd6eb')
            .setAuthor(m.author.username + "@" + m.author.discriminator)
            .setThumbnail(m.author.avatarURL)
            .addField("Server Nickname", m.member.nickname ? m.member.nickname : m.member.user.username)
            .addField("Discord Join Date", discordJoined, true)
            .addField("Server Join Date", serverJoined, true)
            .setFooter(`Generated in: ${m.channel.guild.name}`, m.channel.guild.iconURL)
            .setTimestamp()

        m.channel.send("Here's some information about yourself!", {embed: embed});
    }
};

const isoFormatting = (isoString) => {
    date = isoString.toDateString();
    time = isoString.toTimeString().split(" ")[0];
    return date + ", " + time;
}
