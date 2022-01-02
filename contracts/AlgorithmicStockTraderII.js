export function calculate(ns, contractData) {
    var totalProfit = 0;
    var currentMin = contractData[0];
    var previousValue = contractData[0];
    for(var i = 1; i < contractData.length; i++) {
        if(contractData[i] < previousValue) {
            if(currentMin < previousValue) {
                var profit = previousValue - currentMin;
                totalProfit += profit;
            }
            currentMin = contractData[i];
        }
        previousValue = contractData[i];
    }

    if(currentMin < previousValue) {
        var profit = previousValue - currentMin;
        totalProfit += profit;
    }

    return totalProfit;
}