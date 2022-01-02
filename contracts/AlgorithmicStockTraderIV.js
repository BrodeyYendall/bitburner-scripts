export async function calculate(ns, contractData, k) {
    var possibleMins = [0];
    var profits = [];

    // Just go through the array and record where profits are made, then get the top k profits

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

    // var profitsUsed = new Array();
    // var maxProfit = Number.MIN_VALUE;

    // recursiveFindPossibleProfitCombos(profitsUsed);

    // for(var profit of profits) {
    // 	profitsInTotal.push(profit);
    // 	for(var i = 2; i <= k - 1; i++) {
    // 		var newSubProfit = false;
    // 		for(var subProfit of profits) {
    // 			if(!profitsInTotal.includes(subProfit)) {

    // 				var canAddSubProfit = true
    // 				var subTotal = 0;
    // 				for(var currentProfits of profitsInTotal) {
    // 					if(subProfit.maxIndex < currentProfits.minIndex || subProfit.minIndex > currentProfits.maxIndex) {
    // 						subTotal += currentProfits.profit;
    // 					} else {
    // 						canAddSubProfit = false;
    // 						break;
    // 					}
    // 				}

    // 				if(canAddSubProfit) {
    // 					profitsInTotal.push(subProfit);

    // 					if(subTotal + subProfit.profit > maxProfit) {
    // 						maxProfit = subTotal + subProfit.profit;
    // 					}
    // 					newSubProfit = true;
    // 					break;
    // 				}
    // 			}

    // 		}

    // 		if(!newSubProfit) {
    // 			ns.tprint("Stopped at " + i);
    // 			i = k;
    // 		}
    // 	}
    // }

    // for(var i = 1; i <= k; i++) {
    // 	for(var profit of profits) {
    // 		if(profitsInTotal.length === 0) {
    // 			profitsInTotal.push(profit);

    // 			if(profit.profit > maxProfit) {
    // 				maxProfit = profit.profit;
    // 			}
    // 		} else {
    // 			var newSubProfit = false;
    // 			for(var subProfit of profitsInTotal) {
    // 				if(subProfit.maxIndex < profit.minIndex || subProfit.minIndex > profit.maxIndex) {
    // 					var profit = subProfit.profit + profit.profit;

    // 					profitsInTotal.push(subProfit);

    // 					if(profit > maxProfit) {
    // 						maxProfit = profit;
    // 					}

    // 					newSubProfit = true;

    // 					break;
    // 				}
    // 			}

    // 			if(newSubProfit) {
    // 				break;
    // 			}
    // 		}
    // 	}
    // }

    var maxProfit = Number.MIN_VALUE;
    var toVisit = new Array(new Array());
    for(var i = 0; i < toVisit.length; i++) {
        var total = 0;
        for(var profit of toVisit[i]) {
            total += profit.profit;
        }

        if(total > maxProfit) {
            maxProfit = total;
        }

        ns.tprint(`${toVisit[i].length}: [${JSON.stringify(toVisit[i])}]`);
        if(toVisit[i].length < k) {
            for(profit of profits) {
                // if compatiable
                if(toVisit[i].includes(profit) || !profitIsCompatible(toVisit[i], profit)) {
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

function recursiveFindPossibleProfitCombos(profitsUsed) {
    var total = 0;
    for(var profit of profitsUsed) {
        total += profit.profit;
    }

    if(total > maxProfit) {
        maxProfit = total;
    }

    if(profitsUsed.length < allowedProfits) {
        for(profit of profits) {
            // if compatiable
            if(profitsUsed.includes(profit) || !profitIsCompatible(profitsUsed, profit)) {
                continue;
            }

            var profitsUsedCopy = JSON.parse(JSON.stringify(profitsUsed));
            profitsUsedCopy.push(profit);
            recursiveFindPossibleProfitCombos(profitsUsed);

        }
    }
}

function profitIsCompatible(profitsUsed, profitToAdd) {
    for(var profit of profitsUsed) {

        // Check if the minIndex or maxIndex are in the middle of the profit (therefor they overlap)
        if((profitToAdd.minIndex >= profit.minIndex && profitToAdd.minIndex <= profit.maxIndex) ||
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