module.exports = {
    name: "unlink",
    description: "unlinks a users discord id to an osu name",
    execute(m, args, db) {

        const userId = m.author.id;
        let existingLink = false;
        let linkedDB = [];
        let username;
        let keyToDelete;

        const dbLinked = db.ref("/linkedUsers")

        dbLinked.once("value", obj => {
            const linkedUsers = obj.val()

            for (let key in linkedUsers) {
                linkedDB.push({
                    ...linkedUsers[key],
                    id: key
                })
            }

            for (let link in linkedDB) {
                if (userId === linkedDB[link].discordID) {
                    existingLink = true
                    username = linkedDB[link].osuName
                    keyToDelete = linkedDB[link].id
                }
            }

            if (!existingLink) {
                return m.reply("you have no linked account to unlink! Please use ``link [username]` to link an account!")
            }
            else {
                dbLinked.child(keyToDelete).remove()
                    .then(() => {
                        console.log("[POST SUCCESS]");
                        m.channel.send(`You have been unlinked from \`${username}\``);
                    })
                    .catch(err => {
                        m.reply("there's an error storing this data right now, please try again later!")
                        console.log(err);
                    })
            }
        }, err => {
            m.reply("there's an error fetching stored data right now, please try again later!")
            console.log(err.code)
        })


    }
};
