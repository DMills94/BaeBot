const Discord = require('discord.js');
const axios = require('axios');
const { osuApiKey } = require('../config.json');

module.exports = {
    name: "profile",
    description: "Returns stats on the user's osu profile",
    execute(m, args) {
        const userName = args.join('_');

        axios.get("api/get_user", {
            params: {
                k: osuApiKey,
                u: userName
            }
        })
            .then(r => {
                if (r.data.length == 0) {
                    m.reply("That username does not exist! Please try again.")
                    return;
                }
                else {
                    let user = r.data[0];

                    let embed = new Discord.RichEmbed()
                        .setColor("#fcee03")
                        .setAuthor(user.username, undefined, "https://osu.ppy.sh/users/" + user.user_id)
                        .setThumbnail("https://osu.ppy.sh/a/" + user.user_id)
                        .setDescription(`Country: ${user.country} | Playcount: ${parseInt(user.playcount).toLocaleString('en')}`)
                        .addField("Rank", `#${parseInt(user.pp_rank).toLocaleString('en')}`)
                        .addField("Country Rank", `#${parseInt(user.pp_country_rank).toLocaleString('en')}`)
                        .addField("PP", `${Math.round(user.pp_raw).toLocaleString('en')}pp`)
                        .addField("Accuracy", parseFloat(user.accuracy).toFixed(2) + "%")
                        .setTimestamp()

                    m.channel.send({embed: embed});
                }
            })
            .catch(err => {
                console.log(err)
                m.channel.send("Error! More info: " + err);
            })
    }
};
