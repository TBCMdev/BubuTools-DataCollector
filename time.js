class NFTTime{
    _num = 0
    timeSetting = "h"
    constructor(num, timeSetting){
        this.num = num
        this.timeSetting = timeSetting
    }
    getNum(){return this._num}
    getTimeSetting(){return this.timeSetting}
}

module.exports = {NFTTime}
