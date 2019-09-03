const Datastore = require('nedb')

let db = {}
db.lastBeatmap = new Datastore({ filename: './databases/stores/lastBeatmap', autoload: true })

exports.storeBeatmap = (channelid, beatmap, performance) => {

    db.lastBeatmap.find({ channelid }, (err, docs) => {
        if (err) console.error(err)
        if (docs.length < 1) { //New guild
            const beatmapObj = {
                channelid,
                beatmap: beatmap,
                performance: performance
            }

            db.lastBeatmap.insert(beatmapObj, err => {
                if (err) console.error(err)
            })
        }
        else {
            db.lastBeatmap.update({ channelid }, { $set: { beatmap, performance } }, {}, err => {
                if (err) console.error(err)
            })
        }
    })
}

exports.fetchBeatmap = channelid => {
    return new Promise(resolve => {
        db.lastBeatmap.find({ channelid }, (err, docs) => {
            if (err) resolve([])
            resolve(docs[0])
        })
    })
}