const functions = require('./exportFunctions.js')
const Discord = require('discord.js')
const icons = require('../tournaments.json')
const { prefix } = require('../config.json')

module.exports = {
    name: 'recognise multi',
    description: 'Detects MP links and shows information about the lobby',
    async execute(m, args) {

        // Post MP link + params
        // https://osu.ppy.sh/community/matches/51526333
        // https://osu.ppy.sh/mp/51526333

        // Tournaments
        // > Post Link
        // > Optional params
        // (+w) -- assuming 2 warmups, 1 per team?
        // b:[text] -- Bans, alternate between teams
        // r:[number] -- Rolls, Team1 then Team2
        // fp:[number] -- Team1 (RED) or Team2 (BLUE)
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
        let firstPick = 1 // Defaults to RED

        for (let arg in argsSplit) {
            const a = argsSplit[arg]
            if (a.match(/https?:\/\/(osu|new).ppy.sh\/community\/matches\//i) || a.match(/https?:\/\/(osu|new).ppy.sh\/mp\//i)) {
                mpUrl = a
                mpId = a.split('/').slice(-1)[0]
            }
            else if (a === '+warmups' || a === '+w') {
                warmups = true
            }
            else if (a.startsWith('b:')) {
                bans % 2 === 0
                    ? team1Bans.push(a.slice(2))
                    : team2Bans.push(a.slice(2))
                bans++
            }
            else if (a.startsWith('r:')) {
                rolls % 2 === 0
                    ? team1Roll = a.slice(2)
                    : team2Roll = a.slice(2)
                rolls++
            }
            else if (a.startsWith('fp:')) {
                firstPick = +a.slice(3) - 1
            }
            else {
                title += ` ${a}`
            }
        }

        const mpData = await functions.getMultiplayer(mpId)

        if (!mpData.match) {
            message.edit('Hmm, seems this match dosen\'t exist :thinking:')
            return message.delete(4000)
        }

        if (mpData.games.length === 0) {
            message.edit('MP detected! But it seems no maps have been played yet 😴')
            return message.delete(4000) 
        }

        const lobbyInfo = mpData.match
        const tournament = lobbyInfo.name.split(':')[0]
        const team1 = lobbyInfo.name.split('vs')[0].match(/\(([^)]+)\)/)[1]
        const team2 = lobbyInfo.name.split('vs')[1].match(/\(([^)]+)\)/)[1]
        let maps = mpData.games
        let mapsProcessed = 0
        let team1DescriptionText = ''
        let team2DescriptionText = ''

        if (team1Roll) {
            // embed
            //     .addField(`${team1} roll`, team1Roll, true)
            //     .addField(`${team2} roll`, team2Roll, true)
            team1DescriptionText += `__Roll:__ ${team1Roll}`
            team2DescriptionText += `__Roll:__ ${team2Roll}`
        }

        if (team1Bans.length > 0) {
            // embed
            //     .addField(`${team1} ban(s)`, `${team1Bans.join(', ').toUpperCase()}`, true)
            //     .addField(`${team2} ban(s)`, `${team2Bans.join(', ').toUpperCase()}`, true)
            team1DescriptionText += `${!!team1DescriptionText ? ' - ' : ''} __Ban(s):__ ${team1Bans.join(', ').toUpperCase()}`
            team2DescriptionText += `${!!team2DescriptionText ? ' - ' : ''} __Ban(s):__ ${team2Bans.join(', ').toUpperCase()}`
        }

        if (!!team1DescriptionText || !team2DescriptionText)
            embed.setDescription(`**${team1}** | | ${team1DescriptionText}\n**${team2}** | | ${team2DescriptionText}`)

        if (warmups)
            maps = maps.slice(2)

        let team1Score = 0, team2Score = 0, MVP, team1Total, team2Total
        
        for (let [index, map] of maps.entries()) {
            MVP = {score: 0, player: ''}, team1Total = 0, team2Total = 0 //Reset map specific stats            
            const scores = map.scores
            const beatmapInfo = (await functions.getBeatmap(map.beatmap_id))[0]
            let freemod = false
            let mods = map.mods

            // If map was aborted
            // if (((Date.parse(map.end_time) - Date.parse(map.start_time)) / 1000) < Number(beatmapInfo.length) - 1)
            //     continue

            for (let s in scores) {
                const score = scores[s]
                score.team === '1' || score.slot === '0'
                    ? team1Total += Number(score.score)
                    : team2Total += Number(score.score)

                if (score.enabled_mods !== mods && score.enabled_mods !== null) {
                    freemod = true
                    mods = '[FM]'
                }

                if (Number(score.score) > MVP.score)
                    MVP = {score: score.score, player: score.user_id}
            }
            const MVPInfo = await functions.getUser(MVP.player)

            if (!freemod) {
                mods = functions.determineMods(map.mods) !== ''
                    ? `[${functions.determineMods(map.mods).slice(1)}]`
                    : '[NM]'
            }

            if (!MVPInfo) {
                continue
            }

            try {
                embed
                    .addField(
                        `Pick #${index + 1} by __${(index + 1) % 2 === firstPick ? team2 : team1}__   ${mods}`,
                        `${!beatmapInfo
                            ? `Deleted beatmap`
                            : `**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`}
__${team1Total > team2Total ? team1 : team2}__ wins by **${team1Total > team2Total ? (team1Total - team2Total).toLocaleString() : Number(team2Total - team1Total).toLocaleString()}** || MVP: \:flag_${MVPInfo.country.toLowerCase()}: [${MVPInfo.username}](https://osu.ppy.sh/users/${MVPInfo.user_id}) (${Number(MVP.score).toLocaleString()})`
                    )
            }
            catch(err) {
                message.edit(`Oh no, seems this MP has too many maps for the embed to handle 😭 This is a limitation for now, but we'll improve. Promise!`)
                return message.delete(10000)
            }
                
            team1Total > team2Total ? team1Score++ : team2Score++ 
            mapsProcessed++

            if (mapsProcessed === maps.length) {
                embed
                    .setAuthor(`${lobbyInfo.name}`, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', mpUrl)
                    .setTitle(`Match score: ${team1Score > team2Score
                        ? `🏆 __**${team1} ${team1Score}**__ | ${team2Score} ${team2}`
                        : `${team1} ${team1Score} | __**${team2Score} ${team2}**__ 🏆`
                    }`)
                    .setThumbnail(icons[tournament] ? icons[tournament] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')
                    .setFooter(`This is a --- B E T A --- feature. For the MP template, type [[ ${prefix}mp ]]`)

                    message.edit(title.slice(1).toUpperCase(), { embed })
                        .catch(() => {
                            message.edit(`Oh no, something went wrong 😭 try again or contact @Bae#3308`)
                        })
                    m.delete()
                        .catch(() => {
                            m.author.send(`Psst, I can delete that mp post message but I need the __Manage Messages__ role in the channel! Please contact the server owner, or @Bae#3308 to give me that 😄`)
                        })
            }

        }


        
    }
}