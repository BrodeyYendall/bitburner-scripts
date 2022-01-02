export function calculate(ns, contractData) {
    let factors = getFactors(contractData)
    // ns.tprint(factors);

    let largestFactor = Number.MIN_VALUE;
    for (let factor of factors) {
        let subFactors = getFactors(factor, true);
        if (subFactors.length === 0) {
            largestFactor = factor;
        }
    }

    return largestFactor;
}

export function getFactors(number, filterObvious = false) {
    let factors = [];
    for (let i = 1; i <= number; i++) {
        if (number % i === 0) {
            if (filterObvious && (i === 1 || i === number)) {
                continue;
            }
            factors.push(i)
        }
    }
    return factors;
}