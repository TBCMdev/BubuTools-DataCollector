const request = require('request')
const settings = {
    apiKey: "jEJ_vHHOFsuM2NUr0bvIrCC0zstLIgH0"
}
function construct(url, queries) {
    var x = `${url}?`

    for (var i = 0; i < queries.length; i++) {
        if (i == queries.length - 1) x = x.concat(`${queries[i][0]}=${queries[i][1]}`)
    }
    return x;
}
async function getCollectionMetadata(addr) {
    return await new Promise((res) => {
        const url = construct(`https://eth-mainnet.g.alchemy.com/nft/v2/${settings.apiKey}/getContractMetadata`, [
            ["contractAddress", addr]
        ])
        try {
            request(url, (err, resp, body) => {
                if (err) res(null)
                const data = JSON.parse(body)
                res(data)
            })
        }catch(e){
            res({})
        }
    })
}

//TESTING
module.exports = { getCollectionMetadata }