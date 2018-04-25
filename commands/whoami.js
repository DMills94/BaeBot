module.exports = {
  name: "whoami",
  description: "User Information",
  execute(m, args) {
    m.channel.send(`Hi ${m.author.username}! This is your avatar: ${m.author.avatarURL}`);
  },
};
