const config = require('../config.json')
const Discord = require('discord.js')
const database = require('../databases/requests/track.js')
const { toggleAnnouncements } = require('../databases/requests/servers.js')

module.exports = {
	name: 'toggle',
	description: 'toggle functions',
	execute(m, args) {
		const channelID = m.channel.id
		
		if (!m.channel.permissionsFor(m.member).has('ADMINISTRATOR') && m.author.id !== config.baeID) {
            return m.reply('sorry brah, this is currently only a feature for users with Administrative permissions.')
        }

		if (args[0] === '-h' || args[0] === '-help') {
			let embed = new Discord.RichEmbed()
				.setColor('#fd0000')
				.setAuthor(`Toggle Commands | ${config.prefix}toggle [command]`)
				.setTitle('Commands')
				.setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
				.addField('-help/-h', 'Hey, you\'re already here!')
				.addField('ranktrack', 'Toggles displaying of country rank updates being displayed in this channel')
				.addField('announcements', 'Toggles posting on announcements in this channel')
				.setFooter(`\n For server settings, type ${config.prefix}server`)

			m.channel.send({ embed })
		}
		else if (args[0] === 'ranktrack') {
			database.toggleRankTrack(m, channelID)
		}
		else if (args[0] === 'announcements') {
			if (args[1] && args[1].startsWith('<#')) {
				const channelID = args[1].slice(2, args[1].length - 1)
				toggleAnnouncements(m, channelID)
			}
			else {
				toggleAnnouncements(m, false)
			}
		}
	}
}
