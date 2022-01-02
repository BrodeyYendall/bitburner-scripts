export function calculate(ns, contractData) {
    var currentMax = Number.MIN_VALUE;
    var currentMin = contractData[0];
    for(var i = 1; i < contractData.length; i++) {
        var profit = contractData[i] - currentMin;
        if(profit > currentMax) {
            currentMax = profit;
        }

        if(contractData[i] < currentMin) {
            currentMin = contractData[i];
        }
    }
    return currentMax;
}