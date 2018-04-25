module.exports = {
  name: "server",
  description: "Server Information",
  execute(m, args) {
    m.channel.send(`This server is: ${m.guild.name}\nTotal Members: ${m.guild.memberCount}`);
  },
};
