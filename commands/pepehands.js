module.exports = {
    name: 'pepehands',
     description: 'Replies with emote when mentioned',
     execute(m, args) {
        if (m.channel.guild.name === 'Bae Station') {
            const emoji = m.guild.emojis.find('name', 'PepeHands')
            m.react(emoji)
        }
        else {
            return
        }
    },
}
