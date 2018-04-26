module.exports = {
  name: "pepehands",
  description: "Replies with emote when mentioned",
  execute(m, args) {
    const emoji = m.guild.emojis.find("name", "PepeHands")
      m.react(emoji);
  },
};
