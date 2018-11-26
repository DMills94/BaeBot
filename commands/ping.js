module.exports = {
  name: 'ping',
  description: '!Ping!',
  execute(m) {
    m.channel.send('Pong!')
  }
}
