const functions = require('./exportFunctions.js')
const Discord = require('discord.js')
const icons = require('../tournaments.json')

module.exports = {
    name: 'recognise multi',
    description: 'Detects MP links and shows information about the lobby',
    async execute(m, args) {

        // Post MP link + params
        // https://osu.ppy.sh/community/matches/51526333
        // https://osu.ppy.sh/mp/51526333

        // Tournaments || +t
        // > Post Link
        // > Optional param (+warmups) -- assuming 2 warmups, 1 per team?
        // > Results of match (PRO VERSION: POSTS RESULTS LIVE)

        // Mutli lobbies || +l
        // Player score break downs

        //https://osu.ppy.sh/community/matches/50005504 +w b:hr1 b:dt2 b:nm1 b:nm2 r:99 r:55 grand finals xx

        const message = await m.channel.send('Yup, working on it... 🔨')
        const embed = new Discord.RichEmbed()
        const argsSplit = args.split(' ')
        let mpId
        let mpUrl
        let warmups = false
        let bans = 2
        let team1Bans = []
        let team2Bans = []
        let rolls = 2
        let team1Roll
        let team2Roll
        let title = ''

        for (let arg in argsSplit) {
            if (argsSplit[arg].match(/https?:\/\/(osu|new).ppy.sh\/community\/matches\//i) || argsSplit[arg].match(/https?:\/\/(osu|new).ppy.sh\/mp\//i)) {
                mpUrl = argsSplit[arg]
                mpId = argsSplit[arg].split('/').slice(-1)[0]
            }
            else if (argsSplit[arg] === '+warmups' || argsSplit[arg] === '+w') {
                warmups = true
            }
            else if (argsSplit[arg].startsWith('b:')) {
                bans % 2 === 0
                    ? team1Bans.push(argsSplit[arg].slice(2))
                    : team2Bans.push(argsSplit[arg].slice(2))
                bans++
            }
            else if (argsSplit[arg].startsWith('r:')) {
                rolls % 2 === 0
                    ? team1Roll = argsSplit[arg].slice(2)
                    : team2Roll = argsSplit[arg].slice(2)
                rolls++
            }
            else {
                title += ` ${argsSplit[arg]}`
            }
        }

        console.log(mpId)

        const mpData = await functions.getMultiplayer(mpId)

        console.log(mpData)

        if (!mpData.match) {
            message.edit('Hmm, seems this match dosen\'t exist :thinking:')
            return message.delete(4000)
        }

        if (mpData.games.length === 0) {
            message.edit('MP detected! But it seems no maps have been played yet 😴')
            return message.delete(4000) 
        }

        console.log(lobbyInfo.name)

        const lobbyInfo = mpData.match
        const tournament = lobbyInfo.name.split(':')
        const team1 = lobbyInfo.name.split('vs')[0].match(/\(([^)]+)\)/)[1]
        const team2 = lobbyInfo.name.split('vs')[1].match(/\(([^)]+)\)/)[1]
        let maps = mpData.games
        let mapsProcessed = 0

        if (team1Bans.length > 0) {
            embed
                .addField(`${team1} ban(s)`, `${team1Bans.join(', ').toUpperCase()}`, true)
                .addField(`${team2} ban(s)`, `${team2Bans.join(', ').toUpperCase()}`, true)
        }

        if (team1Roll) {
            embed
                .addField(`${team1} roll`, team1Roll, true)
                .addField(`${team2} roll`, team2Roll, true)
        }

        if (warmups)
            maps = maps.slice(2)

        let team1Score = 0, team2Score = 0, MVP, team1Total, team2Total
        
        for (let [index, map] of maps.entries()) {
            MVP = {score: 0, player: ''}, team1Total = 0, team2Total = 0 //Reset map specific stats            
            const scores = map.scores
            const beatmapInfo = (await functions.getBeatmap(map.beatmap_id))[0]
            let freemod = false
            let mods = map.mods


            console.log(Date.parse(map.end_time))
            console.log(Date.parse(map.start_time))
            console.log(((Date.parse(map.end_time) - Date.parse(map.start_time)) / 1000))
            console.log(Number(beatmapInfo.total_length) - 1)
            console.log((((Date.parse(map.end_time) - Date.parse(map.start_time)) / 1000) < Number(beatmapInfo.length) - 1))
            console.log('-----------------------')
            // If map was aborted
            if (((Date.parse(map.end_time) - Date.parse(map.start_time)) / 1000) < Number(beatmapInfo.length) - 1)
                continue

            for (let s in scores) {
                const score = scores[s]
                score.team === '1' || score.slot === '0'
                    ? team1Total += Number(score.score)
                    : team2Total += Number(score.score)

                if (score.enabled_mods !== mods && score.enabled_mods !== null) {
                    freemod = true
                    mods = '| [FM] |'
                }

                if (Number(score.score) > MVP.score)
                    MVP = {score: score.score, player: score.user_id}
            }
            const MVPInfo = await functions.getUser(MVP.player)

            if (!freemod) {
                mods = functions.determineMods(map.mods) !== ''
                    ? `| [${functions.determineMods(map.mods).slice(1)}] |`
                    : '| [NM] |'
            }

            if (!MVPInfo) {
                console.log(map.beatmap_id, MVP.player, MVPInfo)
                continue
            }

            embed
                .addField(
                    `Pick #${index + 1} ${mods} ${beatmapInfo.length === 0
                        ? `Deleted beatmap`
                        : `${beatmapInfo.artist} - ${beatmapInfo.title} ${beatmapInfo.version}`}
                    `,
                    `__${team1Total > team2Total ? team1 : team2}__ wins by **${team1Total > team2Total ? (team1Total - team2Total).toLocaleString() : Number(team2Total - team1Total).toLocaleString()}**\nMVP: \:flag_${MVPInfo.country.toLowerCase()}: [${MVPInfo.username}](https://osu.ppy.sh/users/${MVPInfo.user_id}) (${Number(MVP.score).toLocaleString()})`
                )
                
            team1Total > team2Total ? team1Score++ : team2Score++ 
            mapsProcessed++

            if (mapsProcessed === maps.length) {
                embed
                    .setAuthor(`${tournament}: ${title.slice(1).toUpperCase()}`, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', mpUrl)
                    .setTitle(`Match score: ${team1Score > team2Score
                        ? `__**${team1} ${team1Score}**__ | ${team2Score} ${team2}`
                        : `${team1} ${team1Score} | __**${team2Score} ${team2}**__`
                    }`)
                    .setThumbnail(icons[tournament] ? icons[tournament] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')

                    try {
                        message.edit(title.slice(1).toUpperCase(), { embed })
                        m.delete()
                    }
                    catch(err) {
                        console.error(err)
                        message.edit(`Oh no, something went wrong 😭 try again or contact @Bae#3308`)
                        message.delete(4000)
                        m.delete(4000)
                    }
            }

        }


        
    }
}