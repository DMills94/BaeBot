module.exports = {
  name: "ping",
  description: "!Ping!",
  execute(m, args) {
    m.channel.send("Pong!");
  },
};
