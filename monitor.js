const api = require('./internal')
const aapi = require('./internal-a')
const { DelayCallIterator, WhileDelayCallIterator } = require('./interval')
const addSummary = require('.')
const { MintDataCollHandler } = require('./database')
const cron = require('node-cron')
const fs = require('fs').promises
async function __monitorPopularCollections() {
    console.log('SCHEDULING EVERY DAY TO CLEAR...')
    cron.schedule('0,59 0,59 23 * * * *', MintDataCollHandler.cleanMints)
    const COLLS = []
    
    const MAX_CONTENDERS = 200
    
    await MintDataCollHandler.cleanMints() // clear all mint data


    function overthrowColl(a) {
        for (const x of COLLS) {
            if (x.count < a.count) {

                const ind = COLLS.indexOf(x)

                COLLS[ind] = a
                return true
            }
        }
        return false
    }
    function hasColl(x) {
        for (var y = 0; y < COLLS.length; y++) {
            if (COLLS[y].hash == x) {
                return [true, COLLS[y]]
            }
        }
        return [false, null]
    }
    function hasMint(m) {
        for (const x of COLLS) {
            for (const y of x.mintData.mints) {
                if (m == x[2]) return true;
            }
        }
        return false
    }
    function removeDuplicateMints(obj) {
        let result = []
        obj.mints.forEach((item, index) => { if (obj.mints.indexOf(item) == index) result.push(item) });
        obj.mints = result
        obj.count = result.length
        for (const x of COLLS) {
            for (const y of x.mintData.mints) {
                for (const z of obj.mints) {
                    if (y == z[2]) {
                        console.log(`found duplicate mint: ${y} : ${z[2]}. count = ${obj.count - 1}`)
                        obj.mints = obj.mints.splice(mints.indexOf(z), 1)
                        obj.count -= 1
                    }
                }
            }
        }
        return [obj.mints, obj.count]
    }
    function getMints() {
        const _ = []

        for (const x of COLLS) {
            for (const y of x.mints) {
                _.push(y[2])
            }
        }
        return _
    }
    WhileDelayCallIterator(30000, async (iterations) => {
        try{
        const res = await api.getCollectionMints([], {
            fromDate: new Date(), debug: true, perMint: (mint, exists) => {
                if (exists) return false
                return !hasMint(mint)
            }
        })
        //{count: num, info: arr}
        for (const x of res) {
            const [has, index] = hasColl(x.coll)
            const [cleanedMints, cleanedCount] = removeDuplicateMints(x)
            x.mints = cleanedMints
            console.log(x.coll)
            console.log(x.mints)
            x.count = cleanedCount
            if (has) {
                COLLS.at(index).mintData.count += x.count;
                COLLS.at(index).mintData.mints = COLLS.at(index).mintData.mints.concat(x.mints)
            }
            else if ((COLLS.length + 1 <= MAX_CONTENDERS)) {
                const collHash = x.coll
                delete x.coll
                COLLS.push({ hash: collHash, mintData: x, salesData: { all: (await api.getCollectionTransferCount(collHash)) }, collData: (await aapi.getCollectionMetadata(collHash)) });
            } else {
                overthrowColl(x.coll)
            }
            COLLS.sort((a, b) => {
                if (a.count < b.count) return 1;
                else if (a.count > b.count) return -1;


                return 0;
            })
        }
        console.table(COLLS)
        for (const x of COLLS) {
            const saved = await MintDataCollHandler.saveOrCreateMint({hash: x.hash, name: x.collData.contractMetadata.name, mintData: {mints: x.mintData.mints, count: x.mintData.count}, collData: x.collData.contractMetadata})
            if(!saved){
                console.log(`COULD NOT SAVE: ${x}`)
            }
        }
        return false;
    }catch{
        console.log("ERR: RATE LIMIT EXCEEDED... retrying...")
        await (async () => {return new Promise(res => setTimeout(res, 5000))})()
    }
    }, { iterateStart: true })
}

module.exports = { __monitorPopularCollections }