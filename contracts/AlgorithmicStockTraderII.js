export function calculate(ns, contractData) {
    let totalProfit = 0;
    let currentMin = contractData[0];
    let previousValue = contractData[0];
    for (let i = 1; i < contractData.length; i++) {
        if (contractData[i] < previousValue) {
            if (currentMin < previousValue) {
                let profit = previousValue - currentMin;
                totalProfit += profit;
            }
            currentMin = contractData[i];
        }
        previousValue = contractData[i];
    }

    if (currentMin < previousValue) {
        let profit = previousValue - currentMin;
        totalProfit += profit;
    }

    return totalProfit;
}