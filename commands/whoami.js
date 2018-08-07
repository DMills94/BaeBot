const Discord = require('discord.js')

module.exports = {
    name: "whoami",
    description: "User Information",
    execute(m, args) {

        console.log(m.author.user);

        let embed = new Discord.RichEmbed()
            .setColor('#5cd6eb')
            .setAuthor(m.author.username + "@" + m.author.discriminator)
            .addField("Server Nickname", m.author.lastMessage, true)


        m.channel.send("Here's some information about yourself!", {embed: embed});
    }
};
