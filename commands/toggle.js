const config = require('../config.json')
const database = require('../databases/requests')

module.exports = {
	name: 'toggle',
	description: 'toggle functions',
	execute(m, args) {
		const channelID = m.channel.id
		
		if (!m.channel.permissionsFor(m.member).has("ADMINISTRATOR") && m.author.id !== config.baeID) {
            return m.reply('sorry brah, this is currently only a feature for users with Administrative permissions.')
        }

		if (args[0] === '-h' || args[0] === '-help') {
			
		}
		else if (args[0] === 'ranktrack') {
			database.toggleRankTrack(m, channelID)
		}
		else if (args[0] === 'announcements') {
			if (args[1] && args[1].startsWith('<#')) {
				const channelID = args[1].slice(2, args[1].length - 1)
				database.toggleAnnouncements(m, channelID)
			}
			else {
				database.toggleAnnouncements(m, null)
			}
		}
	}
}
