export function calculate(ns, contractData) {
    var factors = getFactors(contractData)
    // ns.tprint(factors);

    var largestFactor = Number.MIN_VALUE;
    for(var factor of factors) {
        var subFactors = getFactors(factor, true);
        if(subFactors.length === 0) {
            largestFactor = factor;
        }
    }

    return largestFactor;
}

export function getFactors(number, filterObvious = false) {
    var factors = new Array();
    for(var i = 1; i <= number; i++) {
        if(number % i === 0) {
            if(filterObvious && (i === 1 || i === number)) {
                continue;
            }
            factors.push(i)
        }
    }
    return factors;
}