export async function calculate(ns, contractData, k) {
    let possibleMins = [0];
    let profits = [];

    // Just go through the array and record where profits are made, then get the top k profits

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

    for (let min of possibleMins) {
        if (contractData[min] < previousValue) {
            profits.push(new Profit(min, i - 1, contractData));
        }
    }

    let maxProfit = Number.MIN_VALUE;
    let toVisit = new Array([]);
    for (let i = 0; i < toVisit.length; i++) {
        let total = 0;
        for (let profit of toVisit[i]) {
            total += profit.profit;
        }

        if (total > maxProfit) {
            maxProfit = total;
        }

        ns.tprint(`${toVisit[i].length}: [${JSON.stringify(toVisit[i])}]`);
        if (toVisit[i].length < k) {
            for (let profit of profits) {
                // if compatiable
                if (toVisit[i].includes(profit) || !profitIsCompatible(toVisit[i], profit)) {
                    continue;
                }

                var profitsUsedCopy = JSON.parse(JSON.stringify(toVisit[i]));
                profitsUsedCopy.push(profit);
                toVisit.push(profitsUsedCopy);

            }
        }
        // ns.tprint(toVisit);
        await ns.sleep(5);
    }

    return maxProfit;
}

function profitIsCompatible(profitsUsed, profitToAdd) {
    for (let profit of profitsUsed) {

        // Check if the minIndex or maxIndex are in the middle of the profit (therefor they overlap)
        if ((profitToAdd.minIndex >= profit.minIndex && profitToAdd.minIndex <= profit.maxIndex) ||
            (profitToAdd.maxIndex >= profit.minIndex && profitToAdd.maxIndex <= profit.maxIndex)) {
            return false;
        }
    }

    return true;
}

export class Profit {
    constructor(minIndex, maxIndex, contractData) {
        this.minIndex = minIndex;
        this.maxIndex = maxIndex;
        this.profit = contractData[maxIndex] - contractData[minIndex];
    }
}