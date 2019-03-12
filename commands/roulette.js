const Discord = require('discord.js')
const config = require('../config.json')

module.exports = {
    name: 'roulette',
    description: 'Let\'s play a game of Russian Roulette!',
    async execute(m, args, emojis) {
        const gun = `\:gun:`
        const chambers = [false, false, false, false, false, true] //unsure if this should be user customisable?
        const timeout = 5000 //3s
        const successEmoji = emojis.find('name', 'Success')
        const errorEmoji = emojis.find('name', 'Error')
        const actionsGood = [
            'approaches the gun, puts the tip against their temple and slowly squeezes the trigger.......\n\n***Click*** ' + successEmoji,
            'pulls the gun to their head and quickly pulls the trigger!\n\n***Click*** ' + successEmoji,
            'tentively picks up the gun and aligns it with their eyes, they gulp and fire.\n\n***Click*** ' + successEmoji
        ]
        const actionsBad = [
            'picks up the gun, looking nervous, they aim and fire.\n\n ***Bang*** ' + errorEmoji,
            'moves quickly, grabbing and firing in mere milliseconds.\n\n ***Bang*** ' + errorEmoji,
            'moves to the table. Snatches up the gun and laughs while aiming at their forehead.\n\n ***Bang*** '  + errorEmoji
        ]

        const p1 = m.author
        let p2
        if (!args[0] || !args[0].startsWith('<@'))
            return m.channel.send(`Please select an opponent! \:gun:\:cowboy: \`${config.prefix}roulette @[user]\``)
        else {
            let discordId = args[0].slice(2, args[0].length - 1)
            if (discordId.startsWith('!')) {
                discordId = discordId.slice(1)
            }

            if (discordId === m.author.id)
                return m.channel.send(`You can't play with yourself... \:unamused:`)

            p2 = m.guild.members.get(discordId).user
        }

        //Determine who goes first
        const coinFlip = () => {
            const winner = (Math.floor(Math.random() * 2) == 0) ? p1 : p2
            const loser = winner.id === p1.id ? p2 : p1
            return {
                winner,
                loser
            }
        }

        const order = coinFlip()
        const first = order.loser
        const second = order.winner

        const gameMessage = await m.channel.send(`${gun} I've loaded the gun with \`${chambers.length}\` bullets.\n\nA coin is flipped, <@${first.id}> is the winner! They spin the chamber\n\n<@${second.id}> will go first..`)
        
        //Game start, randomise the chambers array
        const randomArr = arr => arr.map(a => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map(a => a[1])
        gameArr = randomArr(chambers)

        setTimeout(() => {
            for (let chamber in gameArr) {
                if (gameArr[chamber]) {
                    setTimeout(() => {
                        const player = chamber % 2 == 0 ? second : first
                        const winner = player == first ? second : first
                        gameFinished = true
                        let embed = new Discord.RichEmbed()
                            .setColor('#990000')
                            .setAuthor(`Russian Roulette!`, 'https://dappimg.com/media/image/app/d4827238-806f-4d3c-9614-c6f8df6036af.png')
                            .setDescription(`Winner! <@${winner.id}>`)
                            .setThumbnail(winner.avatarURL)
                            .addField(`Turn`, `<@${player.id}>`, true)
                            .addField(`Shots fired`, Number(chamber) + 1, true)
                            .addField('Action', `<@${player.id}> ${actionsBad[Math.floor(Math.random() * actionsBad.length)]}`)
                            .setFooter('A game of pure skill', player.avatarURL)

                        gameMessage.edit({ embed })
                    }, chamber * timeout)
                    break
                }
                else {
                    setTimeout(() => {
                        const player = chamber % 2 == 0 ? second : first
                        let embed = new Discord.RichEmbed()
                            .setColor('#00cc00')
                            .setAuthor(`Russian Roulette!`, 'https://dappimg.com/media/image/app/d4827238-806f-4d3c-9614-c6f8df6036af.png')
                            .setDescription(`<@${p1.id}> vs <@${p2.id}>`)
                            .setThumbnail('https://cdn.pixabay.com/photo/2016/09/22/09/10/pistol-1686696_960_720.png')
                            .addField(`Turn`, `<@${player.id}>`, true)
                            .addField(`Chambers left`, gameArr.length - chamber - 1, true)
                            .addField('Action', `<@${player.id}> ${actionsGood[Math.floor(Math.random() * actionsGood.length)]}`)
                            .setFooter('A game of pure skill', player.avatarURL)

                        gameMessage.edit({ embed })
                    }, chamber * timeout)
                }
            }
        }, timeout)
    }
}