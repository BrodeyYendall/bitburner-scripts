import * as ServerScan from "ServerScan.js"

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
        case "test":
            determineGrowthFunctions(ns);
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

export function determineGrowthFunctions(ns) {
    let search = ServerScan.breathFirstScan(ns);
    let servers = search.openServers;

    for (let server of servers) {
        //Get adjusted growth rate, which accounts for server security
        let adjGrowthRate = 1 + (1.03 - 1) / server.server.minDifficulty;
        if (adjGrowthRate > 1.0035) {
            adjGrowthRate = 1.0035;
        }

        const moneyAvailable = server.server.moneyMax * 0.5;

        let individualThreadFormula = `${moneyAvailable} * (1 + (1.03 - 1) / a)^((b / 100) * x * c)`;
        let bulkThreadFormula = `${moneyAvailable} * ((1 + (1.03 - 1) / a)^((b / 100) * c)) ^ x`;

        ns.tprint(`${server.name}: ${individualThreadFormula} = ${bulkThreadFormula}`);
    }
}

