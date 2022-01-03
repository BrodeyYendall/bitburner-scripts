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


import * as Formulas from "editted-formula.js"
import {Hacker} from "Hacker.js"
import * as ServerScan from "ServerScan.js"

// noinspection JSUnusedGlobalSymbols
/** @param {import(".").NS } ns */
export async function main(ns) {
    const args = ns.flags([
        ["drain-cutoff", 5],
        ["show-leaderboard", "yes"],
        ["home-reserve", 80],
        ["kill-existing", "no"]
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
        this.activateDrainOperations = 0;
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

        let availableThreads;
        let previousHackLevel = -1;

        // noinspection InfiniteLoopJS
        while (true) {
            await this.updateAvailableServers(previousHackLevel);

            availableThreads = this.determineAvailableThreads();
            this.ns.tprint(availableThreads);
            await this.drainServers(availableThreads);

            let targetServer = this.bestServer;

            this.ns.tprint("here 1");
            await this.performWeaken(availableThreads, targetServer);
            this.ns.tprint("here 2");
            if (await this.performGrow(availableThreads, targetServer)) {
                this.ns.tprint("here 3");
                await this.performWeaken(availableThreads, targetServer);
                this.ns.tprint("here 4");
                await this.performHack(availableThreads, targetServer);
            }
        }
    }

    async performWeaken(availableThreads, targetServer) {
        let securityLevel = this.ns.getServerSecurityLevel(targetServer.name);

        let estimatedWeakenTime = Formulas.calculateWeakenTime(targetServer.server, this.ns.getPlayer(), securityLevel);
        if (securityLevel > targetServer.server.minDifficulty) {
            let weakenNeeded = Math.ceil((Math.ceil(securityLevel - targetServer.server.minDifficulty)) / 0.05);
            this.ns.tprint("Found that " + weakenNeeded + " weaken were needed for " + targetServer.name);
            await this.performLargeOperation(WEAKEN_SCRIPT_NAME, weakenNeeded, -1, targetServer.name);
            this.ns.tprint(`Sleeping for ${formatSeconds(estimatedWeakenTime)}`)
            await this.ns.sleep(estimatedWeakenTime * 1000);
        }
        this.ns.tprint("Weaken resulted in a security level of: " + this.ns.getServerSecurityLevel(targetServer.name) + " with minimum: " + targetServer.server.minDifficulty);
    }

    async performGrow(availableThreads, targetServer) {
        const preGrowBalance = this.ns.getServerMoneyAvailable(targetServer.name);
        const growThreads = Formulas.neededGrowthServers(this.ns, targetServer.server, 0, false);

        let estimatedGrowTime = Formulas.calculateGrowTime(targetServer.server, this.ns.getPlayer(), this.ns.getServerSecurityLevel(targetServer.name));
        this.ns.tprint(`Found that ${growThreads} grows were needed for ${targetServer.name}. Current balance is ${preGrowBalance} with max ${targetServer.server.moneyMax}`)
        if (growThreads > availableThreads.growThreads) {
            if (availableThreads.growThreads > 0) {
                this.ns.tprint("Throttled down to " + availableThreads.growThreads + " grows that are needed for " + targetServer.name);
                await this.performParallelOperations(GROW_SCRIPT_NAME, availableThreads.growThreads, GROW_RESULT_PORT, targetServer.server);

                this.ns.tprint(`Sleeping for ${formatSeconds(estimatedGrowTime)}`)
                await this.ns.sleep(estimatedGrowTime * 1000);

                this.ns.tprint(`Balance was \$${preGrowBalance} before the grow and \$${this.ns.getServerMoneyAvailable(targetServer.name)} after the grow. (Max: ${targetServer.server.moneyMax})`);
                this.ns.tprint("Skipping hack due to server not being fully grown");
            }
            return false;
        } else {
            if (growThreads > 0) {
                await this.performParallelOperations(GROW_SCRIPT_NAME, growThreads, GROW_RESULT_PORT, targetServer);

                this.ns.tprint(`Sleeping for ${formatSeconds(estimatedGrowTime)}`)
                await this.ns.sleep(estimatedGrowTime * 1000);

                this.ns.tprint(`Balance was \$${preGrowBalance} before the grow and \$${this.ns.getServerMoneyAvailable(targetServer.name)} after the grow. (Max: ${targetServer.server.moneyMax})`);
            }
            return true

        }
    }

    async performHack(availableThreads, targetServer) {
        const estimatedHackTime = Formulas.calculateHackingTime(targetServer.server, this.ns.getPlayer(), this.ns.getServerSecurityLevel(targetServer.name));
        let hackThreads = availableThreads.hackThreads;
        const maxHack = Math.floor(Formulas.determineMaxHack(this.ns, targetServer.server, availableThreads.growThreads).hackCores);

        if (maxHack < hackThreads) {
            this.ns.tprint("Throttling hack number due to poor growth. Max hack " + maxHack + " hack threads: " + hackThreads);
            hackThreads = maxHack;
        }

        if(hackThreads > 0) {
            this.ns.tprint("Starting " + hackThreads + " hack threads for " + targetServer.name)

            const preHackBalance = this.ns.getServerMoneyAvailable(targetServer.name);
            await this.performLargeOperation(HACK_SCRIPT_NAME, hackThreads, HACK_RESULT_PORT, targetServer.name);

            this.ns.tprint(`Sleeping for ${formatSeconds(estimatedHackTime)}`)
            await this.ns.sleep(estimatedHackTime * 1000);

            this.ns.tprint(`Balance was \$${preHackBalance} before the hack and \$${this.ns.getServerMoneyAvailable(targetServer.name)} after the hack`);

        }
    }

    async drainServers(availableThreads) {
        let drainCutoff = this.args["drain-cutoff"];
        let drainableServers = this.openServers.filter((server) => server.server.moneyAvailable > 0);

        let beginnerServers = drainableServers.filter(server => server.server.requiredHackingSkill < 100);
        if(beginnerServers.length === 0) {
            drainableServers = drainableServers.slice(drainCutoff);
        } else {
            // Set drainableServers to all servers with hacking level < 100 except for the best server (which will be farmed).
            drainableServers = beginnerServers;
            let bestServerIndex = beginnerServers.indexOf(this.bestServer);
            if(bestServerIndex !== -1) {
                drainableServers.splice(bestServerIndex, 1);
            }
        }

        // Remove servers which already have their operations determined
        drainableServers = drainableServers.filter(server => typeof(this.neededDrainOperations.find(operation => operation.server === server.name)) === "undefined");

        if (drainableServers.length === 0) {
            return;
        }

        const player = this.ns.getPlayer();

        for (let server of drainableServers) {
            let weakenNeeded = 0;
            let waitOnWeaken = false;

            const securityLevel = this.ns.getServerSecurityLevel(server.name)
            if (securityLevel > server.server.minDifficulty) {
                weakenNeeded = Math.min(Math.ceil((securityLevel - server.server.minDifficulty) / 0.05), availableThreads.hackThreads);
                waitOnWeaken = true;
            }

            const percentHacked = Formulas.calculatePercentMoneyHacked(this.ns, server.server, player, server.server.minDifficulty);
            const serverBalance = this.ns.getServerMoneyAvailable(server.name);
            const hackedNeeded = Math.min(Math.ceil(serverBalance / Math.floor(serverBalance * percentHacked)), availableThreads.hackThreads);

            this.neededDrainOperations.push({
                server: server.name,
                hackNeeded: hackedNeeded,
                weakenNeeded: weakenNeeded,
                waitOnWeaken: waitOnWeaken
            });
        }

        this.ns.tprint(this.neededDrainOperations);

        for (let i = 0; i < this.neededDrainOperations.length; i++) {
            let operation = this.neededDrainOperations[i];
            if (operation.weakenNeeded > 0) {
                try {
                    this.ns.tprint(`Starting drain weaken on ${operation.server} with ${operation.weakenNeeded} threads.`);
                    await this.performLargeOperation(DRAIN_WEAKEN_SCRIPT_NAME, operation.weakenNeeded, DRAIN_WEAKEN_RESULT_PORT, operation.server);
                    operation.weakenNeeded = 0;
                    this.activateDrainOperations++;
                } catch (e) {
                    // no server available. Ignore the error because it will loop again
                }
            }
            if (!operation.waitOnWeaken && operation.hackNeeded > 0) {
                try {
                    this.ns.tprint(`Starting drain hack on ${operation.server} with ${operation.hackNeeded} threads.`);
                    await this.performLargeOperation(DRAIN_HACK_SCRIPT_NAME, operation.hackNeeded, DRAIN_HACK_RESULT_PORT, operation.server);
                    operation.hackNeeded = 0;
                    this.activateDrainOperations++;
                } catch (e) {
                    // no server available. Ignore the error because it will loop again
                }
            }
        }

        if(this.activateDrainOperations > 0) {
            let portResult = await this.ns.readPort(DRAIN_WEAKEN_RESULT_PORT);
            while (portResult !== "NULL PORT DATA") {
                this.activateDrainOperations--;
                let foundOperation = this.neededDrainOperations.find(operation => operation.server === portResult.target);
                if(typeof(foundOperation) !== "undefined") {
                    foundOperation.waitOnWeaken = false;
                }
                this.ns.tprint(`Completed drain weaken on ${portResult.target} with ${portResult.identifier} threads. Active operations: ${this.activateDrainOperations}`);
                portResult = await this.ns.readPort(DRAIN_WEAKEN_RESULT_PORT);
            }

            portResult = await this.ns.readPort(DRAIN_HACK_RESULT_PORT);
            while (portResult !== "NULL PORT DATA") {
                if(portResult.result === 0) {
                    this.ns.tprint(`Restarted drain hack on ${portResult.target} with ${portResult.identifier} threads. Active operations: ${this.activateDrainOperations}`);
                    await this.performLargeOperation(DRAIN_HACK_SCRIPT_NAME, portResult.identifier, HACK_RESULT_PORT, portResult.target, portResult.target);
                } else {
                    let indexOfOperation = this.neededDrainOperations.findIndex(operation => operation.server === portResult.target);
                    this.neededDrainOperations.splice(indexOfOperation, 1);
                    this.activateDrainOperations--;
                    this.ns.tprint(`Completed drain hack on ${portResult.target} with ${portResult.identifier} threads earning ${portResult.result}. Active operations: ${this.activateDrainOperations}`);
                }
                portResult = await this.ns.readPort(DRAIN_HACK_RESULT_PORT);
            }

            if(this.activateDrainOperations < 0) {
                this.activateDrainOperations = 0;
            }
        }

    }

    async updateAvailableServers(previousHackLevel) {
        let updatedHackCapacity = false;
        let newHackingLevel = previousHackLevel;

        // Check if player unlocked new port hack option.
        const hackOptionsBefore = this.hacker.hackOptions.length;
        this.hacker.refreshHackOptions();
        if(hackOptionsBefore !== this.hacker.hackOptions.length) {
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
                await this.prepareServers(scanResults.openServers);
                this.openServers = this.openServers.concat(scanResults.openServers);

                this.rootedServers = scanResults.rootedServers;
                this.lockedServers = scanResults.lockedServers;
                this.visited = scanResults.visited;

                this.sortServers();
                await this.prepareServers(this.openServers.concat(this.rootedServers));
                this.showLeaderBoard();

            }
        }

        return newHackingLevel;
    }

    async performLargeOperation(scriptName, threads, port, target) {
        let usableServers = this.openServers.concat(this.rootedServers);
        usableServers = usableServers.filter((server) => server.server.maxRam > 0); // Remove any servers that don't have RAM

        // Sort servers such that lower RAM are used first. This reserves the larger servers for large operations
        usableServers.sort((firstServer, secondServer) => firstServer.server.maxRam - secondServer.server.maxRam);

        const ramNeeded = threads * this.ns.getScriptRam(scriptName);
        let scriptStarted = false;
        for(let server of usableServers) {
            if(server.server.maxRam - this.ns.getServerUsedRam(server.name) > ramNeeded) {
                let processID = await this.ns.exec(scriptName, server.name, threads, target, port, "home", threads, Math.random());

                if (processID === 0) {
                    throw "Failed to create " + scriptName + " for " + target;
                }

                scriptStarted = true;
                break;
            }
        }

        if(!scriptStarted) {
            this.ns.tprint(`Failed to run ${scriptName} with ${threads} on target ${target}`);
        }

        return new Date();
    }

    async performParallelOperations(scriptName, numOfOperations, scriptPort, targetServer) {
        let usableServers = this.openServers.concat(this.rootedServers);
        usableServers = usableServers.filter((server) => server.server.maxRam !== 0); // Remove any servers that don't have RAM

        // Sort servers such that lower RAM are used first. This reserves the larger servers for large operations
        usableServers.sort((firstServer, secondServer) => firstServer.server.maxRam - secondServer.server.maxRam);

        // Performs operation on each server available. Note that each operation is a separate script
        let activeThreads = 0;
        for (let server of usableServers) {
            let availableRam = server.server.maxRam - this.ns.getServerUsedRam(server.name);
            if (server.name === "home") {
                availableRam -= this.args["home-reserve"];
            }

            let availableThreads = Math.floor(availableRam / this.ns.getScriptRam(scriptName)); // Available threads for this server
            for (let i = 0; i < availableThreads && activeThreads < numOfOperations; i++) {

                // Last two arguments are passed because you cannot run the same script with same arguments on the same server.
                // The last two arguments fix this by providing arbitrary values
                let processID = await this.ns.exec(scriptName, server.name, 1, targetServer.name, scriptPort, server.name, activeThreads, "A");

                if (processID === 0) {
                    throw "Failed to create " + scriptName + " for " + targetServer.name
                }
                // If scripts finish at the same time then it defeats the purpose of separate scripts. This sleep ensures that doesn't happen
                await this.ns.sleep(1);
                activeThreads++;
            }
        }

        return new Date();
    }

    determineAvailableThreads() {
        let hackThreads = 0;
        let growThreads = 0;

        for (let server of this.openServers.concat(this.rootedServers)) {
            if(server.server.maxRam > 0) {
                const usedRam = this.ns.getServerUsedRam(server.name);
                const serverRam = server.server.maxRam - usedRam;
                if (server.name === "home") {
                    let homeRam = serverRam - this.args["home-reserve"];
                    if(homeRam > 0) {
                        hackThreads = Math.floor(homeRam / this.ns.getScriptRam(HACK_SCRIPT_NAME));
                        growThreads += Math.floor(homeRam / this.ns.getScriptRam(GROW_SCRIPT_NAME));
                    }
                } else {
                    const growThreadsToAdd = Math.floor(serverRam / this.ns.getScriptRam(GROW_SCRIPT_NAME));
                    growThreads += growThreadsToAdd
                }
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
            this.ns.tprint("\n\n----- LEADERBOARD -----");
            for (let i = 0; i < this.openServers.length; i++) {
                let performance = this.openServers[i].performance;
                if (performance.score > 0) {
                    this.ns.tprint(`${this.openServers[i].name}: score: ${performance.score}, amount: ${performance.amountHacked},grow #: ${performance.numOfGrow}, hack #: ${performance.numOfHack}, weaken: ${performance.weakenTime}s, port: ${this.ns.getServerNumPortsRequired(this.openServers[i].name)}, level: ${this.ns.getServerRequiredHackingLevel(this.openServers[i].name)}`);
                }
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

            if(this.args["kill-existing"] === "yes") {
                this.ns.scriptKill(GROW_SCRIPT_NAME, server.name);
                this.ns.scriptKill(HACK_SCRIPT_NAME, server.name);
                this.ns.scriptKill(WEAKEN_SCRIPT_NAME, server.name);
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
    if(hours > 0) {
        string += `${hours} hours `;
    }
    if(minutes > 0) {
        string += `${minutes} minutes `;
    }

    string += `${seconds} seconds`;

    return string;
}