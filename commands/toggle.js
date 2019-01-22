const config = require('../config.json')
const database = require('../databases/requests')

module.exports = {
	name: 'toggle',
	description: 'toggle functions',
	execute(m, args) {
        const channelID = m.channel.id

		if (args[0] === '-h' || args[0] === '-help') {

		}
		else if (args[0] === 'ranktrack') {
			database.toggleRankTrack(m, channelID)
		}
	}
}
