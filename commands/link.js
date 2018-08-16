const axios = require('axios');

const firebase = axios.create({
    baseURL: "https://baebot-1573a.firebaseio.com/"
})

module.exports = {
    name: "link",
    description: "links a users discord id to an osu name",
    execute(m, args) {
        console.log(args);
        const userId = m.author.id;
        const osuIGN = args[0];

        firebase.get('linkedUsers.json')
            .then(resp => {
                console.log(resp);
            })
            .catch(err => {
                console.log(err);
            })
    }
};
