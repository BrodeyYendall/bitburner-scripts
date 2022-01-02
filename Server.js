import * as Formulas from "editted-formula.js"

// The following are constants so that all server performance analysis are based on the same threads.
var GROW_THREADS = 1000;

export class Server {
    constructor(ns, name, server) {
        this.name = name;
        this.server = server;
        this.performance = this.analyzeServerPerformance(ns);
    }

    isBetter(server) {
        if (this.performance.score === server.performance.score) {
            return 0;
        }

        if (this.performance.score > server.performance.score) {
            return -1;
        } else {
            return 1;
        }
    }

    analyzeServerPerformance(ns, growThreads = GROW_THREADS) {
        if (this.server.moneyMax > 0) {
            var player = ns.getPlayer();

            var maxHackResult = Formulas.determineMaxHack(ns, this.server, growThreads, true);
            var amountHacked = maxHackResult.amountHacked * Formulas.calculateHackingChance(this.server, player, true);
            var numOfHack = maxHackResult.hackCores;

            if(numOfHack <= 0) {
                return {
                    score: 0,
                    amountHacked: 0,
                    numOfGrow: 0,
                    numOfHack: 0,
                    growTime: 0,
                    weakenTime: 0,
                    hackTime: 0
                };
            }

            var growTime = Formulas.calculateGrowTime(this.server, player);
            var postGrowWeakenTime = Formulas.calculateWeakenTime(this.server, player, this.server.minDifficulty + growThreads * 0.004);
            var postHackWeakenTime = Formulas.calculateWeakenTime(this.server, player, this.server.minDifficulty + numOfHack * 0.002);
            var hackTime = Formulas.calculateHackingTime(this.server, player);


            var score = amountHacked / (growTime + postGrowWeakenTime + postHackWeakenTime + hackTime);

            return {
                score: score,
                amountHacked: amountHacked,
                numOfGrow: growThreads,
                numOfHack: numOfHack,
                growTime: growTime,
                weakenTime: postGrowWeakenTime + postHackWeakenTime,
                hackTime: hackTime
            };
        } else {
            return {
                score: 0,
                amountHacked: 0,
                numOfGrow: 0,
                numOfHack: 0,
                growTime: 0,
                weakenTime: 0,
                hackTime: 0
            };
        }

    }
}