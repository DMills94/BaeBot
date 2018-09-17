const axios = require('axios');
const Discord = require('discord.js')
const { prefix } = require('../config.json');
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
            .addField(`${prefix}top [USER_NAME] / top[x] [USER_NAME]`, "Display a users Top-5, or Top-X play where X is an integer between 1 and 100.")
            .addField(`${prefix}recent [USER_NAME]`, "Displays the users most recent play (within 24 hours)")
            .addField(`${prefix}compare [USER_NAME]`, "Compares the users best score on the last beatmap posted.")
            .addField(`${prefix}rb [USER_NAME] / rb[x] [USER_NAME]`, "Shows the users recent best score, or X recent best where X is an integer between 1 and 100.")
            .addField(`${prefix}track`, "Use ` `track -help` for more info!")
            .addField(`${prefix}link/unlink [USER_NAME]`, "Links/Unlinks your discord account to an osu! username")
            .setFooter("Contact @Bae#3308 with any issues")

        m.channel.send({embed: embed});
    }
};
