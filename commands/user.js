const Discord = require('discord.js');
const axios = require('axios');
const { osuApiKey } = require('../config.json');
const functions = require('./exportFunctions.js');

module.exports = {
    name: "user",
    description: "Returns stats on the user's osu profile",
    async execute(m, args, db) {

        let username;

        if (args.length === 0) {
            username = await functions.lookupUser(m.author.id, db)
                .catch(err => {
                    m.reply("you do not have a linked account! Try ` `link [username]`");
                    return;
                })
        }
        else if (args[0].startsWith("<@")) {
            let discordId = args[0].slice(2, args[0].length - 1);
            if (discordId.startsWith("!")) {
                discordId = discordId.slice(1);
            }
            username = await functions.lookupUser(discordId, db)
                .catch(err => {
                    m.reply("they do not have a linked account so I cannot find their top plays :(");
                    return;
                })
        }
        else {
            username = args.join('_');
        };

        if (!username) {
            return;
        }

        axios.get("api/get_user", {
            params: {
                k: osuApiKey,
                u: username
            }
        })
            .then(r => {
                if (r.data.length === 0) {
                    m.reply("That username does not exist! Please try again.")
                    return;
                }
                else {
                    let user = r.data[0];

                    let embed = new Discord.RichEmbed()
                        .setColor("#fcee03")
                        .setAuthor(user.username, undefined, "https://osu.ppy.sh/users/" + user.user_id)
                        .setThumbnail("https://a.ppy.sh/" + user.user_id)
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
