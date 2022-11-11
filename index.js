const { db_connect } = require('./database')
const hwnd = require('./getters')
const fs = require('fs').promises
const api = require('./internal')
const monitor = require('./monitor')
const cron = require('node-cron')
var BOT_REQUIRED = {}

var iter = 1
async function __init() {
    try {
        const x = await fs.readFile('./bot.required/required.json')
        BOT_REQUIRED = JSON.parse(x.toString())
        await db_connect()
    } catch {
        throw `Error while trying to open bot config. please specify that the file is indeed there: './bot.required/required.json'`
    }
}
async function __fetchMonitoredCollections() {

}
const on_summary = []
const addSummary = (s) => { on_summary.push(s) }
async function summary() {
    var x = `alive for ${iter / 4} minutes.\n\tstorage free on database: ${await hwnd.getFreeStorage()}\n\trequests made this session: ${await hwnd.getReqCount()}\n`

    for (const y of on_summary) {
        x.concat(y().concat("\n"))
    }

    return x;
}

async function run() {
    //main iter code here
    //monitor collections
    await __fetchMonitoredCollections()


    return new Promise(resolve => setTimeout(resolve, 15000))
}

async function collect() {
    while (true) {
        await run()
        console.log(`finished iter ${iter}. \n\t${await summary()}`)
        iter++;
    }

}
async function awaitMidnightStart() {
    var d = new Date()
    d.setHours(0,0,0,0)
    var eta_ms = d - Date.now();
    console.log("WILL RUN AT MIDNIGHT.")
    //setTimeout(monitor.__monitorPopularCollections, eta_ms);
    monitor.__monitorPopularCollections()
}

module.exports = addSummary;

console.log('initializing...')
__init().then(() => {
    console.log(`collecting data every 15 seconds, for ${BOT_REQUIRED.collections.length} collections, while also discovering new ones.`)
    console.log(new Date())
    awaitMidnightStart()

    collect()
})
