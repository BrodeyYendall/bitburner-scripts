export function calculate(ns, contractData) {
    var m = contractData[0];
    var n = contractData[1];

    var toVisit = [new Node(0, 0)];
    var pathsFound = 0;

    for (var k = 0; k < toVisit.length; k++) {

        // Check if out of bounds
        if(toVisit[k].i >= m || toVisit[k].j >= n) {
            continue;
        }

        // Check if at the end
        if(toVisit[k].i === m - 1 && toVisit[k].j === n - 1) {
            pathsFound++;
            continue;
        }

        // Create next paths to go to
        toVisit.push(new Node(toVisit[k].i + 1, toVisit[k].j));
        toVisit.push(new Node(toVisit[k].i, toVisit[k].j + 1));
    }

    return pathsFound;
}

export class Node {
    constructor(i, j) {
        this.i = i;
        this.j = j;
    }
}