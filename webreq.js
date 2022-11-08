const axios = require('axios')

axios.defaults.timeout = 5000



async function getWebTransfersFromToBlock(cursor = null){
    return new Promise((res) => {
        const options = {
            method: 'GET',
            url: 'https://deep-index.moralis.io/api/v2/nft/transfers',
            params: { chain: 'eth', from_date: new Date().toISOString(), format: 'decimal' },
            headers: { accept: 'application/json', 'X-API-Key': 'kwsUNnLG1hRs0KXJerde4CQmTcMU6d3PzR22j52nTkWDGiro9JuoszUsN1NXo343', cursor: cursor ?? "" }
        };
        
        axios
            .request(options)
            .then(async function (response) {
                if(response.data.message == 'Rate limit exceeded.') res(null)
                if(response.data.cursor == null) res(response.data)
                else {
                    response.data.result = response.data.result.concat((await getWebTransfersFromToBlock(response.data.cursor)).result)
                    res(response.data)
                }
            })
            .catch(function (error) {
                console.error(error);
                res([])
            });
    })
}

module.exports = {getWebTransfersFromToBlock}