const { prefix } = require('../config.json')

module.exports = {
  name: "help",
  description: "Command List",
  execute(m, args) {
      m.channel.send("Current Commands | prefix = " + prefix + " \n ```\tping : Check if the bot is live/response time\n\tserver : Tells you what server you are in\n\twhoami : Some information about yourself!\n\troll : Generate a random number between 1 - 100, or customise the variables! (roll help)```\n\nGitHub: <https://github.com/DMills94/BaeBot>")
  },
};
