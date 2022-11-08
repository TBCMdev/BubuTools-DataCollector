const expr = require("express")
const body = require('body-parser')
const request = require("request")
const mon = require('mongoose')
const fs = require('fs')
const cors = require('cors')
const { exit } = require("process")
const cron = require('node-cron')
var app = expr()

app.use(cors())
app.use(body.json())


const VALIDATION_KEYS = []

const CONN = "mongodb+srv://BUBUAdmin:93iIMabkmnzoeid9@cluster0.i3dyu.mongodb.net/internal?retryWrites=true&w=majority"

var current_config = null
const CHECK_URLS = {
    floor_price: "https://api.modulenft.xyz/api/v1/opensea/collection/info?type=<NAME>",
    sales_vol: "url",
    sales_count: "url",
    owner_count: "url",
    paths: {
        floor_price: "/data/floor_price",
        sales_vol: "/data/sales_vol",
        sales_count: "/data/sales_count",
        owner_count: "/data/owner_count",
    }
}
const config_defaults = {
    max_saves: {
        floor_price: "1m",
        sales_vol: "1m",
        sales_count: "1m",
        owner_count: "1m"
    }, interval_check: {
        floor_price: "1h",
        sales_vol: "1d",
        sales_count: "1d",
        owner_count: "1d"
    }
}

mon.connect(CONN)


const mon_config = mon.model('config', { max_saves: Object, interval_check: Object })
const mon_collection = mon.model('data', { name: String, id: String, data: Object, following: Boolean })
async function reloadConfig() {
    current_config = await mon_config.findOne({})
}
async function checkConfig() {
    await new Promise(async (reject, resolve) => {
        mon_config.count(async function (err, count) {
            if (err) { console.log(`[ERROR] parent err: ${err}`); reject(err) }


            if (count == 0) {
                console.log("no config file was present. creating new...")
                await new Promise(async (res, rej) => {
                    mon_config.create(config_defaults, function (err, s) {
                        if (err) {
                            console.log(`[ERR] err: ${err}`)
                            rej(err)
                        }

                        console.log("default config file saved to database.")
                        current_config = config_defaults
                        res()
                    })
                })
            }else{
                console.log('count is greater than 1.')
            }
            current_config = await mon_config.findOne({})
            console.log(`found config: ${current_config}`)
        })
        resolve()

    }).catch(err =>{
        console.log(`[ERR] ${err}`)
    })
}
async function getFloorPrice(name) {
    const coll = await mon_collection.findOne({ name: name })

    if (!coll || coll == null) return false

}
async function startTimers() {

    /*const cont = JSON.parse(await fs.readFile('./tasks.json'))
    for(const x of cont){
        if(cont.dates == []) continue;

        for(const y of cont.dates){
            var z = Date.parse(y[1])
            console.log('parsed date:' + z)

        }
    }*/

    const allCollections = await mon_collection.find()
    Object.keys(current_config.interval_check).forEach((key) => {
        const [num, selector] = convertTimeStr(current_config.interval_check[key])

        const url = CHECK_URLS[key]

        for (const x of allCollections) {
            console.log(`checking collection: ${x}`)
            if (!x.following) continue;
            console.log(`SCHEDULING: ${SelectionToCronStr(num, selector)}`)
            cron.schedule(SelectionToCronStr(num, selector), () => {
                console.log(`[DEBUG] STARTING TASK...`)

                request(url.replace("<NAME>", x.name), function (err, res, body) {
                    if (err) return console.log(err)

                    console.log(`[DEBUG] RECIEVED RESPONSE: ${res}`)

                    const z = CHECK_URLS.paths[key].split('/')

                    console.log(`[DEBUG] parsed array: ${x}`)
                    var recr = JSON.parse(res)
                    for (const y of z) {
                        recr = recr[y]
                    }
                    console.log(`[DEBUG] found val: ${recr}`)
                })
            })
        }
    })

}
async function init() {
    await checkConfig()
    await reloadConfig()
    await startTimers()
}


fs.readFile('keys.txt', (err, file) => {

    if (err) throw err;

    file.toString().split('\n').forEach(line => {
        VALIDATION_KEYS.push(line.replace("\r", ""));

    });
});

const names = ["floor_price", "sales_vol", "sales_count", "owner_count"]
function SelectionToCronStr(num, selection) {
    console.log('parsing:' + num + ", " + selection)
    switch (selection) {
        case 0:
            return `*/${num} * * * *`
        case 1:
            return `0 */${num} * * *`
        case 2:
            return `0 0 */${num} * *`
        case 3:
            return `0 0 0 */${num} *`
        default:
           console.log(`${num} and ${selection} is not valid.`)
    }
}
async function validateIntervalParameters(name, dur) {
    if (!names.includes(name)) return false

    //m, h, d, mo
    var hasNum = false
    for (var i = 0; i < dur.length; i++) {
        if (isNaN(dur[i]) && !hasNum) return false
        if (!isNaN(dur[i])) hasNum = true
        if (hasNum && isNaN(dur[i]) && (!['m', 'h', 'd', 'o'].includes(dur[i]))) return false
    }
    console.log(`${dur} is a valid time str`)
    return true
}
const timeSelection = {
    MIN: 0,
    HOUR: 1,
    DAY: 2,
    MONTH: 3
}
function convertTimeStr(time) {
    var hasNum = false
    var hasChar = false
    var selector = -1

    var number = ""
    for (var i = 0; i < time.length; i++) {
        if (isNaN(time[i]) && !hasNum) return [null, null]
        if (!isNaN(time[i])) {
            number += time[i]
            hasNum = true
        }
        if (!hasChar) {
            if (hasNum && isNaN(time[i]) && (!['m', 'h', 'd'].includes(time[i]))) return [null, null]
            else if (hasNum && isNaN(time[i])) {
                hasChar = true
                switch (time[i]) {
                    case 'm':
                        selector = timeSelection.MIN
                    case 'd':
                        selector = timeSelection.DAY
                    case 'h':
                        selector = timeSelection.HOUR
                }
            }
        } else {
            if (time[i] == 'o') selector = timeSelection.MONTH
        }
    }
    if (selector == -1) return [null, null]
    return [number, selector]
}
async function updateIntervalConfig(name, dur) {
    current_config["interval_check"][name] = dur



    mon_config.updateOne({}, current_config, function (err) {
        if (err) console.log(`err while updating conf: ${err}`)

        console.log("updated config.")
    })
}
app.get('/', async (req, res) => {
    res.render('./web/main.html')
})
app.get('/validate/:apiKey?', (req, res) => {
    if (!req.params.apiKey) return res.json({ success: false })

    console.log(`${req.params.apiKey} in VALIDATION_KEYS? ${VALIDATION_KEYS.includes(req.params.apiKey)}`)

    return res.json({ success: (VALIDATION_KEYS.includes(req.params.apiKey)) })
})

app.get('/config/interval/:name/:duration/:authKey', async (req, res) => {
    if (!VALIDATION_KEYS.includes(req.params.authKey)) return res.json({ success: false, authorized: false })
    if (!req.params.name || !req.params.duration) return res.json({ success: false })

    if (!validateIntervalParameters(req.params.name, req.params.duration)) return res.json({ success: false })

    const [num, selector] = convertTimeStr(req.params.duration)
    if (num == null || selector == null) res.json({ success: false, reason: "invalid time string" })

    console.log(`num: ${num}, selector: ${selector}`)
    await updateIntervalConfig(req.params.name, req.params.duration)
    await startTimers() //reset the timers
    res.json({ success: true })
})

app.listen(9999, () => {
    /*mon_collection.insertMany({
        name: 'Bored Ape Yacht Club',
        id: 'null',
        data: [],
        following: true
    })*/
    console.log(`listening on port ${9999}...`)
    init()
})