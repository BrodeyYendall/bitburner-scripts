const HACK_RESULT_PORT = 1;
const GROW_RESULT_PORT = 2;
const WEAKEN_RESULT_PORT = 3;
const HACK_OPTION_UPDATE_PORT = 4;

const GROW_SCRIPT_NAME = "grow.js";
const HACK_SCRIPT_NAME = "hack.js";
const WEAKEN_SCRIPT_NAME = "weaken.js";


import * as Formulas from "editted-formula.js"
import {Hacker} from "Hacker.js"
import * as ServerScan from "ServerScan.js"

/** @param {import(".").NS } ns */
export async function main(ns) {
    var args = ns.flags([
        ["drain-cutoff", 5],
        ["show-leaderboard", "yes"],
        ["home-reserve", 80]
    ]);

    ns.disableLog('ALL');

    var scriptManager = new ScriptManager(ns, args);

    await scriptManager.run(); // Start the main loop

    ns.tprint("Done");
}


class ScriptManager {
    constructor(ns, args) {
        this.ns = ns;
        this.args = args;
        this.hacker = new Hacker(ns);
    }

    async run() {
        var scanResult = ServerScan.breathFirstScan(this.ns, this.hacker);

        this.openServers = scanResult.openServers;
        this.lockedServers = scanResult.lockedServers;
        this.rootedServers = scanResult.rootedServers;
        this.visited = scanResult.visited

        await this.prepareServers(this.openServers.concat(this.rootedServers));

        this.ns.tprint(`open: ${this.openServers.length}, rooted: ${this.rootedServers.length}, locked: ${this.lockedServers.length}`);

        this.ns.clearPort(HACK_RESULT_PORT);
        this.ns.clearPort(GROW_RESULT_PORT);
        this.ns.clearPort(WEAKEN_RESULT_PORT);

        var availableThreads;
        var previousHackLevel = -1;

        await this.sortServers();
        this.showLeaderBoard();

        while (true) {
            await this.updateAvailableServers(previousHackLevel);
            this.selectBestServer();

            availableThreads = this.determineAvailableThreads();
            this.ns.tprint(availableThreads);
            // await this.drainServers(availableThreads);

            var securityLevel = this.ns.getServerSecurityLevel(this.bestServer.name);
            if(securityLevel > this.bestServer.server.minDifficulty) {
                var weakenNeeded = (securityLevel) / 0.05;
                this.ns.print("Found that " + weakenNeeded + " weaken were needed for " + this.bestServer.name);
                await this.performLargeOperation(WEAKEN_SCRIPT_NAME, weakenNeeded, WEAKEN_RESULT_PORT);
            }

            this.ns.print("Weaken resulted in a security level of: " + this.ns.getServerSecurityLevel(this.bestServer.name) + " with minimum: " + this.bestServer.server.minDifficulty);

            var preGrowBalance = this.ns.getServerMoneyAvailable(this.bestServer.name);
            var growThreads = Formulas.neededGrowthServers(this.ns, this.bestServer.server, 0, false);
            this.ns.print("Found that " + growThreads + " grows were needed for " + this.bestServer.name);
            await this.performParallelOperations(GROW_SCRIPT_NAME, growThreads, GROW_RESULT_PORT);
            this.ns.print(`Balace was \$${preGrowBalance} before the grow and \$${this.ns.getServerMoneyAvailable(this.bestServer.name)} after the grow. (Max: ${this.bestServer.server.moneyMax})`);

            var securityLevel = this.ns.getServerSecurityLevel(this.bestServer.name)
            if(securityLevel > this.bestServer.server.minDifficulty) {
                var weakenNeeded = (securityLevel) / 0.05;
                this.ns.print("Found that " + weakenNeeded + " weaken were needed for " + this.bestServer.name + " with minimum: " + this.bestServer.server.minDifficulty);
                await this.performLargeOperation(WEAKEN_SCRIPT_NAME, weakenNeeded, WEAKEN_RESULT_PORT);
            }
            this.ns.print("Weaken resulted in a security level of: " + this.ns.getServerSecurityLevel(this.bestServer.name));

            var hackThreads = availableThreads.hackThreads;
            var maxHack = Formulas.determineMaxHack(this.ns, this.bestServer.server, availableThreads.growThreads).hackCores;

            if (maxHack < hackThreads) {
                this.ns.print("Throtting hack number due to poor growth. Max hack " + maxHack + " hack threads: " + hackThreads);
                hackThreads = maxHack;
            }
            this.ns.print("Starting " + hackThreads + " hack threads for " + this.bestServer.name)

            var preHackBalance = this.ns.getServerMoneyAvailable(this.bestServer.name);
            await this.performLargeOperation(HACK_SCRIPT_NAME, hackThreads, HACK_RESULT_PORT);
            this.ns.print(`Balace was \$${preHackBalance} before the hack and \$${this.ns.getServerMoneyAvailable(this.bestServer.name)} after the hack`);

            this.ns.tprint("Done");
            await this.ns.sleep(1000);
        }
    }

    async drainServers(availableThreads) {
        var hackingLevelCuttoff = this.args["drain-cutoff"];
        var drainableServers = this.openServers.slice(hackingLevelCuttoff).filter((server) => server.server.moneyAvailable > 0);

        if(drainableServers.length > 0) {
            this.ns.tprint("Performing drain on bad servers");
        } else {
            return;
        }

        var player = this.ns.getPlayer();

        var neededOperations = new Array();
        for(var server of drainableServers) {
            var weakenNeeded = 0;
            var waitOnWeaken = false;

            var securityLevel = this.ns.getServerSecurityLevel(server.name)
            if(securityLevel > server.server.minDifficulty) {
                weakenNeeded = Math.min(Math.ceil((securityLevel - server.server.minDifficulty) / 0.05), availableThreads.hackThreads);
                waitOnWeaken = true;
            }

            var percentHacked = Formulas.calculatePercentMoneyHacked(this.ns, server.server, player, server.server.minDifficulty);
            var serverBalance = this.ns.getServerMoneyAvailable(server.name);
            var hackedNeeded = Math.min(Math.ceil(serverBalance / Math.floor(serverBalance * percentHacked)), availableThreads.hackThreads);

            neededOperations.push({
                server: server.name,
                hackNeeded: hackedNeeded,
                weakenNeeded: weakenNeeded,
                waitOnWeaken: waitOnWeaken
            });
        }

        var hackingThreads = availableThreads.hackThreads;
        var activateOperations = 0;
        do {
            for(var i = 0; i < neededOperations.length; i++) {
                var operation = neededOperations[i];
                if(operation.weakenNeeded > 0 && operation.weakenNeeded < hackingThreads) {
                    await this.ns.exec(WEAKEN_SCRIPT_NAME, "home", operation.weakenNeeded, operation.server, WEAKEN_RESULT_PORT, operation.server, operation.weakenNeeded);
                    hackingThreads -= operation.weakenNeeded;
                    operation.weakenNeeded = 0;
                    activateOperations++;
                    this.ns.tprint(`Starting weaken on ${operation.server} with ${operation.hackNeeded} threads. Threads remaining: ${hackingThreads}`);
                }
                if(!waitOnWeaken && operation.hackNeeded > 0 && operation.hackNeeded < hackingThreads) {
                    await this.ns.exec(HACK_SCRIPT_NAME, "home", operation.hackNeeded, operation.server, HACK_RESULT_PORT, operation.server, operation.hackNeeded);
                    hackingThreads -= operation.hackNeeded;
                    operation.hackNeeded = 0;
                    activateOperations++;
                    this.ns.tprint(`Starting hack on ${operation.server} with ${operation.hackNeeded} threads. Threads remaining: ${hackingThreads}`);
                }
            }
            var portResult = await this.ns.readPort(WEAKEN_RESULT_PORT);
            while(portResult !== "NULL PORT DATA") {
                hackingThreads += portResult.identifier
                activateOperations--;
                neededOperations.find(operation => operation.server === portResult.server).waitOnWeaken = false;
                this.ns.tprint(`Completed weaken on ${portResult.name} with ${portResult.identifier} threads. ${hackingThreads} available threads, active operations: ${activateOperations}`);
                portResult = await this.ns.readPort(WEAKEN_RESULT_PORT);
            }

            var portResult = await this.ns.readPort(HACK_RESULT_PORT);
            while(portResult !== "NULL PORT DATA") {
                hackingThreads += portResult.identifier
                activateOperations--;
                this.ns.tprint(`Completed hack on ${portResult.name} with ${portResult.identifier} threads. ${hackingThreads} available threads, active operations: ${activateOperations}`);
                portResult = await this.ns.readPort(HACK_RESULT_PORT);

            }

            await this.ns.sleep(1000);
        } while(neededOperations.length > 0 || activateOperations > 0);


    }

    async updateAvailableServers(previousHackLevel) {
        var updatedHackCapacity = false;
        var newHackingLevel = previousHackLevel;

        // Check if player unlocked new port hack option by checking the hack option update port. (Send data to this port when you unlock a new option)
        var hackOptionUpdate = this.ns.readPort(HACK_OPTION_UPDATE_PORT);
        if (hackOptionUpdate !== "NULL PORT DATA") {
            this.hacker.refreshHackOptions();
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

            // Merge rooted and locked servers. Rooted servers use Server object while locked servers use just names. We therefor map rooted servers to just name
            var possibleHacks = this.rootedServers.map(server => server.name).concat(this.lockedServers);

            // Remove these possible hacks from the visited list so that they can be visited again (previous scans already visited)
            this.visited = this.visited.filter(x => !possibleHacks.filter(y => y === x).length);

            var scanResults = ServerScan.breathFirstScan(this.ns, this.hacker, possibleHacks, this.visited);
            if (typeof (scanResults.openServers) !== "undefined" && scanResults.openServers.length > 0) {
                this.ns.tprint(scanResults.openServers);
                await this.prepareServers(scanResults.openServers);
                this.openServers.concat(scanResults.openServers);

                this.sortServers();
                this.showLeaderBoard(this.openServers);

                this.rootedServers = scanResults.rootedServers;
                this.lockedServers = scanResults.lockedServers;
                this.visited = scanResults.visited;
            }
        }

        return newHackingLevel;
    }

    async performLargeOperation(scriptName, threads, port) {
        var processID = this.ns.exec(scriptName, "home", threads, this.bestServer.name, port, "home", 1);

        if(processID === 0) {
            this.ns.tprint("*** ERROR *** Failed to create " + scriptName + " for " + this.bestServer.name);
        }

        var waitingForResults = true;
        while (waitingForResults) {
            var portResult = this.ns.readPort(port);
            if (portResult !== "NULL PORT DATA") {
                this.ns.print("Recieved " + scriptName + " complete, with result: " + portResult.result);
                waitingForResults = false;
            } else {
                await this.ns.sleep(5000);
            }
        }

    }

    async performParallelOperations(scriptName, numOfOperations, scriptPort) {
        var usableServers = this.openServers.concat(this.rootedServers);
        usableServers = usableServers.filter((server) => server.server.maxRam !== 0); // Remove any servers that don't have RAM

        // Sort servers such that lower RAM are used first. This reserves the larger servers for large operations
        usableServers.sort((firstServer, secondServer) => firstServer.server.maxRam - secondServer.server.maxRam);

        // Performs operation on each server available. Note that each operation is a seperate script
        var activeThreads = 0;
        for (var server of usableServers) {
            var availableRam = server.server.maxRam;
            if (server.name === "home") {
                availableRam -= this.args["home-reserve"];
            }

            var avaliableThreads = Math.floor(availableRam / this.ns.getScriptRam(scriptName)); // Avaliable threads for this server
            for (var i = 0; i < avaliableThreads && activeThreads < numOfOperations; i++) {

                // Last two arguments are passed because you cannot run the same script with same arguements on the same server.
                // The last two arguments fix this by providing arbitrary values
                var processID = this.ns.exec(scriptName, server.name, 1, this.bestServer.name, scriptPort, server.name, activeThreads, "A");

                if(processID === 0) {
                    this.ns.tprint("*** ERROR *** Failed to create " + scriptName + " for " + this.bestServer.name);
                }
                // If scripts finish at the same time then it defeats the purpose of seperate scripts. This sleep ensures that doesn't happen
                await this.ns.sleep(1);
                activeThreads++;
            }
        }


        var batchSize = activeThreads;
        this.ns.print("Active threads: " + activeThreads + " of needed " + numOfOperations + " on " + usableServers.length + " usable servers");

        // Start collecting successful scripts. If all operations weren't started in the previous block then scripts are restarted on completion
        var successfulThreads = 0;


        var currentBatchCount = 0;
        while (successfulThreads < numOfOperations) {
            var portResult = this.ns.readPort(scriptPort);
            if (portResult !== "NULL PORT DATA") {
                successfulThreads++;
                currentBatchCount++;

                if (activeThreads >= numOfOperations) {
                    // this.ns.print(`${scriptName} from ${portResult.name} was succesful. ${successfulThreads} of ${numOfOperations}`);
                } else {
                    // Last two arguments are passed because you cannot run the same script with same arguements on the same server.
                    // The last two arguments fix this by providing arbitrary values
                    var processID = this.ns.exec(scriptName, portResult.name, 1, this.bestServer.name, scriptPort, portResult.name, activeThreads, "R");

                    if(processID === 0) {
                        this.ns.tprint("*** ERROR *** Failed to create " + scriptName + " for " + this.bestServer.name);
                    }

                    // If scripts finish at the same time then it defeats the purpose of seperate scripts. This sleep ensures that doesn't happen
                    await this.ns.sleep(1);
                    activeThreads++;
                }
            } else {
                if(currentBatchCount > 0 && currentBatchCount < batchSize) {
                    await this.ns.sleep(1);
                } else {
                    this.ns.print(`${successfulThreads} of ${numOfOperations} completed so far. Active threads: ${activeThreads}`);
                    if(currentBatchCount === batchSize) {
                        currentBatchCount = 0;
                    }
                    await this.ns.sleep(5000);
                }
            }
        }
    }

    determineAvailableThreads() {
        var hackThreads = 0;
        var growThreads = 0;

        for (var server of this.openServers.concat(this.rootedServers)) {
            if (server.name === "home") {
                var homeRam =  server.server.maxRam - this.args["home-reserve"];
                hackThreads = Math.floor(homeRam / this.ns.getScriptRam(HACK_SCRIPT_NAME));
                growThreads += Math.floor(homeRam / this.ns.getScriptRam(GROW_SCRIPT_NAME));;
            } else {
                growThreads += Math.floor(server.server.maxRam / this.ns.getScriptRam(GROW_SCRIPT_NAME));;
            }

        }

        return {
            hackThreads: hackThreads,
            growThreads: growThreads
        };
    }

    sortServers() {
        this.openServers.sort((firstServer, secondServer) => firstServer.isBetter(secondServer));
        this.selectBestServer();
    }

    selectBestServer() {
        for(var i = 0; i < this.openServers.length; i++) {
            var serverMoney = this.ns.getServerMoneyAvailable(this.openServers[i].name);
            if(serverMoney > 1000) {
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
            this.ns.tprint("\n\n----- LEADERBOARD -----");
            for (var i = 0; i < this.openServers.length; i++) {
                var performance = this.openServers[i].performance;
                if (performance.score > 0) {
                    this.ns.tprint(`${this.openServers[i].name}: score: ${performance.score}, amount: ${performance.amountHacked},grow #: ${performance.numOfGrow}, hack #: ${performance.numOfHack}, weaken: ${performance.weakenTime}s, level: ${this.ns.getServerRequiredHackingLevel(this.openServers[i].name)}`);
                }
            }
            this.ns.tprint("\n\n");
        }
    }

    async prepareServers(servers) {
        for(var server of servers) {
            await this.ns.scriptKill(GROW_SCRIPT_NAME, server.name);
            await this.ns.scriptKill(HACK_SCRIPT_NAME, server.name);
            await this.ns.scriptKill(WEAKEN_SCRIPT_NAME, server.name);
            await this.ns.scp(GROW_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(HACK_SCRIPT_NAME, "home", server.name);
            await this.ns.scp(WEAKEN_SCRIPT_NAME, "home", server.name);
        }
    }
}