const axios = require('axios');
const { dbUrl } = require('../config.json');

const dbCall = axios.create({baseURL: dbUrl})

let customExports = module.exports = {};

customExports.lookupUser = (authorID) => {
    return new Promise((resolve, reject) => {

    let existingLink = false;
    let username;
    let linkedDB = [];

    dbCall.get('linkedUsers.json')
        .then(resp => {
            const database = resp.data;

            for (let key in resp.data) {
                linkedDB.push({
                    ...resp.data[key],
                    id: key
                })
            }

            for (let link in linkedDB) {
                if (linkedDB[link].discordID === authorID) {
                    existingLink = true;
                    username = linkedDB[link].osuName;
                }
            }

            if (existingLink) {
                resolve(username);
            }
            else {
                reject();
            }
        })
        .catch(err => console.log(err))
        })
}

customExports.storeLastBeatmapId = (guild, beatmapId) => {
    dbCall.put(`lastBeatmap/${guild.id}.json`, beatmapId)
            .then(resp => {
                console.log(`[BEATMAP ID STORED FOR ${guild.name}]: ${beatmapId}`);
            })
            .catch(err => {
                console.log("There was an error storing beatmap ID, please try again later.");
                console.log(err);
            })
};

customExports.determineMods = score => {
    if (score.enabled_mods === "0") {
        mods = "";
    } else {
        for (i = 0; i < modnames.length; i++) {
            if (score.enabled_mods & modnames[i].val) {
                mods += modnames[i].short;
            }
        }
        mods = `+${mods}`
    }
};

customExports.determineAcc = score => {
    userAcc = (parseInt(score.count300) * 300 + parseInt(score.count100) * 100 + parseInt(score.count50) * 50) / ((parseInt(score.count300) + parseInt(score.count100) + parseInt(score.count50) + parseInt(score.countmiss)) * 300) * 100;
    return userAcc.toFixed(2).toString();
};

customExports.timeDifference = (current, previous) => {
    const msPerMinute = 60 * 1000; //60,000
    const msPerHour = msPerMinute * 60; //3,600,000
    const msPerDay = msPerHour * 24; //86,400,000
    const msPerYear = msPerDay * 365;

    let elapsed = current - previous;
    let time;

    if (elapsed < msPerMinute) {
        time = Math.round(elapsed / 1000);
        return `${time} ${time > 1 ? "seconds ago" : "second ago"}`;
    } else if (elapsed < msPerHour) {
        time = Math.round(elapsed / msPerMinute);
        return `${time} ${time > 1 ?" minutes ago" : "minute ago"}`;
    } else if (elapsed < msPerDay) {
        time = Math.round(elapsed / msPerHour);
        return `${time} ${time > 1 ? "hours ago" : "hour ago"}`;
    } else if (elapsed < msPerYear) {
        time = Math.round(elapsed / msPerDay);
        return `${time} ${time > 1 ? "days ago" : "day ago"}`;
    } else {
        time = Math.round(elapsed / msPerYear);
        return `${time} ${time > 1 ? "years ago" : "year ago"}`;
    }
};



let modnames = [
    {
        val: 1,
        name: "NoFail",
        short: "NF"
    }, {
        val: 2,
        name: "Easy",
        short: "EZ"
    }, {
        val: 4,
        name: "TouchDevice",
        short: "TD"
    }, {
        val: 8,
        name: "Hidden",
        short: "HD"
    }, {
        val: 16,
        name: "HardRock",
        short: "HR"
    }, {
        val: 32,
        name: "SuddenDeath",
        short: "SD"
    }, {
        val: 64,
        name: "DoubleTime",
        short: "DT"
    }, {
        val: 128,
        name: "Relax",
        short: "RX"
    }, {
        val: 256,
        name: "HalfTime",
        short: "HT"
    }, {
        val: 512,
        name: "Nightcore",
        short: "NC"
    }, {
        val: 1024,
        name: "Flashlight",
        short: "FL"
    }, {
        val: 2048,
        name: "Autoplay",
        short: "AT"
    }, {
        val: 4096,
        name: "SpunOut",
        short: "SO"
    }, {
        val: 8192,
        name: "Relax2",
        short: "AP"
    }, {
        val: 16384,
        name: "Perfect",
        short: "PF"
    }, {
        val: 32768,
        name: "Key4",
        short: "4K"
    }, {
        val: 65536,
        name: "Key5",
        short: "5K"
    }, {
        val: 131072,
        name: "Key6",
        short: "6K"
    }, {
        val: 262144,
        name: "Key7",
        short: "7K"
    }, {
        val: 524288,
        name: "Key8",
        short: "8K"
    }, {
        val: 1048576,
        name: "FadeIn",
        short: "FI"
    }, {
        val: 2097152,
        name: "Random",
        short: "RD"
    }, {
        val: 4194304,
        name: "Cinema",
        short: "CN"
    }, {
        val: 16777216,
        name: "Key9",
        short: "9K"
    }, {
        val: 33554432,
        name: "Key10",
        short: "10K"
    }, {
        val: 67108864,
        name: "Key1",
        short: "1K"
    }, {
        val: 134217728,
        name: "Key3",
        short: "3K"
    }, {
        val: 268435456,
        name: "Key2",
        short: "2K"
    }
];
