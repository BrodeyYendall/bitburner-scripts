export function calculate(ns, contractData) {
    var ways = [];
    ways[0] = 1;

    for (var a = 1; a <= contractData; a++) {
        ways[a] = 0;
    }

    for (var i = 1; i <= contractData - 1; i++) {
        for (var j = i; j <= contractData; j++) {
            ways[j] += ways[j - i];
        }
    }

    return ways[contractData];
}