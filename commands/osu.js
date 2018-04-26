const snekfetch = require('snekfetch');
const api = "https://osu.ppy.sh/api/"
const Discord = require('discord.js')
const {
  osuApiKey
} = require('../config.json');

module.exports = {
  name: "osu",
  description: "All commands relating to osu and its API",
  execute(m, args) {

    //Help
    if (args[0] === "help") {
      let embed = new Discord.RichEmbed()
        .setColor("#fd0000")
        .setAuthor("Commands for `osu")
        .setDescription("All commands are `osu [field] [params]")
        .addField("user [USER_NAME]", "Look up basic profile stats of a user (USER_NAME)")
        .setFooter("Contact @Bae#3308 with any issues")

        m.channel.send({
          embed: embed
        });
    }

    //User Lookup
    else if (args[0] === "user") {

      const userName = args[1];
      snekfetch.get("https://osu.ppy.sh/api/get_user").query({
          k: osuApiKey,
          u: userName
        })
        .then(r => {
          if (r.body.length == 0) {
            m.reply("That username does not exist! Please try again.")
            return;
          } else {

            let user = r.body[0];
            console.log(user);

            let embed = new Discord.RichEmbed()
              .setColor("#fcee03")
              .setAuthor(user.username, undefined, "https://osu.ppy.sh/user/" + user.username)
              .setThumbnail("https://osu.ppy.sh/a/" + user.user_id)
              .setDescription("Country: " + user.country + " | Playcount: " + user.playcount)
              .addField("Rank", "#" + user.pp_rank)
              .addField("Country Rank", "#" + user.pp_country_rank)
              .addField("PP", user.pp_raw + "pp")
              .addField("Accuracy", parseFloat(user.accuracy).toFixed(2) + "%")

            m.channel.send({
              embed: embed
            });
          }
        })
    } else {
      m.channel.send("Try `osu help");
    }
  }
};
