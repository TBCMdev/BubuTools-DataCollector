const mongoose = require('mongoose')
const DBAuth = "mongodb+srv://bubu-tools-admin:YqRFjlnoiFVwctZx@cluster0.70uec.mongodb.net/data?retryWrites=true&w=majority"

const MintDataSchema = new mongoose.Schema({ name: String, hash: String, data: { mints: Array, count: Number }, collData: Object }, { collection: "temporary-minting" })
const MintData = mongoose.model('MintData', MintDataSchema)

class MintDataCollHandler {
    static async cleanMints() {
        await MintData.deleteMany({})
    }

    static async saveOrCreateMint({ name = null, hash = null, mintData = { mints: [], count: 0 }, collData = {} }) {
        return new Promise(async (res) => {

            var found = await MintData.findOne({ name: name, hash: hash })
            if (found === null) {
                const Mint = new MintData({ name: name, hash: hash, data: mintData, collData: collData })

                Mint.save((err) => {
                    if (err) res(false)

                    res(true)
                })
            } else {
                await found.updateOne({ data: mintData, collData: collData })
                res(true)
            }
        })
    }
}

class DBResponse {
    pagination = {
        page: 0,
        pageSize: 0
    }
    response = {
        data: {},
        items: 0
    }

    constructor(data, pageSize, itemCount) {
        this.response.data = data
        this.pagination.pageSize = pageSize
        this.response.items = itemCount
    }
    hasNext() {
        return this.pagination.page < this.pagination.pageSize
    }
    async next() {
        page++;
        //get next

    }

}
function constructDBObject(obj) {

}

async function db_connect() {
    try {
        mongoose.connect(DBAuth, () => { console.log('connected to database.') })
        const test = new MintData({ name: "test", hash: "0x0", data: { mints: [], count: 0 }, collData: {} })
        await test.save((err) => {
            if (err) {
                console.log(err)
                return false
            }
        })
        //connect to database
        return true;
    } catch {
        return false;
    }
}
async function getCollection(addr) {
    //get collection, but see first how many of each large data type there is, for example transactions.
    //if there are more than 5000 transactions, call createPager, and set the objects pager with the response.

    const collection = null


}
module.exports = { MintDataCollHandler, db_connect, }