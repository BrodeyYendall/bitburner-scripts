export function calculate(ns, contractData) {
    let currentMax = Number.MIN_VALUE;
    let currentMin = contractData[0];
    for (let i = 1; i < contractData.length; i++) {
        let profit = contractData[i] - currentMin;
        if (profit > currentMax) {
            currentMax = profit;
        }

        if (contractData[i] < currentMin) {
            currentMin = contractData[i];
        }
    }
    return currentMax;
}