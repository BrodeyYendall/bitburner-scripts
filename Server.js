import * as Formulas from "editted-formula.js"

// The following are constants so that all server performance analysis are based on the same threads.
const GROW_THREADS = 1000;

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
            const player = ns.getPlayer();

            const maxHackResult = Formulas.determineMaxHack(ns, this.server, growThreads, true);
            const amountHacked = maxHackResult.amountHacked * Formulas.calculateHackingChance(this.server, player, true);
            const numOfHack = maxHackResult.hackCores;

            if (numOfHack <= 0) {
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

            const growTime = Formulas.calculateGrowTime(this.server, player);
            const postGrowWeakenTime = Formulas.calculateWeakenTime(this.server, player, this.server.minDifficulty + growThreads * 0.004);
            const postHackWeakenTime = Formulas.calculateWeakenTime(this.server, player, this.server.minDifficulty + numOfHack * 0.002);
            const hackTime = Formulas.calculateHackingTime(this.server, player);


            const score = amountHacked / (growTime + postGrowWeakenTime + postHackWeakenTime + hackTime);

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