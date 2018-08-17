const axios = require('axios');
const Discord = require('discord.js')
const { prefix, osuApiKey } = require('../config.json');
const ojsama = require('ojsama');

axios.defaults.baseURL = "https://osu.ppy.sh/";

module.exports = {
    name: "osu",
    description: "All commands relating to osu and its API",
    execute(m, args) {

        //Help
        let embed = new Discord.RichEmbed()
            .setColor("#fd0000")
            .setAuthor("osu! related commands")
            .addField(`${prefix}profile [USER_NAME]`, "Look up basic profile stats of a user")
            .addField(`${prefix}top [USER_NAME]`, "Display a users Top-5")
            .addField(`${prefix}recent [USER_NAME]`, "Displays the users most recent play (within 24 hours)")
            .addField(`${prefix} link/unlink [USER_NAME]`, "Links/Unlinks your discord account to an osu! username")
            .setFooter("Contact @Bae#3308 with any issues");

        m.channel.send({embed: embed}) //User Lookup);
    }
};
