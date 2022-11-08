const Moralis = require("moralis").default
const { EvmChain } = require('@moralisweb3/evm-utils/lib')

const ethers = require('ethers')
const webSocketExtAPI = require('./webreq')
const { NFTTime } = require('./time')
const { DelayCallIterator, WhileDelayCallIterator, delay } = require('./interval')
const e = require("cors")
const api = 'kwsUNnLG1hRs0KXJerde4CQmTcMU6d3PzR22j52nTkWDGiro9JuoszUsN1NXo343'


const WEICONVERT = 10 ** 18

async function _init() {
    await Moralis.start({ apiKey: api })
}


async function getCollectionNFTS(addr) {
    var res = await Moralis.EvmApi.nft.getContractNFTs({ address: addr, chain: EvmChain.ETHEREUM })

    var currentPage = res.pagination.page
    const nfts = res.result
    while (res.hasNext()) {
        res = await res.next()
        nfts.push(res.result)

        currentPage++;

        console.log(`getting ${currentPage}...`)
    }
    return nfts
}
async function getNFTPrice(addr, tok, { }) {
    var res = await Moralis.EvmApi.nft.getNFTTrades({ address: addr, tokenId: tok })
    return ethers.utils.formatEther(res.result[0].price.format())
}
async function getNFTTransfers(addr, tok, fromdate = null) {
    var res = undefined

    if (fromdate != null) {
        res = await Moralis.EvmApi.nft.getNFTTransfers({ address: addr, tokenId: tok, chain: EvmChain.ETHEREUM, toDate: new Date().toISOString(), fromDate: fromdate.toISOString() })
    } else {
        res = await Moralis.EvmApi.nft.getNFTTransfers({ address: addr, tokenId: tok, chtokenAddressain: EvmChain.ETHEREUM })
    }
    const y = []
    for (const x of res.result) {
        y.push([x.value.ether, x.blockTimestamp])
    }
    return y
}
/**
 * 
 * @param {Array<String>} addrs 
 * @param {Object} param1 
 */
async function getCollectionMints(addrs, { fromDate = null, chain = EvmChain.ETHEREUM, debug = true, perMint = null }) {
    var monitoredCollections = {}
    const ERROR_SLEEP_TIME = 10000
    for (const x of addrs) {
        monitoredCollections[x] = { coll: x, mints: [], count: 0 }
    }


    function hasTransaction(c, t) {
        for (const x of c.mints) {
            if (t == x[2]) return true;
        }
        return false
    }
    function hasTransactionAnywhere(t) {
        for (const x of Object.keys(monitoredCollections)) {
            for (const y of monitoredCollections[x].mints) {
                if (y[2] == t) return true
            }
        }
        return false
    }
    var res = await webSocketExtAPI.getWebTransfersFromToBlock()
    if(res == null){
        console.log(`UNEXPECTED ERROR! waiting ${ERROR_SLEEP_TIME}ms until continuing...`)
        await (async () => {
            return new Promise(res => {setTimeout(res, ERROR_SLEEP_TIME)})
        })()
        return
    }
    //if (debug && res.result.length > 0) monitoredCollections[res.result[0].token_address] = {info: [], count: 0}
    for (const x of res.result) {
        if (x.from_address != "0x0000000000000000000000000000000000000000" || x.contract_type != "ERC721" || x.token_address == x.to_address) continue;
        if (addrs.includes(x.token_address) || (addrs.length == 0)) {
            if (!Object.keys(monitoredCollections).includes(x.token_address) && (addrs.length == 0)) monitoredCollections[x.token_address] = { coll: x.token_address, mints: [], count: 0 }
            if ((perMint != null ? perMint(x.transaction_hash, hasTransactionAnywhere(x.transaction_hash)) : false)) {
                monitoredCollections[x.token_address].count += 1
                monitoredCollections[x.token_address].mints.push([x.to_address, x.token_id, x.transaction_hash, x.block_timestamp])
            }
        }
    }
    return Object.values(monitoredCollections);
}
async function getCollectionTransferCount(addr) {
    var z = await Moralis.EvmApi.nft.getNFTTrades({ address: addr, chain: EvmChain.ETHEREUM })
    return z.pagination.total
}
async function getCollectionTransfers(addr, foreachTrans = (transfers) => { }, { fromDate = null, onlyValue = true, chain = EvmChain.ETHEREUM }) {
    var res = []
    var z;
    if (fromDate != null) {
        z = await Moralis.EvmApi.nft.getNFTTrades({ address: addr, chain: chain, fromDate: fromDate.toISOString() })
    } else {
        z = await Moralis.EvmApi.nft.getNFTTrades({ address: addr, chain: chain })
    }
    console.log(z.raw.total)
    var page = z.pagination.page
    console.log('getting...')

    for (const x of z.result) {

        const _ = [x.price.format(), x.blockTimestamp, x.tokenIds, x.transactionIndex, x.blockNumber]
        res.push(_)
        foreachTrans(_)
    }

    while (true) {
        var _res = await DelayCallIterator(0, 5, async () => {
            console.log(`getting page ${page}...`)
            if (!z.hasNext()) {
                return true;
            }
            z = await z.next()
            for (const x of z.result) {
                const _ = [x.price.format(), x.blockTimestamp, x.tokenIds, x.transactionIndex, x.blockNumber]
                res.push(_)
                foreachTrans(_)
            }
            page++
        }, 10)
        if (_res) break;
    }
    res.sort((a, b) => {
        if (a[1] < b[1]) return -1;
        if (a[1] > b[1]) return 1;

        return 0;
    })
    return res;
}
async function getCollectionNFTOwnersItems(addr, { specifiedOwners = null, specifiedNFTS = null, onFound = () => { } }) {
    var ret = []

    function push(x) {
        if (x[0] == undefined) return
        for (const y in ret) {
            if (x[0] == y[0]) {
                ret[y][1]++;
                return;
            }
        }
        ret.push(x)
    }
    function strip(x) {
        var _ = [x.ownerOf, 0, x.tokenAddress, x.tokenHash, x.tokenUri, x.name]
        onFound(_)
        return _
    }

    var res = await Moralis.EvmApi.nft.getNFTOwners({ address: addr, chain: EvmChain.ETHEREUM })
    var c = 0
    do {
        await DelayCallIterator(1000, 1, async () => {
            c++
            for (const x of res.result) {
                if (specifiedOwners !== null) {
                    if (specifiedNFTS !== null) {
                        if (specifiedNFTS.includes(x.tokenAddress) && specifiedOwners.includes(x.ownerOf.lowercase)) push(strip(x))
                    } else {
                        if (specifiedOwners.includes(x.ownerOf.lowercase)) push(strip(x))
                    }
                } else if (specifiedNFTS !== null) {
                    if (specifiedNFTS.includes(x.tokenAddress)) push(strip(x))
                } else {
                    if (x.tokenAddress !== undefined) push(strip(x))
                }
            }
            console.log(`iter : ${c}`)
            res = res.hasNext() ? await res.next() : null;
        })
    } while (res !== null && res.hasNext());
    return ret;
}
/**
 * 
 * @param {String} addr 
 * @param {Object} param1 
 * @returns 
 */
async function getCollectionVolumeByTime(addr, { time = null }) {
    const date = new Date();
    var sum = 0
    await getCollectionTransfers(addr, (transfer) => {
        //console.log(`converting: ${transfer[0]} with ids of: ${transfer[2]}`)
        console.log(transfer[4])
        sum += (ethers.utils.formatEther(transfer[0]) / WEICONVERT)
        console.log([ethers.utils.formatEther(transfer[0]) / WEICONVERT, transfer[1]])
    }, { fromDate: time, onlyValue: true, chain: EvmChain.ETHEREUM })

    return sum;

}
_init();


/*getNFTTransfers('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', 172).then(x => {
    console.log(x)
})*/
/*
getCollectionVolumeByTime('0x98AB7eaaCB2f5157A40A9d1dE6C2AbD1a73ef9fa', {time: new Date(Date.now() - (86400000 * 15))}).then(x => {
    console.log(x)
})
*/

//GETS NFTS IN A COLLECTION THAT ARE FROM CERTAIN OWNERS, IF NONE ARE SUPPLIED, ALL OWNERS ARE RETURNED WITH THEIR OWNED NFT COUNT.
/*
const owners = null
getCollectionNFTOwnersItems('0xFd914a1aB6d77E8c577C6129801c5cd35042C741', {
    specifiedOwners:owners,
    onFound: (owned) => {
    }
}).then(x => {
    console.log(x)
})
*/
/*
getNFTPrice('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', 9387, {}).then(x => {
    console.log(x)
})
*/

//MONITORS A COLLECTIONS MINTS EVERY 30 SECONDS.
/*
var mints = 0
WhileDelayCallIterator(60000, async (iterations) => {
    await getCollectionMints([], {
        fromDate: new Date(), debug: true, perMint: (mint) => {
            mints++;
        }
    })
    console.log(`iteration ${iterations}, mints: ${mints}.`)
    mints = 0
    return false;
}, { iterateStart: true })
*/



/*
getCollectionTransfers('0x98AB7eaaCB2f5157A40A9d1dE6C2AbD1a73ef9fa', (transfer) => {
    console.log(transfer[0] / WEICONVERT)
}).then(e => {
    console.log(e)
})
*/
/*
getNFTPrice(undefined).then(x => {
    console.log(x)
})
*/

module.exports = {
    getCollectionNFTS, getCollectionMints, getCollectionNFTOwnersItems,
    getCollectionTransfers, getCollectionVolumeByTime, getNFTPrice,
    getNFTTransfers, getCollectionTransferCount
}