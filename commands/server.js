module.exports = {
  name: "server",
  description: "Server Information",
  execute(m) {
    console.log(m.guild)
    m.channel.send(`This server is: ${m.guild.name}\nTotal Members: ${m.guild.memberCount}`);
  },
};
