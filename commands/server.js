const Discord = require('discord.js')

module.exports = {
	name: 'server',
	description: 'Server Information',
	execute(m) {
		const serverName = m.guild.name
		const serverIcon = m.guild.iconURL
		const memberCount = m.guild.memberCount
		const serverOwner = m.guild.owner
		const region = m.guild.region
		const roleNum = m.guild.roles.array().length
		const created = m.guild.createdAt

		let onlineUsers = m.guild.presences.array().length
		
		let games = {}
		m.guild.presences.forEach(presence => {
			if (presence.game != null)
				games[presence.game.name] ? games[presence.game.name] += 1 : games[presence.game.name] = 1
		})
		const popularGame = Object.keys(games).reduce((a, b) => games[a] > games[b] ? a : b)

		let embed = new Discord.RichEmbed()
			.setColor('#fcee03')
			.setAuthor(`Server info for: ${serverName}`)
			.setThumbnail(serverIcon)
			.addField('Total members', memberCount, true)
			.addField('Users online', onlineUsers, true)
			.addField('Owner', serverOwner, true)
			.addField('Region', region, true)
			.addField('Current most popular game', popularGame, true)
			.addField('Number of roles', roleNum, true)
			.addField('Created', created, false)


		m.channel.send({ embed })
		
		let emojis = ''
		let count = 1
		m.guild.emojis.forEach(emoji => {
			let emojisBefore = emojis

			if (emoji.requiresColons)
				emojis += `${emoji} `

			if (emojis.length > 2000) {
				m.channel.send(`__**Emojis**__\n${emojisBefore}`)
				emojis = `${emoji} `
				count++
			}
		})

		m.channel.send(`__**Emojis${count == 1 ? '' : ' ' + count} **__\n${emojis}`)
	}
}
