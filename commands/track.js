const axios = require('axios');
const Discord = require('discord.js')
const {
    prefix,
    osuApiKey,
    baeID,
    dbUrl
} = require('../config.json');
const ojsama = require('ojsama');
const functions = require('./exportFunctions.js');

const dbCall = axios.create({
    baseURL: dbUrl
});

module.exports = {
    name: 'track',
    description: 'Adds a user to tracking',
    execute(m, args) {
        if (m.author.id !== baeID) {
            return m.reply('sorry brah, this is currently only a feature for your boy Bae');
        };

        let existingLink = false;

        if (args[0] === '-help') {
            let helpText = `Tracking Commands | \`track [command]`;
            helpText += '\n ```\t-help : Hey, you are already here!';
            helpText += '\n\t-add [osu username]: Adds a user to be tracked';
            helpText += '\n\t-remove [osu username] : Removes a user from being tracked';
            helpText += '\n\t-list : List the users currently being tracked```';
            helpText += '\nTracking is currently a test feature, it will only track osu standard and also will always track the top 100 scores of the user.'

            m.channel.send(helpText)
        }
        else if (args[0] === '-add') {
            args.shift();
            let username = args.join('_');

            //check username exists
            axios.get('api/get_user', {
                    params: {
                        k: osuApiKey,
                        u: username
                    }
                })
                .then(resp => {
                    if (resp.data.length < 1) {
                        return m.reply("that username doesn't exist! Please try again");
                    };

                    username = resp.data[0].username;

                    axios.get('api/get_user_best', {
                            params: {
                                k: osuApiKey,
                                u: username,
                                limit: 100
                            }
                        })
                        .then(resp => {
                            const top100 = resp.data;

                            dbCall.get(`track.json`)
                                .then(resp => {
                                    const trackedUsers = [];

                                    for (let key in resp.data) {
                                        trackedUsers.push({
                                            ...resp.data[key]
                                        })
                                    }

                                    //check for existing link
                                    for (let user in trackedUsers) {
                                        if (trackedUsers[user].username === username) {
                                            existingLink = true;
                                        }
                                    }

                                    const trackInfo = {
                                        osuName: username,
                                        channel: m.channel.id,
                                        top100: top100
                                    }

                                    if (!existingLink) {
                                        dbCall.post(`track.json`, trackInfo)
                                            .then(resp => {
                                                return m.channel.send(`${username} is now being tracked for new top100 osu! standard scores!`)
                                                console.log("[TRACK] ADD - POST SUCCESS")
                                            })
                                            .catch(err => {
                                                return m.channel.send(`I'm sorry there's an issue adding users to tracking right now. Please try again later.`)
                                                console.log(err);
                                            })
                                    }
                                    else {
                                        return m.reply("your account is already being tracked!")
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    m.channel.send("There was an error! More info: " + err);
                                })
                        })
                        .catch(err => {
                            console.log(err);
                            m.channel.send("There was an error! More info: " + err);
                        })
                })
                .catch(err => {
                    console.log(err);
                    m.channel.send("There was an error! More info: " + err);
                })
        }
        else if (args[0] === '-delete') {
            args.shift();
            let username = args.join('_');

            axios.get('api/get_user', {
                    params: {
                        k: osuApiKey,
                        u: username
                    }
                })
                .then(resp => {

                    username = resp.data[0].username
                    //get tracked users
                    dbCall.get(`track.json`)
                        .then(resp => {
                            const trackedUsers = [];

                            for (let key in resp.data) {
                                trackedUsers.push({
                                    ...resp.data[key],
                                    id: key
                                })
                            }

                            //check for existing link
                            for (let user in trackedUsers) {
                                if (trackedUsers[user].osuName === username) {
                                    existingLink = true;
                                    keyToDelete = trackedUsers[user].id
                                }
                            }

                            if (!existingLink) {
                                return m.reply("that username isn't being tracked!")
                            }
                            else {
                                updatedTrackDB = {
                                    ...resp.data
                                }
                                delete updatedTrackDB[keyToDelete]

                                dbCall.put(`track.json`, updatedTrackDB)
                                    .then(resp => {
                                        console.log("[TRACK] DELETE POST SUCCESS");
                                        m.channel.send(`${username} has been removed from tracking.`)
                                    })
                                    .catch(err => {
                                        m.reply("there's an error deleting this user from tracking right now, please try again later.")
                                        console.log(err);
                                    })
                            }



                        })
                })
        }
        else if (args[0] === '-list') {

        }
        else {
            return m.reply('invalid arguments! Lost? Try ` `track -help`')
        }
    }
}
