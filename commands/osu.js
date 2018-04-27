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
        .addField("user [USER_NAME]", "Look up basic profile stats of a user")
        .addField("top [USER_NAME]", "Display a users Top-5")
        .setFooter("Contact @Bae#3308 with any issues")

      m.channel.send({
        embed: embed
      });
    }

    //User Lookup
    else if (args[0] === "user" || args[0] === "avatar") {

      const userName = args.slice(1).join('_');

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
            // console.log(user);

            if (args[0] === "user") {

              let embed = new Discord.RichEmbed()
                .setColor("#fcee03")
                .setAuthor(user.username, undefined, "https://osu.ppy.sh/users/" + user.user_id)
                .setThumbnail("https://osu.ppy.sh/a/" + user.user_id)
                .setTimestamp()
                .setDescription("Country: " + user.country + " | Playcount: " + user.playcount)
                .addField("Rank", "#" + user.pp_rank)
                .addField("Country Rank", "#" + user.pp_country_rank)
                .addField("PP", user.pp_raw + "pp")
                .addField("Accuracy", parseFloat(user.accuracy).toFixed(2) + "%")

              m.channel.send({
                embed: embed
              });
            } else if (args[0] === "avatar") {
              m.channel.send("Avatar for: " + user.username, {
                file: "https://osu.ppy.sh/a/" + user.user_id + ".jpg"
              }).catch(err => {
                m.channel.send("This user has an invalid, or no avatar.")
              })
            }
          }
        })
    }


    //User Top 5
    else if (args[0] === "top") {

      const userName = args.slice(1).join('_')

      //First Call
      snekfetch.get("https://osu.ppy.sh/api/get_user_best").query({
          k: osuApiKey,
          u: userName,
          limit: "5"
        })
        .then(r => {
          if (r.body.length == 0) {
            m.reply("That username does not exist! Please try again.")
            return;
          } else {

            const scores = r.body;

            //Second Call
            snekfetch.get("https://osu.ppy.sh/api/get_user").query({
                k: osuApiKey,
                u: userName
              })
              .then(r => {
                osuUser = r.body[0];

                //Determine Mods used for scores
                for (let i = 0; i < scores.length; i++) {
                  mods = "";
                  determineMods(scores[i]);
                  scores[i].enabled_mods = mods;
                }

                //Calculate accuracy
                for (var i = 0; i < scores.length; i++) {
                  userAcc = (parseInt(scores[i].count300) * 300 + parseInt(scores[i].count100) * 100 + parseInt(scores[i].count50) * 50) / ((parseInt(scores[i].count300) + parseInt(scores[i].count100) + parseInt(scores[i].count50) + parseInt(scores[i].countmiss)) * 300) * 100;
                  scores[i].accuracy = userAcc.toFixed(2).toString();
                }

                let beatmapList = [];
                let mapNum = 0;

                //Third Call x5 (5 beat maps)

                getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList);

                function getBeatmapInfo(index, m, osuUser, scores, beatmapList) {
                  snekfetch.get("https://osu.ppy.sh/api/get_beatmaps").query({
                      k: osuApiKey,
                      b: scores[index].beatmap_id
                    })
                    .then(r => {
                      beatmapInfo = r.body[0];
                      beatmapInfo.orderKey = mapNum + 1;
                      beatmapList.push(beatmapInfo);

                      if (beatmapList.length == scores.length) {
                        generateTop(m, osuUser, scores, beatmapList)
                      } else {
                        mapNum++
                        getBeatmapInfo(mapNum, m, osuUser, scores, beatmapList);
                      }
                    })
                    .catch(function(err) {
                      console.log(err);
                    })
                }

              })

              .catch(function(err) {
                console.log(err);
              });
          }
        })
        .catch(function(err) {
          console.log(err)
        });
    }
    //if args[0] isn't a command.
    else {
      m.channel.send("Try `osu help");
    }
  }
};

//Function to change returned "mods" value to actual Mods
let modnames = [
  { val: 1, name: "NoFail", short: "NF" },
  { val: 2, name: "Easy", short: "EZ" },
  { val: 4, name: "NoVideo", short: "" },
  { val: 8, name: "Hidden", short: "HD" },
  { val: 16, name: "HardRock", short: "HR" },
  { val: 32, name: "SuddenDeath", short: "SD" },
  { val: 64, name: "DoubleTime", short: "DT" },
  { val: 128, name: "Relax", short: "RX" },
  { val: 256, name: "HalfTime", short: "HT" },
  { val: 512, name: "Nightcore", short: "NC" },
  { val: 1024, name: "Flashlight", short: "FL" },
  { val: 2048, name: "Autoplay", short: "AT" },
  { val: 4096, name: "SpunOut", short: "SO" },
  { val: 8192, name: "Relax2", short: "AP" },
  { val: 16384, name: "Perfect", short: "PF" },
  { val: 32768, name: "Key4", short: "4K" },
  { val: 65536, name: "Key5", short: "5K" },
  { val: 131072, name: "Key6", short: "6K" },
  { val: 262144, name: "Key7", short: "7K" },
  { val: 524288, name: "Key8", short: "8K" },
  { val: 1048576, name: "FadeIn", short: "FI" },
  { val: 2097152, name: "Random", short: "RD" },
  { val: 4194304, name: "LastMod", short: "LM" },
  { val: 16777216, name: "Key9", short: "9K" },
  { val: 33554432, name: "Key10", short: "10K" },
  { val: 67108864, name: "Key1", short: "1K" },
  { val: 134217728, name: "Key3", short: "3K" },
  { val: 268435456, name: "Key2", short: "2K" }
]

function determineMods(score) {
  if (score.enabled_mods == "0") {
    mods = "NoMod";
  } else {
    for (i = 0; i < modnames.length; i++) {
      if (score.enabled_mods & modnames[i].val) {
        mods += modnames[i].short;
      }
    }
  }
};

function generateTop(m, osuUser, scores, maps) {
  //Create RichEmbed
  let embed = new Discord.RichEmbed()
    .setColor("#FFFFFF")
    .setAuthor("Top 5 plays for " + osuUser.username, undefined, "https://osu.ppy.sh/users/" + osuUser.user_id)
    .setThumbnail("https://osu.ppy.sh/a/" + osuUser.user_id)
    .setTimestamp()
    .addField(topInfoHeader(0, maps), topInfoInfo(0, scores, maps))
    .addField(topInfoHeader(1, maps), topInfoInfo(1, scores, maps))
    .addField(topInfoHeader(2, maps), topInfoInfo(2, scores, maps))
    .addField(topInfoHeader(3, maps), topInfoInfo(3, scores, maps))
    .addField(topInfoHeader(4, maps), topInfoInfo(4, scores, maps))
    .setFooter("Message sent: ")

  //Send Embed to Channel
  m.channel.send({
    embed: embed
  });
}

function topInfoHeader(index, maps) {
  return "__" + maps[index].artist + " - " + maps[index].title + " [" + maps[index].version + "]__"
}

function topInfoInfo(index, scores, maps) {
  return "[Beatmap Link](https://osu.ppy.sh/b/" + maps[index].beatmap_id + ")\n\u2022 Mods: " + scores[index].enabled_mods + "\n\u2022 Rank: " + scores[index].rank + "\n\u2022 PP: " + Math.round(scores[index].pp) + "\n\u2022 Accuracy: " + scores[index].accuracy + "%\n\u2022 Score: " + parseInt((scores[index].score)).toLocaleString('en')
}
