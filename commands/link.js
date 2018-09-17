const axios = require('axios');
const { osuApiKey, dbUrl } = require('../config.json');

const dbCall = axios.create({
    baseURL: dbUrl
})

module.exports = {
    name: "link",
    description: "links a users discord id to an osu name",
    execute(m, args) {

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
                let linkedDB = [];
                let formattedUserName = resp.data[0].username;

                //Get current list of registered users
                dbCall.get('linkedUsers.json')
                    .then(resp => {

                        for (let key in resp.data) {
                            linkedDB.push({
                                ...resp.data[key]
                            })
                        }

                        //Check if linked already
                        for (let link in linkedDB) {
                            if (linkedDB[link].discordID === userId) {
                                existingLink = true;
                            }
                        }

                        const user = {
                            discordID: userId,
                            osuName: formattedUserName
                        };

                        //If not post
                        if (!existingLink) {
                            dbCall.post('linkedUsers.json', user)
                                .then(resp => {
                                    m.reply(`you have been successfully linked to ${formattedUserName}`);
                                    console.log("[POST SUCCESS]");
                                })
                                .catch(err => {
                                    m.reply("there's an error storing this data right now, please try again later!")
                                    console.log(err);
                                })
                        }
                        else {
                            m.reply("you have already linked an osu profile to your account! Please use ``unlink` first and try again!")
                        }
                    })
                    .catch(err => {
                        m.reply("there's an error fetching stored data right now, please try again later!")
                        console.log(err);
                    })
                })
        .catch(err => {
            console.log(err);
        })

    }
};
