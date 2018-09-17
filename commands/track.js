const axios = require('axios');
const Discord = require('discord.js')
const { prefix, osuApiKey, baeID, dbUrl } = require('../config.json');
const ojsama = require('ojsama');
const functions = require('./exportFunctions.js');

const dbCall = axios.create({
    baseURL: dbUrl
});

module.exports = {
    name: 'track',
    description: 'Adds a user to tracking',
    execute(m, args) {
        if (!m.channel.permissionsFor(m.member).has("ADMINISTRATOR") && m.author.id !== baeID) {
            return m.reply('sorry brah, this is currently only a feature for your boy Bae');
        };

        let existingLink = false;

        if (args[0] === '-help') {
            let helpText = `Tracking Commands | \`track [command]`;
            helpText += '\n ```\t-help : Hey, you are already here!';
            helpText += '\n\t-add [osu username],[osu username]...: Adds a users to be tracked, separated by a comma';
            helpText += '\n\t-delete [osu username] : Removes a user from being tracked';
            helpText += '\n\t-list : List the users currently being tracked```';
            helpText += '\nTracking is currently a test feature, it will only track osu standard and also will always track the top 100 scores of the user.'

            m.channel.send(helpText)
        }
        else if (args[0] === '-add') {
            args.shift();
            let argUsernamesRaw = args.join(' ').split(',');
            let argUsernames = [];
            for (let user in argUsernamesRaw) {
                newName = argUsernamesRaw[user].trim()
                argUsernames.push(newName)
            }

            //multiadd
            for (let arg in argUsernames) {

                let username = argUsernames[arg]

                //check username exists
                axios.get('api/get_user', {
                        params: {
                            k: osuApiKey,
                            u: username
                        }
                    })
                    .then(resp => {
                        if (resp.data.length < 1) {
                            return m.reply(`The username ${username} doesn't exist! Please try again`);
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

                                        existingLink = false

                                        const trackedUsers = [];

                                        for (let key in resp.data) {
                                            trackedUsers.push({
                                                ...resp.data[key]
                                            })
                                        }

                                        //check for existing link
                                        for (let user in trackedUsers) {
                                            if (trackedUsers[user].osuName === username && m.channel.id === trackedUsers[user].channel) {
                                                existingLink = true;
                                                break;
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
                                                    return m.channel.send(`\`${username}\` is now being tracked for new top100 osu! standard scores!`)
                                                    console.log("[TRACK] ADD - POST SUCCESS")
                                                })
                                                .catch(err => {
                                                    return m.channel.send(`I'm sorry there's an issue adding users to tracking right now. Please try again later.`)
                                                    console.log(err);
                                                })
                                        }
                                        else {
                                            return m.channel.send(`\`${username}\` is already being tracked!`)
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
        }
        else if (args[0] === '-delete') {
            args.shift();
            let username = args.join('_');

            if (username === '--all') {
                dbCall.get(`track.json`)
                    .then(resp => {
                        const trackedUsers = [];

                        for (let key in resp.data) {
                            trackedUsers.push({
                                ...resp.data[key],
                                id: key
                            })
                        }

                        let keysToDelete = [];

                        for (let user in trackedUsers) {
                            if (m.channel.id === trackedUsers[user].channel) {
                                keysToDelete.push(trackedUsers[user].id)
                            }
                        }

                        if (keysToDelete.length < 1) {
                            return m.channel.send("There are no users in this channel to delete!")
                        }

                        updatedTrackDB = {
                            ...resp.data
                        }

                        for (let key in keysToDelete) {
                            const deleteKey  = keysToDelete[key]
                            delete updatedTrackDB[deleteKey]
                        }

                        dbCall.put(`track.json`, updatedTrackDB)
                            .then(resp => {
                                m.channel.send(`All tracked users in this channel have been removed.`)
                                console.log("[TRACK] DELETE POST SUCCESS");
                            })
                            .catch(err => {
                                m.reply("there's an error deleting users from tracking right now, please try again later.")
                                console.log(err);
                            })

                    })
            }
            else {
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
                                if (trackedUsers[user].osuName === username && m.channel.id === trackedUsers[user].channel) {
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
                                        m.channel.send(`\`${username}\` has been removed from tracking.`)
                                        console.log("[TRACK] DELETE POST SUCCESS");
                                    })
                                    .catch(err => {
                                        m.reply("there's an error deleting this user from tracking right now, please try again later.")
                                        console.log(err);
                                    })
                            }
                        }).catch(err => {
                            m.channel.send("There was an issue with your request, please try again later.")
                            console.log(err);
                        })
                })
            }
        }
        else if (args[0] === '-list') {
            dbCall.get(`track.json`)
                .then(resp => {
                    const trackedUsers = resp.data;
                    let usernameArr = [];

                    for (let entry in trackedUsers) {
                        if (m.channel.id === trackedUsers[entry].channel) {
                            usernameArr.push(trackedUsers[entry].osuName);
                        }
                    }

                    let trackedText = '';

                    if (usernameArr.length > 0) {
                        trackedText += `__List of tracked users in this channel__ \n\`\`\``

                        for (let name in usernameArr) {
                            trackedText += `\n - ${usernameArr[name]}`
                        }

                        trackedText += "```"

                        m.channel.send(trackedText)
                    }
                    else {
                        m.channel.send("There are currently no users being tracked. Get started with ` `track -help`!")
                    }
                })
                .catch(err => {
                    m.channel.send("There was an issue with your request, please try again later.")
                    console.log(err);
                })
        }
        else {
            return m.reply('invalid arguments! Lost? Try ` `track -help`')
        }
    }
}
