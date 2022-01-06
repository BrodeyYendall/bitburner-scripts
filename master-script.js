const HACK_RESULT_PORT = 1;
const GROW_RESULT_PORT = 2;
const WEAKEN_RESULT_PORT = 3;
const DRAIN_HACK_RESULT_PORT = 5;
const DRAIN_WEAKEN_RESULT_PORT = 6;

const GROW_SCRIPT_NAME = "grow.js";
const HACK_SCRIPT_NAME = "hack.js";
const WEAKEN_SCRIPT_NAME = "weaken.js";

const DRAIN_HACK_SCRIPT_NAME = "drain-hack.js";
const DRAIN_WEAKEN_SCRIPT_NAME = "drain-weaken.js";

const WORKER_SCRIPT_SIZE = 1.75;

const DRAIN_OPERATION_FAILED_WAIT_TIME = 0; //60000;

const GROW_SECURITY_IMPACT = 0.004;
const HACK_SECURITY_IMPACT = 0.002;
const WEAKEN_SECURITY_IMPACT = 0.05;


import * as Formulas from "editted-formula.js"
import {Hacker} from "Hacker.js"
import * as ServerScan from "ServerScan.js"

// noinspection JSUnusedGlobalSymbols
/** @param {import(".").NS } ns */
export async function main(ns) {
    const args = ns.flags([
        ["drain-cutoff", 5],
        ["show-leaderboard", "yes"],
        ["leaderboard-cutoff", 10],
        ["home-reserve", 80],
        ["kill-existing", "yes"]
    ]);

    let scriptManager = new ScriptManager(ns, args);

    await scriptManager.run(); // Start the main loop

    ns.tprint("Done");
}


class ScriptManager {
    constructor(ns, args) {
        this.ns = ns;
        this.args = args;
        this.hacker = new Hacker(ns);
        this.threadManager = new ThreadManager(ns, args);
        this.neededDrainOperations = [];
        this.openServers = [];
        this.lockedServers = ["home"];
        this.rootedServers = [];
        this.visited = [];
    }

    async run() {
        this.ns.disableLog('ALL');
        this.ns.enableLog('exec');

        this.ns.clearPort(HACK_RESULT_PORT);
        this.ns.clearPort(GROW_RESULT_PORT);
        this.ns.clearPort(WEAKEN_RESULT_PORT);
        this.ns.clearPort(DRAIN_HACK_RESULT_PORT);
        this.ns.clearPort(DRAIN_WEAKEN_RESULT_PORT);

        let previousHackLevel = -1;

        // noinspection InfiniteLoopJS
        while (true) {
            await this.updateAvailableServers(previousHackLevel);

            await this.drainServers();

            let targetServer = this.bestServer;

            // // Temporary code for ensuring that threadManager is preforming correctly
            // const individualThreadsBefore = this.threadManager.individualThreads;
            // const bulkThreadsBefore = Array.from(this.threadManager.bulkThreads.entries());
            //
            // // Prepare server before going into main loop
            // await this.performWeaken(targetServer);
            // await this.performGrow(targetServer)


            try {
                let maxHackResults = Formulas.determineMaxHack(this.ns, targetServer.server, this.threadManager.individualThreads, true);

                let hackNeeded = Math.floor(maxHackResults.hackCores);
                let postHackWeakenNeeded = Math.ceil((hackNeeded * HACK_SECURITY_IMPACT) / WEAKEN_SECURITY_IMPACT);
                let growNeeded = maxHackResults.growThreads;
                let postGrowWeakenNeeded = Math.ceil((growNeeded * GROW_SECURITY_IMPACT) / WEAKEN_SECURITY_IMPACT);

                this.ns.tprint(`Estimating, h: ${hackNeeded}, hw: ${postHackWeakenNeeded}, g: ${growNeeded}, gw: ${postGrowWeakenNeeded}`);

                if(this.ns.getServerSecurityLevel(targetServer.name) - targetServer.server.minDifficulty > 10) {
                    await this.performWeaken(targetServer);
                }
                await this.performGrow(targetServer);
                if(this.ns.getServerSecurityLevel(targetServer.name) - targetServer.server.minDifficulty > 10) {
                    await this.performWeaken(targetServer);
                }
                await this.performHack(targetServer);
            } catch (e) {
                this.ns.tprint(typeof (e));
                if (typeof (e) === "object") {
                    throw e; // If it is not a string then I did not throw it; It is an error in my code.
                } else {
                    this.ns.tprint(`A farming operation failed with ${e}. Waiting for ${formatSeconds(DRAIN_OPERATION_FAILED_WAIT_TIME / 1000)}`);
                    await this.ns.sleep(DRAIN_OPERATION_FAILED_WAIT_TIME);
                }

            }

            await this.ns.sleep(5000);

            // // Temporary code for ensuring that threadManager is preforming correctly
            // this.threadManager.peekBulkThreads(1);
            //
            // const individualThreadsAfter = this.threadManager.individualThreads;
            // // A farming operation failed with Individual before and after not equal, before: 385544, after: 383654. Waiting for 1 minutes 0 seconds
            // if(individualThreadsBefore !== individualThreadsAfter) {
            //     throw `Individual before and after not equal, before: ${individualThreadsBefore}, after: ${individualThreadsAfter}`;
            // }
            // const bulkThreadsAfter = Array.from(this.threadManager.bulkThreads.entries());
            // if(bulkThreadsBefore.length !== bulkThreadsAfter.length) {
            //     throw `Bulk length before and after not equal, before: ${bulkThreadsBefore.length}, after: ${bulkThreadsAfter.length}`;
            // }
            // for(let i = 0; i < bulkThreadsAfter.length; i++) {
            //     if(bulkThreadsBefore[i][0] !== bulkThreadsAfter[i][0] || bulkThreadsBefore[i][1] !== bulkThreadsAfter[i][1]) {
            //         throw `Bulk before and after not equal, before: ${bulkThreadsBefore[i]}, after: ${bulkThreadsAfter[i]}`;
            //     }
            // }

        }
    }

    async performWeaken(targetServer) {
        let securityLevel = this.ns.getServerSecurityLevel(targetServer.name);

        let estimatedWeakenTime = Formulas.calculateWeakenTime(targetServer.server, this.ns.getPlayer(), securityLevel);
        if (securityLevel > targetServer.server.minDifficulty) {
            let weakenNeeded = Math.ceil((securityLevel - targetServer.server.minDifficulty) / 0.05);
            this.ns.tprint("Found that " + weakenNeeded + " weaken were needed for " + targetServer.name + " for security level " + securityLevel);

            let failedToFullWeaken = false;
            let threadObject = this.threadManager.peekBulkThreads(weakenNeeded);
            // noinspection JSIncompatibleTypesComparison
            if(threadObject === null) {
                failedToFullWeaken = false;
                threadObject = this.threadManager.peekIndividualThreads(weakenNeeded, true);
                this.ns.tprint(`Weaken: Not a big enough machine for ${weakenNeeded} threads. Using ${threadObject.reduce((total, object) => total + object.threads, 0)} individual threads instead.`);
                await this.performParallelOperations(WEAKEN_SCRIPT_NAME, targetServer.name, estimatedWeakenTime, threadObject);
            } else {
                await this.performLargeOperation(WEAKEN_SCRIPT_NAME, -1, targetServer.name, estimatedWeakenTime, threadObject);
            }
            this.ns.tprint(`Sleeping for ${formatSeconds(estimatedWeakenTime)}`)
            await this.ns.sleep((estimatedWeakenTime + 1) * 1000);

            if(failedToFullWeaken) {
                throw "Failed to full weaken";
            }
        }
        this.ns.tprint("Weaken resulted in a security level of: " + this.ns.getServerSecurityLevel(targetServer.name) + " with minimum: " + targetServer.server.minDifficulty);
    }

    async performGrow(targetServer) {
        const preGrowBalance = this.ns.getServerMoneyAvailable(targetServer.name);
        const growThreads = Formulas.neededGrowthServers(this.ns, targetServer.server, 0, false);

        let estimatedGrowTime = Formulas.calculateGrowTime(targetServer.server, this.ns.getPlayer(), this.ns.getServerSecurityLevel(targetServer.name));
        this.ns.tprint(`Found that ${growThreads} grows were needed for ${targetServer.name}. Current balance is ${preGrowBalance} with max ${targetServer.server.moneyMax}`)

        if (growThreads > 0) {
            let exceptionMessage = null;

            let failedToFullGrow = false;
            try {
                let threadObject = this.threadManager.peekIndividualThreads(growThreads);
                if(threadObject.length === 0) {
                    threadObject = this.threadManager.peekIndividualThreads(growThreads, true);
                    failedToFullGrow = true;
                    this.ns.tprint(`Grow: Not a big enough machine for ${growThreads} threads. Using ${threadObject.reduce((total, object) => total + object.threads, 0)} individual threads instead.`);
                }

                await this.performParallelOperations(GROW_SCRIPT_NAME, targetServer.name, estimatedGrowTime, threadObject);
            } catch (e) {
                this.ns.tprint(e);
                exceptionMessage = e;
            }

            this.ns.tprint(`Sleeping for ${formatSeconds(estimatedGrowTime)}`)
            await this.ns.sleep(estimatedGrowTime * 1000);

            this.ns.tprint(`Balance was \$${preGrowBalance} before the grow and \$${this.ns.getServerMoneyAvailable(targetServer.name)} after the grow. (Max: ${targetServer.server.moneyMax})`);

            if(failedToFullGrow) {
                throw "Failed to full grow";
            }

            if (exceptionMessage !== null) {
                throw exceptionMessage;
            }
        }
    }

    async performHack(targetServer) {
        const estimatedHackTime = Formulas.calculateHackingTime(targetServer.server, this.ns.getPlayer(), this.ns.getServerSecurityLevel(targetServer.name));

        const maxHack = Math.floor(Formulas.determineMaxHack(this.ns, targetServer.server, this.threadManager.individualThreads).hackCores);

        if (maxHack > 0) {
            this.ns.tprint("Starting " + maxHack + " hack threads for " + targetServer.name)

            const preHackBalance = this.ns.getServerMoneyAvailable(targetServer.name);

            let failedToFullHack = false;

            let threadObject = this.threadManager.peekBulkThreads(maxHack);

            // noinspection JSIncompatibleTypesComparison
            if(threadObject === null) {
                threadObject = this.threadManager.peekIndividualThreads(maxHack, true);
                this.ns.tprint(`Hack: Not a big enough machine for ${maxHack} threads. Using ${threadObject.reduce((total, object) => total + object.threads, 0)} individual threads instead.`);
                await this.performParallelOperations(HACK_SCRIPT_NAME, targetServer.name, estimatedHackTime, threadObject);
                failedToFullHack = true;
            } else {
                await this.performLargeOperation(HACK_SCRIPT_NAME, HACK_RESULT_PORT, targetServer.name, estimatedHackTime, threadObject);

            }


            this.ns.tprint(`Sleeping for ${formatSeconds(estimatedHackTime)}`)
            await this.ns.sleep(estimatedHackTime * 1000);

            this.ns.tprint(`Balance was \$${preHackBalance} before the hack and \$${this.ns.getServerMoneyAvailable(targetServer.name)} after the hack`);

            if(failedToFullHack) {
                throw "Failed to full hack";
            }

        }
    }

    async drainServers() {
        let drainCutoff = this.args["drain-cutoff"];
        let drainableServers = this.openServers.filter((server) => server.server.moneyAvailable > 0);

        let beginnerServers = drainableServers.filter(server => server.server.requiredHackingSkill < 100);
        if (beginnerServers.length === 0) {
            drainableServers = drainableServers.slice(drainCutoff);
        } else {
            // Set drainableServers to all servers with hacking level < 100 except for the best server (which will be farmed).
            drainableServers = beginnerServers;
            let bestServerIndex = beginnerServers.indexOf(this.bestServer);
            if (bestServerIndex !== -1) {
                drainableServers.splice(bestServerIndex, 1);
            }
        }

        // Remove servers which already have their operations determined
        drainableServers = drainableServers.filter(server => typeof (this.neededDrainOperations.find(operation => operation.server === server.name)) === "undefined");

        if (drainableServers.length === 0) {
            return;
        }

        const player = this.ns.getPlayer();

        for (let server of drainableServers) {
            let weakenNeeded = 0;
            let waitOnWeaken = false;

            const securityLevel = this.ns.getServerSecurityLevel(server.name)
            if (securityLevel > server.server.minDifficulty) {
                weakenNeeded = Math.ceil((securityLevel - server.server.minDifficulty) / 0.05);
                waitOnWeaken = true;
            }

            const percentHacked = Formulas.calculatePercentMoneyHacked(this.ns, server.server, player, server.server.minDifficulty);
            const serverBalance = this.ns.getServerMoneyAvailable(server.name);
            const hackedNeeded = Math.ceil(serverBalance / Math.floor(serverBalance * percentHacked));

            const weakenTime = Formulas.calculateWeakenTime(server.server, player, this.ns.getServerSecurityLevel(server.name));
            const hackTime = Formulas.calculateHackingTime(server.server, player);

            this.neededDrainOperations.push({
                server: server.name,
                hackNeeded: hackedNeeded,
                weakenNeeded: weakenNeeded,
                waitOnWeaken: waitOnWeaken,
                weakenTime: weakenTime,
                hackTime: hackTime,
                totalTime: weakenTime + hackTime
            });
        }

        // So that faster drains are completed first. Increases the amount of early income in a wipe
        this.neededDrainOperations.sort((a, b) => a.totalTime - b.totalTime);

        for (let i = 0; i < this.neededDrainOperations.length; i++) {
            let operation = this.neededDrainOperations[i];
            if (operation.weakenNeeded > 0) {
                try {
                    let threadObject = this.threadManager.peekBulkThreads(operation.weakenNeeded, true);
                    this.ns.tprint(threadObject);
                    this.ns.tprint(`Starting drain weaken on ${operation.server} with ${threadObject.threads} threads. It will take ${formatSeconds(operation.weakenTime)}`);
                    await this.performLargeOperation(DRAIN_WEAKEN_SCRIPT_NAME, DRAIN_WEAKEN_RESULT_PORT, operation.server, operation.weakenTime, threadObject);
                    operation.weakenNeeded -= threadObject.threads;
                } catch (e) {
                    // no server available. Ignore the error because it will loop again
                }
            }
            if (!operation.waitOnWeaken && operation.hackNeeded > 0) {
                try {
                    let threadObject = this.threadManager.peekBulkThreads(operation.hackNeeded, true);
                    this.ns.tprint(threadObject);
                    this.ns.tprint(`Starting drain hack on ${operation.server} with ${threadObject.threads} threads. It will take ${formatSeconds(operation.hackTime)}`);
                    await this.performLargeOperation(DRAIN_HACK_SCRIPT_NAME, DRAIN_HACK_RESULT_PORT, operation.server, operation.hackTime, threadObject);
                    operation.hackNeeded -= threadObject.threads;
                } catch (e) {
                    // no server available. Ignore the error because it will loop again
                }
            }
        }

        let portResult = await this.ns.readPort(DRAIN_WEAKEN_RESULT_PORT);
        while (portResult !== "NULL PORT DATA") {
            let foundOperation = this.neededDrainOperations.find(operation => operation.server === portResult.target);
            if (typeof (foundOperation) !== "undefined" && foundOperation.weakenNeeded !== 0) {
                foundOperation.waitOnWeaken = false;
                foundOperation.totalTime -= foundOperation.weakenTime;
                foundOperation.weakenTime = 0;
            }
            this.ns.tprint(`Completed drain weaken on ${portResult.target} with ${portResult.identifier} threads.`);
            portResult = await this.ns.readPort(DRAIN_WEAKEN_RESULT_PORT);
        }

        portResult = await this.ns.readPort(DRAIN_HACK_RESULT_PORT);
        while (portResult !== "NULL PORT DATA") {
            let indexOfOperation = this.neededDrainOperations.findIndex(operation => operation.server === portResult.target);
            if(indexOfOperation !== -1) {
                if (portResult.result === 0) {
                    this.ns.tprint(`Failed drain hack on ${portResult.target} with ${portResult.identifier} threads.`);
                    this.neededDrainOperations[indexOfOperation].hackNeeded += portResult.identifier;
                } else {
                    this.neededDrainOperations.splice(indexOfOperation, 1);
                    this.ns.tprint(`Completed drain hack on ${portResult.target} with ${portResult.identifier} threads earning ${portResult.result}.`);
                }
            } else {
                this.ns.tprint("A hack was finished but was unable to locate the operation " + portResult);
            }

            portResult = await this.ns.readPort(DRAIN_HACK_RESULT_PORT);
        }

    }

    async updateAvailableServers(previousHackLevel) {
        let updatedHackCapacity = false;
        let newHackingLevel = previousHackLevel;

        // Check if player unlocked new port hack option.
        const hackOptionsBefore = this.hacker.hackOptions.length;
        this.hacker.refreshHackOptions();
        if (hackOptionsBefore !== this.hacker.hackOptions.length) {
            updatedHackCapacity = true;
        }

        // Check if player's hacking level increased
        const player = await this.ns.getPlayer();
        if (player.hacking !== previousHackLevel) {
            newHackingLevel = player.hacking;
            updatedHackCapacity = true;
        }

        // Attempt to hack machines which were previously unavailable now that your hacking abilities have improved
        if (updatedHackCapacity) {

            // Merge rooted and locked servers. Rooted servers use Server object while locked servers use just names. We therefore map rooted servers to just name
            let possibleHacks = this.rootedServers.map(server => server.name).concat(this.lockedServers);

            // Remove these possible hacks from the visited list so that they can be visited again (previous scans already visited)
            this.visited = this.visited.filter(x => !possibleHacks.filter(y => y === x).length);

            let scanResults = ServerScan.breathFirstScan(this.ns, this.hacker, possibleHacks, this.visited);
            if (typeof (scanResults.openServers) !== "undefined" && scanResults.openServers.length > 0) {
                let usableServers = scanResults.openServers.concat(scanResults.rootedServers);
                await this.prepareServers(usableServers);
                this.threadManager.addNewServers(usableServers);
                this.threadManager.print();

                this.openServers = this.openServers.concat(scanResults.openServers);
                this.rootedServers = this.rootedServers.concat(scanResults.rootedServers);
                this.lockedServers = scanResults.lockedServers;
                this.visited = scanResults.visited;

                this.sortServers();
                await this.prepareServers(this.openServers.concat(this.rootedServers));
                this.showLeaderBoard();

            }
        }

        return newHackingLevel;
    }

    async performLargeOperation(scriptName, port, target, estimatedTime, threadObject) {
        if (threadObject === null) {
            throw `Failed to run ${scriptName} on target ${target}. No available servers`
        }

        let processID = await this.ns.exec(scriptName, threadObject.server, threadObject.threads, target, port, "home", threadObject.threads, Math.random());

        if (processID === 0) {
            throw `Failed to run ${scriptName} with ${threadObject.threads} on target ${target}. Failed exec`
        }

        let finishDateTime = new Date();
        finishDateTime.setSeconds(finishDateTime.getSeconds() + estimatedTime);

        this.threadManager.commitBulkThreads(threadObject, finishDateTime)
    }

    async performParallelOperations(scriptName, target, estimatedTime, threadObject) {
        if (threadObject.length === 0) {
            throw `Failed to run ${scriptName} on target ${target}. No available servers`
        }

        for (let server of threadObject) {
            for (let i = 1; i <= server.threads; i++) {
                let processID = await this.ns.exec(scriptName, server.server, 1, target, i);

                if (processID === 0) {
                    let finishDateTime = new Date();
                    finishDateTime.setSeconds(finishDateTime.getSeconds() + estimatedTime);
                    this.threadManager.commitIndividualThreads(threadObject, finishDateTime);

                    throw `Failed to run ${scriptName} on target ${target}. Failed exec`
                }

                await this.ns.sleep(1);
            }
        }

        let finishDateTime = new Date();
        finishDateTime.setSeconds(finishDateTime.getSeconds() + estimatedTime);
        this.threadManager.commitIndividualThreads(threadObject, finishDateTime)
    }

    sortServers() {
        this.openServers.sort((firstServer, secondServer) => firstServer.isBetter(secondServer));
        this.selectBestServer();
    }

    selectBestServer() {
        for (let i = 0; i < this.openServers.length; i++) {
            let serverMoney = this.ns.getServerMoneyAvailable(this.openServers[i].name);
            if (serverMoney > 1000) {
                this.ns.tprint(`Picked ${this.openServers[i].name} for best server with a balance of \$${serverMoney}`);
                this.bestServer = this.openServers[i];
                break;
            } else {
                this.ns.tprint(`Skipped #${i} (${this.openServers[i].name}) due to poor balance (${serverMoney})`);
            }
        }
    }

    showLeaderBoard() {
        if (this.args["show-leaderboard"] === "yes") {
            let leaderBoardCutoff = this.args["leaderboard-cutoff"];
            this.ns.tprint("\n\n----- LEADERBOARD -----");
            let i = 0
            for (i; i < this.openServers.length && i < leaderBoardCutoff; i++) {
                let performance = this.openServers[i].performance;
                if (performance.score > 0) {
                    this.ns.tprint(`${this.openServers[i].name}: score: ${performance.score}, amount: ${performance.amountHacked},grow #: ${performance.numOfGrow}, hack #: ${performance.numOfHack}, weaken: ${performance.weakenTime}s, port: ${this.ns.getServerNumPortsRequired(this.openServers[i].name)}, level: ${this.ns.getServerRequiredHackingLevel(this.openServers[i].name)}`);
                }
            }
            if(this.openServers.length > leaderBoardCutoff) {
                this.ns.tprint(`And ${this.openServers.length - leaderBoardCutoff} more servers...`);
            }
            this.ns.tprint("\n\n");
        }
    }

    async prepareServers(servers) {
        for (let server of servers) {
            await this.ns.scp(GROW_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(HACK_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(WEAKEN_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(DRAIN_HACK_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(DRAIN_WEAKEN_SCRIPT_NAME, "home", server.name);

            if (this.args["kill-existing"] === "yes") {
                this.ns.scriptKill(GROW_SCRIPT_NAME, server.name);
                this.ns.scriptKill(HACK_SCRIPT_NAME, server.name);
                this.ns.scriptKill(WEAKEN_SCRIPT_NAME, server.name);
                this.ns.scriptKill(DRAIN_WEAKEN_SCRIPT_NAME, server.name);
                this.ns.scriptKill(DRAIN_HACK_SCRIPT_NAME, server.name);
            }
        }
        // For some reason executing a script quickly after a SCP results in an error. This sleep prevents such error
        await this.ns.sleep(500);
    }
}

function formatSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    let string = "";
    if (hours > 0) {
        string += `${hours} hours `;
    }
    if (minutes > 0) {
        string += `${minutes} minutes `;
    }

    string += `${seconds} seconds`;

    return string;
}


// TODO Move to separate class. Keeping here temporarily because it will provide better stack trace for errors.
class ThreadManager {
    constructor(ns, args) {
        this.ns = ns;
        this.args = args;
        this.bulkThreads = new Map();
        this.individualThreads = 0;
        this.freeThreadQueue = [];
    }

    addNewServers(newServers) {
        for (let server of newServers) {
            let availableRam = server.server.maxRam - this.ns.getServerUsedRam(server.name);
            if (server.name === "home") {
                availableRam -= this.args["home-reserve"];
            }
            const availableThreads = Math.floor(availableRam / WORKER_SCRIPT_SIZE);
            if (availableThreads > 0) {
                this.bulkThreads.set(server.name, availableThreads);
                this.individualThreads += availableThreads;
            }
        }
    }

    peekBulkThreads(threads, scaleToPossible = false) {
        const possibleServers = this.#getUsableServers();
        for (let server of possibleServers) {
            if (server[1] >= threads) {
                // noinspection JSCheckFunctionSignatures
                return {
                    server: server[0],
                    threads: Math.min(server[1], threads)
                }
            }
        }

        if (scaleToPossible) {
            return {
                server: possibleServers[possibleServers.length - 1][0],
                threads: possibleServers[possibleServers.length - 1][1]
            }
        } else {
            return null;
        }
    }

    peekIndividualThreads(threads, scaleToPossible = false) {
        if (this.individualThreads > threads || scaleToPossible) {
            let threadsRemaining = threads;
            let threadAllocations = [];

            const possibleServers = this.#getUsableServers();
            for (let i = 0; i < possibleServers.length && threadsRemaining > 0; i++) {
                let server = possibleServers[i];
                let threads = server[1];
                if (server[1] > threadsRemaining) {
                    threads = threadsRemaining;
                }
                threadsRemaining -= threads;
                // noinspection JSCheckFunctionSignatures
                threadAllocations.push({server: server[0], threads: threads});
            }

            if (threadsRemaining > 0 && !scaleToPossible) {
                return [];
            }

            return threadAllocations;
        } else {
            return [];
        }
    }

    commitBulkThreads(serverThreads, timeToFree) {
        this.bulkThreads.set(serverThreads.server, this.bulkThreads.get(serverThreads.server) - serverThreads.threads)
        this.individualThreads -= serverThreads.threads;

        this.freeThreadQueue.push({isBulk: true, servers: serverThreads, timeToFree: timeToFree});
        this.freeThreadQueue.sort((a, b) => a.timeToFree - b.timeToFree);
    }

    commitIndividualThreads(serverThreads, timeToFree) {
        for (let server of serverThreads) {
            this.bulkThreads.set(server.server, this.bulkThreads.get(server.server) - server.threads)
            this.individualThreads -= server.threads;
        }

        this.freeThreadQueue.push({isBulk: false, servers: serverThreads, timeToFree: timeToFree});
        this.freeThreadQueue.sort((a, b) => a.timeToFree - b.timeToFree);
    }

    freeBulkThreads(serverToFree) {
        this.bulkThreads.set(serverToFree.server, this.bulkThreads.get(serverToFree.server) + serverToFree.threads)
        this.individualThreads += serverToFree.threads;
    }

    freeIndividualThreads(serversToFree) {
        for (let server of serversToFree) {
            this.freeBulkThreads(server);
        }
    }

    print() {
        this.ns.tprint("Individual threads: " + this.individualThreads);
        this.ns.tprint(`Batch threads: ${this.bulkThreads.size}`);
    }

    #getUsableServers() {
        this.#freeQueuedThreads();
        let possibleServers = Array.from(this.bulkThreads.entries());
        possibleServers = possibleServers.filter(a => a[1] > 0);
        possibleServers.sort((a, b) => a[1] - b[1]);



        return possibleServers;
    }

    #freeQueuedThreads() {
        if(this.freeThreadQueue.length > 0) {
            const currentDateTime = new Date();
            for(let i = 0; i < this.freeThreadQueue.length; i++) {
                if (this.freeThreadQueue[0].timeToFree <= currentDateTime) {
                    let serverToFree = this.freeThreadQueue.shift();
                    if (serverToFree.isBulk) {
                        this.freeBulkThreads(serverToFree.servers);
                    } else {
                        this.freeIndividualThreads(serverToFree.servers);
                    }

                    i--;
                } else {
                    break;
                }
            }

        }
    }

}