module.exports = {
  name: "pepehands",
  description: "Replies with emote when mentioned",
  execute(m, args) {
      m.channel.send((m.guild.emojis.find("name", "PepeHands").toString()));
  },
};
