const Discord = require('discord.js')
const { prefix } = require('../config.json')
const database = require('../databases/requests.js')

module.exports = {
    name: "psa",
    description: "Admin only command to broadcast announcements to servers",
    execute(client, m, args) {
        const text = args.join(' ')

        let embed = new Discord.RichEmbed()
            .setColor("#45f442")
            .setAuthor("Announcement from BaeBot")
            .setTitle('Want updates for BaeBot?')
            .setURL('https://discord.gg/KSKTFNa')
            .addField('*Change where this announcement is sent?*', `Use \`${prefix}toggle announcements #[channel]\``)
            .setDescription(`__**Message**__\n${text}`)
            .setThumbnail("https://res.cloudinary.com/dk-find-out/image/upload/q_70,c_pad,w_1200,h_630,f_auto/exclamation_mark_icon_qxxyxc.jpg")
            .setFooter(`Announcement by ${m.author.username} | Disable me with ${prefix}toggle announcements`, m.author.avatarURL)

        client.guilds.forEach(async guild => {

            const permissions = await database.checkServer(guild.id, m, 'announcements')
            if (!permissions.announcements)
                return

            let announceChannelID
            let messageSent = false

            if (permissions.announceChannel) {
                announceChannelID = permissions.announceChannel
                await guild.channels.get(announceChannelID).send({ embed })
                    .then(() => {
                        messageSent = true
                    })
                    .catch(() => {
                        //If no permissions for that channel
                    })
            }

            if (messageSent)
                return
                
            const channels = guild.channels.array()
            for (let chan in channels) {
                if (channels[chan].type === "text") {
                    announceChannelID = channels[chan].id
                    await guild.channels.get(announceChannelID).send({ embed })
                        .then(() => {
                            messageSent = true
                        })
                        .catch(() => {
                            //Try the next channel
                        })
                }
                
                if (messageSent)
                    break
            }
        })
    }
}