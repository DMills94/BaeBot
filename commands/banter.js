const { prefix } = require('../config.json')

module.exports = {
    name: "banter",
    description: "picture of Con",
    execute(m, args) {
        m.channel.send("What a cheeky cunt", {
            files: ["./images/banter.png"]
        });
    },
};
