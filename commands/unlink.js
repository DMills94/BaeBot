const axios = require('axios');
const { dbUrl } = require('../config.json');

const dbCall = axios.create({
    baseURL: dbUrl
})

module.exports = {
    name: "unlink",
    description: "unlinks a users discord id to an osu name",
    execute(m, args) {

        const userId = m.author.id;
        let existingLink = false;
        let linkedDB = [];
        let keyToDelete;
        let updatedLinkedDB;

        //Get current list of registered users
        dbCall.get('linkedUsers.json')
            .then(resp => {
                //Check if linked already
                for (let key in resp.data) {
                    linkedDB.push({
                        ...resp.data[key],
                        id: key
                    })
                }

                for (let link in linkedDB) {
                    if (linkedDB[link].discordID === userId) {
                        existingLink = true;
                        keyToDelete = linkedDB[link].id;
                    }
                }

                if (!existingLink) {
                    return m.reply("you have no linked account to unlink! Please use ``link [username]` to link an account!")
                }

                else {
                    updatedLinkedDB = {
                        ...resp.data
                    }
                    delete updatedLinkedDB[keyToDelete]

                    dbCall.put('linkedUsers.json', updatedLinkedDB)
                        .then(resp => {
                            console.log("[UNLINK] POST SUCCESS");
                            m.channel.send("Unlink success!");
                        })
                        .catch(err => {
                            m.reply("there's an error storing this data right now, please try again later!")
                            console.log(err);
                        })
                }
            })
            .catch(err => {
                m.reply("there's an error fetching stored data right now, please try again later!")
                console.log(err);
            })


    }
};
