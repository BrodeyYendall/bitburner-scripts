export function calculate(ns, contractData) {
    let possibleMins = [0];
    let profits = [];

    let previousValue = contractData[0];
    for (let i = 1; i < contractData.length; i++) {
        if (contractData[i] < previousValue) {
            for (let min of possibleMins) {
                if (contractData[min] < previousValue) {
                    profits.push(new Profit(min, i - 1, contractData));
                }
            }

        } else if (contractData[i] > previousValue) {
            possibleMins.push(i - 1);
        }
        previousValue = contractData[i];
    }

    for (var min of possibleMins) {
        if (contractData[min] < previousValue) {
            profits.push(new Profit(min, i - 1, contractData));
        }
    }

    let maxProfit = Number.MIN_VALUE;
    for (let profit of profits) {
        let currentProfit = profit;
        for (let subProfit of profits) {
            if (subProfit.maxIndex < currentProfit.minIndex || subProfit.minIndex > currentProfit.maxIndex) {
                let moneyProfit = subProfit.profit + currentProfit.profit;

                if (moneyProfit > maxProfit) {
                    maxProfit = moneyProfit;
                }
            }
        }

        if (currentProfit.profit > maxProfit) {
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