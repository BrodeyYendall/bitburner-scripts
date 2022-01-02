import * as ServerScan from "ServerScan.js"

/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([
        ["operation", "find-server"],
        ["operation-values", null]
    ]);

    switch (args["operation"]) {
        case "find-server":
            findServer(ns, args);
            break;
    }
}

export function findServer(ns, args) {
    let search = ServerScan.breathFirstScan(ns);

    let searchedServer = search.toVisit.find(node => node.name === args["operation-values"]);
    ns.tprint(`Found server: ${JSON.stringify(searchedServer)}`);

    let string = "";
    let searchTree = searchedServer.source;
    searchTree = searchTree.slice(1);
    searchTree.push(searchedServer.name);
    for(let source of searchTree) {
        string += "connect " + source + ";";
    }

    ns.tprint(string);

}