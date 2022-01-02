export function calculate(ns, contractData) {
    let ways = [];
    ways[0] = 1;

    for (let a = 1; a <= contractData; a++) {
        ways[a] = 0;
    }

    for (let i = 1; i <= contractData - 1; i++) {
        for (let j = i; j <= contractData; j++) {
            ways[j] += ways[j - i];
        }
    }

    return ways[contractData];
}