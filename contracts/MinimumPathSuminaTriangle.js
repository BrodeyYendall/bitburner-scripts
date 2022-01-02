export function calculate(ns, contractData) {
    let toVisit = [new Node(0, 0, 0, null)];
    let currentBest = Number.MAX_VALUE;
    // var bestNode;

    // ns.tprint(contractData.length);
    // for(var data of contractData) {
    // 	ns.tprint(data);
    // }

    for (let i = 0; i < toVisit.length; i++) {
        if(toVisit[i].level < contractData.length) {
            // ns.tprint(`${contractData[toVisit[i].level][toVisit[i].index]} + ${toVisit[i].cost}`)
            let childCost = contractData[toVisit[i].level][toVisit[i].index] + toVisit[i].cost;
            let childLevel = toVisit[i].level + 1

            // ns.tprint(`cost: ${childCost}, level: ${childLevel}, index: ${toVisit[i].index}, parent: ${JSON.stringify(toVisit[i])}`);
            toVisit.push(new Node(childLevel, toVisit[i].index, childCost, toVisit[i]));
            toVisit.push(new Node(childLevel, toVisit[i].index + 1, childCost, toVisit[i]));
        } else {
            if(toVisit[i].cost < currentBest) {
                currentBest = toVisit[i].cost;
                // bestNode = toVisit[i];
            }
        }

        // Create next paths to go to

    }


    // var source = bestNode.source;
    // var string = "start";
    // while(source !== null) {
    // 	string = contractData[source.level][source.index] + " --> " + string;
    // 	source = source.source;
    // }
    // ns.tprint(string);

    return currentBest;
}

class Node {
    constructor(level, index, cost, source) {
        this.level = level;
        this.index = index;
        this.cost = cost;
        this.source = source;
    }
}