const axios = require('axios');

const firebase = axios.create({baseURL: "https://baebot-1573a.firebaseio.com/"})

let customExports = module.exports = {};

customExports.lookupUser = (authorID) => {
    return new Promise((resolve, reject) => {

    let existingLink = false;
    let username;
    let linkedDB = [];

    firebase.get('linkedUsers.json')
        .then(resp => {
            const database = resp.data;

            for (let key in resp.data) {
                linkedDB.push({
                    ...resp.data[key],
                    id: key
                })
            }

            for (let link in linkedDB) {
                if (linkedDB[link].discordID === authorID) {
                    existingLink = true;
                    username = linkedDB[link].osuName;
                }
            }

            if (existingLink) {
                resolve(username);
            }
            else {
                reject();
            }
        })
        .catch(err => console.log(err))
        })
}
