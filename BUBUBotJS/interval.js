async function delay(d){
    return await new Promise(resolve => {setTimeout(resolve, d)})
}

async function DelayCallIterator(dms, iterations, callback, ...args){
    var c = 0
    dms /= 5

    while (c <= iterations){
        await delay(dms)
        var x = await callback(args)
        c++
        if(x) return true;
    }
}   
async function WhileDelayCallIterator(dms, callback = async () => {}, {iterateStart = false}, ...args){
    var iter = 0;

    if(iterateStart) await callback(iter, args)

    while (true){
        iter++;
        await delay(dms)
        var x = await callback(iter, args)
        if(x) return true;
    }
}
module.exports = {DelayCallIterator,WhileDelayCallIterator, delay}