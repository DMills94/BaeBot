const { prefix } = require('../config.json')

module.exports = {
    name: 'mp',
    description: 'MP result help command',
    async execute(m, args) {
        let deleteMessage = true

        if (args[0] === '-save') {
            deleteMessage = false
        }

        // Holy shit not allowing indenting is toxic
        const message = await m.channel.send(`
**Example**
\`https://osu.ppy.sh/community/matches/50005504 w:2 bo:9 b:hr1 b:dt2 b:nm1 b:nm2 r:99 r:55 fp:1 grand finals xx\`

__**Breakdown**__
*NB: **TEAM 1** IS RED 🔴, **TEAM 2** IS BLUE 🔵 (As it appears on the MP / Lobby team order)*
        
**URL** - MP url, derr
**w:[number]** - Number of warmups to include, default: \`0\`!
**bo:[number]** - Match is a best of [number]
**b:[text]** - include as many of these as there are bans. Order alternates, eg. the example has TEAM 1 banning \`HR1, NM1\`
**r:[number]** - same as bans, first __r:[number]__ is **Team 1**, second is Team 2
**fp:[number]** - Indicate which team picks first, \`1 (red)\` or \`2 (blue)\`!
The rest of the text makes up the TITLE, add the match ID on the end!

Any feedback, or suggestions. Message @Bae#3308 on Discord!
${deleteMessage ? `This message will delete itself in 1 minute to save space! Type \`${prefix}mp -save\` to stop this! (For pinning, etc)` : ''}
        `)

        if (deleteMessage)
            message.delete(60000)

        m.delete()
            .catch(() => {
                m.author.send(`Psst, I can delete your \`${prefix}mp\` message but I need the __Manage Messages__ role in the channel! Please contact the server owner to give me that 😄`)
            })
    }
}
  