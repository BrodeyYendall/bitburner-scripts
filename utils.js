import * as ServerScan from "ServerScan.js"
import {calculatePercentMoneyHacked} from "./editted-formula";

// noinspection JSUnusedGlobalSymbols
/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([
        ["operation", "find-server"],
        ["values", null]
    ]);

    switch (args["operation"]) {
        case "find-server":
            findServer(ns, args);
            break;
        case "growth":
            determineGrowthFunctions(ns, args);
            break;
        case "test":
            test(ns, args);
            break;
    }
}

export function findServer(ns, args) {
    if (args["values"] === null) {
        ns.tprint("No value received, please use the --values flag");
        return;
    }
    let search = ServerScan.breathFirstScan(ns);

    const serverToFind = args["values"].toLowerCase();
    let searchedServer = search.toVisit.find(node => node.name.toLowerCase() === serverToFind);

    if (typeof (searchedServer) === "undefined") {
        ns.tprint("Failed to find server " + args["values"]);
    } else {
        ns.tprint(`Found server: ${JSON.stringify(searchedServer)}`);

        let string = "";
        let searchTree = searchedServer.source;
        searchTree = searchTree.slice(1);
        searchTree.push(searchedServer.name);
        for (let source of searchTree) {
            string += "connect " + source + ";";
        }

        ns.tprint(string);
    }
}

export function determineGrowthFunctions(ns, args) {
    let search = ServerScan.breathFirstScan(ns);
    let servers = search.openServers;

    if(args["values"] !== null) {
        const serverToFind = args["values"].toLowerCase();
        let searchedServer = servers.find(node => node.name.toLowerCase() === serverToFind);
        if (typeof (searchedServer) === "undefined") {
            ns.tprint("Failed to find server " + args["values"]);
            return;
        } else {
            servers = [searchedServer];
        }
    }

    for (let server of servers) {
        let bulkThreadFormula = `y = ((1 + (1.03 - 1) / ${server.server.minDifficulty})^((${server.server.serverGrowth} / 100))) ^ x`;

        ns.tprint(`${server.name}: ${bulkThreadFormula}`);
    }
}

export function test(ns, args) {

}
