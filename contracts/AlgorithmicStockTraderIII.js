export function calculate(ns, contractData) {
    var possibleMins = [0];
    var profits = [];

    var previousValue = contractData[0];
    for(var i = 1; i < contractData.length; i++) {
        if(contractData[i] < previousValue) {
            for(var min of possibleMins) {
                if(contractData[min] < previousValue) {
                    profits.push(new Profit(min, i - 1, contractData));
                }
            }

        } else if(contractData[i] > previousValue) {
            possibleMins.push(i - 1);
        }
        previousValue = contractData[i];
    }

    for(var min of possibleMins) {
        if(contractData[min] < previousValue) {
            profits.push(new Profit(min, i - 1, contractData));
        }
    }

    var maxProfit = Number.MIN_VALUE;
    for(var profit of profits) {
        var currentProfit = profit;
        for(var subProfit of profits) {
            if(subProfit.maxIndex < currentProfit.minIndex || subProfit.minIndex > currentProfit.maxIndex) {
                var profit = subProfit.profit + currentProfit.profit;

                if(profit > maxProfit) {
                    maxProfit = profit;
                }
            }
        }

        if(currentProfit.profit > maxProfit) {
            maxProfit = currentProfit.profit;
        }
    }

    return maxProfit;
}

export class Profit {
    constructor(minIndex, maxIndex, contractData) {
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;
        this.profit = contractData[maxIndex] - contractData[minIndex];
    }
}