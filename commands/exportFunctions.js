const Discord = require('discord.js')
const axios = require('axios')
const { osuApiKey, logChannel, trackChannel } = require('../config.json')
const ojsama = require('ojsama')

axios.defaults.baseURL = 'https://osu.ppy.sh/'

let customExports = module.exports = {}

customExports.getUser = (userId) => {
    return new Promise(resolve => {
        axios.get('api/get_user', {
            params: {
                k: osuApiKey,
                u: userId
            }
        })
            .then(resp => {
                resolve(resp.data[0])
            })
    })
}

customExports.getUserTop = (userId, limit = 100) => {
    return new Promise(resolve => {
        axios.get('api/get_user_best', {
            params: {
                k: osuApiKey,
                u: userId,
                limit: limit
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
            .catch(err => {
                console.error(err)
            })
    })
}

customExports.getBeatmap = (bmpId, type = 'b') => {
    return new Promise(resolve => {
        axios.get('api/get_beatmaps', {
            params: {
                k: osuApiKey,
                [type]: bmpId
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.getUserRecent = (username, limit = 10) => {

    return new Promise(resolve => {
        axios.get('api/get_user_recent', {
            params: {
                k: osuApiKey,
                u: username,
                limit: limit
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.checkMapRank = (score, beatmapid) => {
    return new Promise(resolve => {
        axios.get('api/get_scores', {
            params: {
                k: osuApiKey,
                b: beatmapid,
                limit: 100
            }
        })
            .then(resp => {
                const scores = resp.data
                for (let player in scores) {
                    if (scores[player].date === score.date || Date.parse(scores[player].date) + 3600000 === score.date) {
                        return resolve(Number(player) + 1)
                    }
                }

                resolve(false)
            })
    })
}

customExports.getScores = (bmpId, username) => {
    return new Promise(resolve => {
        axios.get('api/get_scores', {
            params: {
                k: osuApiKey,
                u: username,
                b: bmpId
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.getMultiplayer = id => {
    return new Promise(resolve => {
        axios.get('api/get_match', {
            params: {
                k: osuApiKey,
                mp: id
            }
        })
            .then(resp => {
                resolve(resp.data)
            })
    })
}

customExports.determineMods = modVal => {
    let mods = ''
    if (modVal === '0') {
        return mods = ''
    } else {
        for (let mod in modnames) {
            if (modVal & modnames[mod].val) {
                mods += modnames[mod].short
            }
        }

        if (mods.includes('NC')) {
            mods = mods.replace('DT', '')
        }

        return `+${mods}`
    }
}

customExports.modsToBitNum = mods => {
    let bitNumValue = 0
    mods = mods.toLowerCase()
    if (mods === 'mods') {
        return 'mods'
    }
    else if (mods === 'nomod' || mods === '') {
        return 0
    }
    else {
        const modsSplit = mods.match(/[\s\S]{1,2}/g)
        for (let mod in modsSplit) {
            for (let obj in modnames) {
                if (!['hd', 'hr', 'dt', 'nc', 'so', 'nf', 'fl', 'ht', 'ez'].includes(modsSplit[mod])) {
                    return 'invalid'
                }

                if (modsSplit[mod] === modnames[obj].short.toLowerCase()) {
                    bitNumValue += modnames[obj].val
                    break
                }
            }
        }
    }

    return `${bitNumValue}`
}

customExports.determineAcc = score => {
    const userAcc = (parseInt(score.count300) * 300 + parseInt(score.count100) * 100 + parseInt(score.count50) * 50) / ((parseInt(score.count300) + parseInt(score.count100) + parseInt(score.count50) + parseInt(score.countmiss)) * 300) * 100
    return userAcc.toFixed(2).toString()
}

customExports.timeDifference = (current, previous) => {
    const msPerMinute = 60 * 1000 //60,000
    const msPerHour = msPerMinute * 60 //3,600,000
    const msPerDay = msPerHour * 24 //86,400,000
    const msPerYear = msPerDay * 365

    let elapsed = current - previous
    let time

    if (elapsed < msPerMinute) {
        time = Math.round(elapsed / 1000)
        return `${time} ${time > 1 ? 'seconds ago' : 'second ago'}`
    } else if (elapsed < msPerHour) {
        time = Math.round(elapsed / msPerMinute)
        return `${time} ${time > 1 ? ' minutes ago' : 'minute ago'}`
    } else if (elapsed < msPerDay) {
        time = Math.round(elapsed / msPerHour)
        return `${time} ${time > 1 ? 'hours ago' : 'hour ago'}`
    } else if (elapsed < msPerYear) {
        time = Math.round(elapsed / msPerDay)
        return `${time} ${time > 1 ? 'days ago' : 'day ago'}`
    } else {
        time = Math.round(elapsed / msPerYear)
        return `${time} ${time > 1 ? 'years ago' : 'year ago'}`
    }
}

customExports.approvedStatus = value => {
    switch(value) {
        case '-2':
            return 'Graveyard'
        case '-1':
            return 'WIP'
        case '0':
            return 'Pending'
        case '1':
            return 'Ranked'
        case '2':
            return 'Approved'
        case '3':
            return 'Qualified'
        case '4':
            return 'Loved'
        default:
            return value
    }
}

customExports.difficultyImage = (stars, emojis) => {
    let diffImage

    if (stars < 2)
        diffImage = emojis.find('name', 'Easy')
    else if (stars < 2.7)
        diffImage = emojis.find('name', 'Normal')
    else if (stars < 4)
        diffImage = emojis.find('name', 'Hard')
    else if (stars < 5.3)
        diffImage = emojis.find('name', 'Insane')
    else if (stars < 6.5)
        diffImage = emojis.find('name', 'Expert')
    else
        diffImage = emojis.find('name', 'ExpertPlus')

    return diffImage
}

customExports.calculate = (beatmap, performance) => {
    return new Promise(resolve => {

        let cleanBeatmap
        let results = {}

        axios.get(`osu/${beatmap.beatmap_id}`, {
            params: {
                credentials: 'include'
            }
        })
            .then(resp => {
                return resp.data
            })
            .then(raw => new ojsama.parser().feed(raw))
            .then(({map}) => {
                cleanBeatmap = map
                const usedMods = ojsama.modbits.from_string(performance.enabled_mods)

                const stars = new ojsama.diff().calc({map: cleanBeatmap, mods: usedMods})
                const combo = parseInt(performance.maxcombo)
                const nmiss = parseInt(performance.countmiss)
                const acc_percent = parseFloat(performance.accuracy)

                const recentPP = ojsama.ppv2({
                    stars: stars,
                    combo: combo,
                    nmiss: nmiss,
                    acc_percent: acc_percent
                })

                const maxPP = ojsama.ppv2({
                    stars: stars
                })

                results.formattedStars = stars.toLocaleString('en', { maximumFractionDigits: 2 }).split(' ')[0]
                results.formattedPerformancePP = recentPP.toLocaleString('en', { maximumFractionDigits: 2 }).split(' ')[0]
                results.formattedMaxPP = maxPP.toLocaleString('en', { maximumFractionDigits: 2 }).split(' ')[0]
                results.beatmapInfo = cleanBeatmap

                resolve(results)

            })
            .catch(err => {
                console.error(`There was an error! More info: + ${err}`)
            })
    })
}

customExports.logCommand = (client, message, command, type, args = []) => {
    const currentTime = new Date()
    const date = currentTime.toDateString().slice(4, 10)
    const time = currentTime.toTimeString().slice(0, 9)

    let embed = new Discord.RichEmbed()
    
    if (type === 'command') {

        embed
            .setColor('#964B00')
            .setTitle(`Command: ${command.toUpperCase()}`)
            .setThumbnail('https://cdn-images-1.medium.com/max/1600/0*FDdiWdrriXPKGNyf.png')
            .setDescription(`Executed By: **${message.author.username}#${message.author.discriminator}**`)
            .setFooter(`${date} at ${time}`, message.author.avatarURL)

        if (message.channel.guild)
            embed.setAuthor(`Server: ${message.channel.guild}`, message.channel.guild.iconURL)
        else 
            embed.setAuthor('Direct Message')

        if (args.length > 0)
            embed.addField('Arguments', args.join(' '))

        client.get(logChannel).send({ embed: embed })

    }
    else if (type === 'track') {
        embed = args
        client.get(trackChannel).send(`Posted in \`${client.get(message).guild.name}\` -> \`${client.get(message).name}\`:`, { embed: embed })
    }
    else {
        embed
            .setColor('#964B00')
            .setAuthor(`BOT HAS RESTARTED`, 'https://cdn2.iconfinder.com/data/icons/circle-icons-1/64/power-512.png')
            .setFooter(`${date} at ${time}`)
        
        client.channels.get(logChannel).send({ embed: embed })
    }

}

let modnames = [{
    val: 1,
    name: 'NoFail',
    short: 'NF'
}, {
    val: 2,
    name: 'Easy',
    short: 'EZ'
}, {
    val: 4,
    name: 'TouchDevice',
    short: 'TD'
}, {
    val: 8,
    name: 'Hidden',
    short: 'HD'
}, {
    val: 16,
    name: 'HardRock',
    short: 'HR'
}, {
    val: 32,
    name: 'SuddenDeath',
    short: 'SD'
}, {
    val: 64,
    name: 'DoubleTime',
    short: 'DT'
}, {
    val: 128,
    name: 'Relax',
    short: 'RX'
}, {
    val: 256,
    name: 'HalfTime',
    short: 'HT'
}, {
    val: 512,
    name: 'Nightcore',
    short: 'NC'
}, {
    val: 1024,
    name: 'Flashlight',
    short: 'FL'
}, {
    val: 2048,
    name: 'Autoplay',
    short: 'AT'
}, {
    val: 4096,
    name: 'SpunOut',
    short: 'SO'
}, {
    val: 8192,
    name: 'Relax2',
    short: 'AP'
}, {
    val: 16384,
    name: 'Perfect',
    short: 'PF'
}, {
    val: 32768,
    name: 'Key4',
    short: '4K'
}, {
    val: 65536,
    name: 'Key5',
    short: '5K'
}, {
    val: 131072,
    name: 'Key6',
    short: '6K'
}, {
    val: 262144,
    name: 'Key7',
    short: '7K'
}, {
    val: 524288,
    name: 'Key8',
    short: '8K'
}, {
    val: 1048576,
    name: 'FadeIn',
    short: 'FI'
}, {
    val: 2097152,
    name: 'Random',
    short: 'RD'
}, {
    val: 4194304,
    name: 'Cinema',
    short: 'CN'
}, {
    val: 16777216,
    name: 'Key9',
    short: '9K'
}, {
    val: 33554432,
    name: 'Key10',
    short: '10K'
}, {
    val: 67108864,
    name: 'Key1',
    short: '1K'
}, {
    val: 134217728,
    name: 'Key3',
    short: '3K'
}, {
    val: 268435456,
    name: 'Key2',
    short: '2K'
}]
