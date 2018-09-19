const axios = require('axios');
const { osuApiKey } = require('../config.json');

module.exports = {
    name: "link",
    description: "links a users discord id to an osu name",
    execute(m, args, db) {

        const userId = m.author.id;
        const osuIGN = args.join("_");
        if (!osuIGN) {
            return m.reply("please specify a osu! username to link with: ``link [username]`")
        }

        axios.get("api/get_user", {
            params: {
                k: osuApiKey,
                u: osuIGN
            }
        })
            .then(resp => {
                if (resp.data.length === 0) {
                    return m.reply("That username does not exist! Please try again.");
                }

                let existingLink = false;
                let formattedUserName = resp.data[0].username;

                const dbLinked = db.ref("/linkedUsers")

                dbLinked.once("value", obj => {
                    const linkedUsers = obj.val()

                    for (let key in linkedUsers) {
                        if (userId === linkedUsers[key].discordID) {
                            existingLink = true
                        }
                    }

                    if (!existingLink) {
                        const user = {
                            discordID: userId,
                            osuName: formattedUserName
                        }

                        dbLinked.push().set(user)
                            .then(() => {
                                m.reply(`you have been successfully linked to \`${formattedUserName}\``);
                                console.log("[POST SUCCESS]");
                            })
                            .catch(err => {
                                m.reply("there's an error fetching stored data right now, please try again later!")
                                console.log(err)
                            })

                    }
                    else {
                        m.reply("you have already linked an osu profile to your account! Please use ``unlink` first and try again!")
                    }
                }, err => {
                    m.reply("there's an error fetching stored data right now, please try again later!")
                    console.log(err.code)
                })


                })
        .catch(err => {
            console.log(err);
        })

    }
};
