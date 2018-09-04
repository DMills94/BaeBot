const { prefix } = require('../config.json')

module.exports = {
  name: "help",
  description: "Command List",
  execute(m, args) {

      let helpText = `Current Commands | prefix = ${prefix}`;
      helpText += "\n ```\tping : Check if the bot is live/response time";
      helpText += "\n\tserver : Tells you what server you are in";
      helpText += "\n\tosu : List of osu! commands";
      helpText += "\n\twhoami : Some information about yourself!";
      helpText += "\n\troll : Generate a random number between 1-100";
      helpText += "\n\thistory : History of commands used since bot went online```"
      helpText += "\nI am the test version of <@438366424805933056>, my live documentation can be found on GitHub: <https://github.com/DMills94/BaeBot>"

      m.channel.send(helpText);
  },
};
