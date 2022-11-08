var REQCOUNT = 0



async function getFreeStorage(){
    return `1tb`
}
async function getReqCount(){return REQCOUNT}


module.exports = {getFreeStorage, getReqCount}