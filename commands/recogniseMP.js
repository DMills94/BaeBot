const functions = require('./exportFunctions.js')
const Discord = require('discord.js')
const icons = require('../tournaments.json')
const { prefix, baeID } = require('../config.json')

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

        try {
            const embed = new Discord.RichEmbed()
            const argsSplit = args.split(' ')
            let mpId
            let mpUrl
            let warmups = 0
            let bans = 2
            let teams = 2
            let team1
            let team2
            let team1Bans = []
            let team2Bans = []
            let rolls = 2
            let team1Roll
            let team2Roll
            let title = ''
            let firstPick = 0 // Defaults to RED
            let bestOf = false

            for (let arg in argsSplit) {
                const a = argsSplit[arg]
                if (a.match(/https?:\/\/(osu|new).ppy.sh\/community\/matches\//i) || a.match(/https?:\/\/(osu|new).ppy.sh\/mp\//i)) {
                    mpUrl = a
                    mpId = a.split('/').slice(-1)[0]
                }
                else if (a.startsWith('w:')) {
                    warmups = +a.slice(2)
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
                else if (a.startsWith('bo:')) {
                    bestOf = +a.slice(3)
                }
                else if (a.startsWith('t:')) {
                    if (teams === 4)
                        continue
                    teams % 2 === 0
                        ? team1 = a.slice(2).replace('_', ' ')
                        : team2 = a.slice(2).replace('_', ' ')
                    teams++
                }
                else {
                    title += ` ${a}`
                }
            }

            const mpData = await functions.getMultiplayer(mpId)

            if (!mpData.match) {
                message.edit('Hmm, seems this match dosen\'t exist 🤔')
                return message.delete(10000)
            }

            if (mpData.games.length === 0) {
                message.edit('MP detected! But it seems no maps have been played yet 😴')
                return message.delete(10000) 
            }

            const lobbyInfo = mpData.match

            // Check lobby name is in the correct format
            const correctFormat = lobbyInfo.name.split(':')[1] !== undefined && lobbyInfo.name.split(':')[1].split('vs')[1] !== undefined
            const tournament = correctFormat ? lobbyInfo.name.split(':')[0] : ''
            if (!team1 && !team2) {
                team1 = lobbyInfo.name.split('vs')[0].match(/\(([^)]+)\)/)[1]
                team2 = lobbyInfo.name.split('vs')[1].match(/\(([^)]+)\)/)[1]
            }

            let maps = mpData.games.filter(map => {
                return map.end_time
            }).slice(warmups) // Account for warmups and remove aborted maps
            let mapsProcessed = 0
            let team1DescriptionText = ''
            let team2DescriptionText = ''
            let h2h = false
            let team1UserInfo, team2UserInfo
            
            if (!team1 || !team2) {
                message.edit('I was unable to read that MP succesfully 🤷‍. If it was a tournament match, it likely does not follow the standard format: \`TOURNAMENT_CODE: (Team1) vs (Team2)\`')
                return message.delete(10000)
            }

            // Check for 1v1 and account for incorrect slots
            if (maps[0].team_type === '0') {// Head2Head
                h2h = true
                team1UserInfo = await functions.getUser(team1)
                team2UserInfo = await functions.getUser(team2)
            }

            if (team1Roll) {
                team1DescriptionText += `__Roll:__ ${team1Roll}`
                team2DescriptionText += `__Roll:__ ${team2Roll}`
            }

            if (team1Bans.length > 0) {
                team1DescriptionText += `${!!team1DescriptionText ? ' - ' : ''} __Ban(s):__ ${team1Bans.join(', ').toUpperCase()}`
                team2DescriptionText += `${!!team2DescriptionText ? ' - ' : ''} __Ban(s):__ ${team2Bans.join(', ').toUpperCase()}`
            }

            if (!!team1DescriptionText || !!team2DescriptionText)
                embed.setDescription(`**${team1}** | | ${team1DescriptionText}\n**${team2}** | | ${team2DescriptionText}`)

            let team1Score = 0, team2Score = 0, MVP, team1Total, team2Total
            for (let [index, map] of maps.entries()) {
                MVP = {score: 0, player: ''}, team1Total = 0, team2Total = 0 //Reset map specific stats            
                const scores = map.scores
                const beatmapInfo = (await functions.getBeatmap(map.beatmap_id))[0]
                let freemod = false
                let mods = map.mods

                for (let s in scores) {
                    const score = scores[s]

                    if (!h2h){
                        score.team === '1'
                            ? team1Total += Number(score.score)
                            : team2Total += Number(score.score)
                    }
                    else {
                        // Don't count if score if player in H2H doesn't match a name in the lobby title
                        if (score.user_id !== team1UserInfo.user_id && score.user_id !== team2UserInfo.user_id)
                            continue

                        score.user_id === team1UserInfo.user_id // Score is for team 1
                            ? team1Total += Number(score.score)
                            : team2Total += Number(score.score)

                    }
                    

                    if (score.enabled_mods !== mods && score.enabled_mods !== null) {
                        freemod = true
                        mods = '[FM]'
                    }

                    if (Number(score.score) > MVP.score)
                        MVP = {score: score.score, player: score.user_id}
                }


                const MVPInfo = h2h ? null : await functions.getUser(MVP.player)

                if (!freemod) {
                    mods = functions.determineMods(map.mods) !== ''
                        ? `[${functions.determineMods(map.mods).slice(1)}]`
                        : '[NM]'
                }

                const pickText = bestOf
                    ? index + 1 === bestOf
                        ? `️🔺 **__Tiebreaker__**`
                        : `${(index + 1) % 2 === firstPick ? '🔹' : '🔸'}Pick #${index + 1} by __${(index + 1) % 2 === firstPick ? team2 : team1}__`
                    : `${(index + 1) % 2 === firstPick ? '🔹' : '🔸'}Pick #${index + 1} by __${(index + 1) % 2 === firstPick ? team2 : team1}__`

                try {
                    if (team1Total !== team2Total) {
                        embed
                            .addField(
                                `${pickText}   ${mods}`,
                                `${!beatmapInfo
                                    ? `Deleted beatmap`
                                    : `**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`}
    __${team1Total > team2Total ? team1 : team2} (${Math.max(team1Total, team2Total).toLocaleString('en')})__ wins by **${team1Total > team2Total ? (team1Total - team2Total).toLocaleString() : (team2Total - team1Total).toLocaleString()}** ${h2h ? '' : `\nMVP: \:flag_${MVPInfo.country.toLowerCase()}: [${MVPInfo.username}](https://osu.ppy.sh/users/${MVPInfo.user_id}) (${Number(MVP.score).toLocaleString('en')})`}`
                            )
                    }
                    else {
                        embed
                            .addField(
                                `${pickText}   ${mods}`,
                                `${!beatmapInfo
                                    ? `Deleted beatmap`
                                    : `**[${beatmapInfo.artist} - ${beatmapInfo.title} [${beatmapInfo.version}]](https://osu.ppy.sh/b/${beatmapInfo.beatmap_id})**`}
    Map was a **DRAW!** (${Math.max(team1Total, team2Total).toLocaleString('en')}) ${h2h ? '' : `|| MVP: \:flag_${MVPInfo.country.toLowerCase()}: [${MVPInfo.username}](https://osu.ppy.sh/users/${MVPInfo.user_id}) (${Number(MVP.score).toLocaleString('en')})`}`
                            )           
                    }  
                }
                catch(err) {
                    message.edit(`Oh no, seems this MP has too many maps for the embed to handle 😭 This is a limitation for now, but we'll improve. Promise!`)
                    return message.delete(10000)
                }
                
                if (team1Total !== team2Total)
                    team1Total > team2Total ? team1Score++ : team2Score++ 

                mapsProcessed++

                if (mapsProcessed === maps.length || team1Score * 2 - 1 === bestOf || team2Score * 2 - 1 === bestOf) {
                    embed
                        .setAuthor(`${correctFormat ? lobbyInfo.name : `${team1} vs ${team2}`}`, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png', mpUrl)
                        .setTitle(`__Match score__\n${team1Score > team2Score
                            ? `${h2h ? `\:flag_${team1UserInfo.country.toLowerCase()}:` : ''} \`${team1.padEnd(Math.max(team1.length, team2.length), ' ')} -\`  **${team1Score}** 🏆\n${h2h ? `\:flag_${team2UserInfo.country.toLowerCase()}:` : ''} \`${team2.padEnd(Math.max(team1.length, team2.length), ' ')} -\`  ${team2Score}`
                            : `${h2h ? `\:flag_${team1UserInfo.country.toLowerCase()}:` : ''} \`${team1.padEnd(Math.max(team1.length, team2.length), ' ')} -\`  ${team1Score}\n${h2h ? `\:flag_${team2UserInfo.country.toLowerCase()}:` : ''} \`${team2.padEnd(Math.max(team1.length, team2.length), ' ')} -\`  **${team2Score}** 🏆`
                        }`)
                        .setThumbnail(icons[tournament] ? icons[tournament] : 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Osu%21Logo_%282015%29.png')
                        .setFooter(`For the MP template, type [[ ${prefix}mp ]] || Made a mistake? Type [[ ${prefix}mp -delete ]]`)

                        setTimeout(() => {
                            embed.setFooter(`I don't accept that ${team1Score > team2Score ? team1 : team2} has won against me.`)
                            message.edit(`${title.slice(1).toUpperCase()}\n<${mpUrl}>`, { embed })
                        }, 10000);

                        message.edit(`${title.slice(1).toUpperCase()}\n<${mpUrl}>`, { embed })
                            .catch(() => {
                                message.edit(`Oh no, something went wrong 😭 try again or contact @Bae#3308`)
                            })
                        return m.delete()
                            .catch(() => {
                                m.author.send(`Psst, I can delete your multiplayer results post format message, but I need the __Manage Messages__ role in the channel! Please contact the server owner to give me that 😄`)
                            })
                }
            }
        }   
        catch(err) {
            functions.handleError(err, m, message)
        }
    }
}