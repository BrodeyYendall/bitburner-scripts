import {Server} from "Server.js"
import {Hacker} from "Hacker.js"

export function breathFirstScan(ns, hacker = new Hacker(ns), scanFrom = null, visited = []) {
    let toVisit;
    if (scanFrom === null) {
        toVisit = [new SearchServer("home", [])];
    } else {
        toVisit = [];
        for (let name of scanFrom) {
            toVisit.push(new SearchServer(name, []));
        }
    }

    let openServers = [];
    let rootedServers = [];
    let lockedServers = [];

    for (let i = 0; i < toVisit.length; i++) {
        let neighbourName = toVisit[i].name;

        if (visited.includes(neighbourName)) {
            continue;
        }

        visited.push(neighbourName);

        const isOpen = ns.hasRootAccess(neighbourName) || hacker.hackServer(neighbourName);
        if (isOpen) {
            let server = new Server(ns, neighbourName, ns.getServer(neighbourName));

            const hackingLevelRequired = ns.getServerRequiredHackingLevel(neighbourName)
            if (ns.getHackingLevel() < hackingLevelRequired) {
                rootedServers.push(server)
            } else {
                openServers.push(server);
            }

            var copiedSource = JSON.parse(JSON.stringify(toVisit[i].source));
            copiedSource.push(toVisit[i].name);
            for (let scannedServer of ns.scan(neighbourName)) {
                toVisit.push(new SearchServer(scannedServer, copiedSource));
            }
        } else {
            lockedServers.push(neighbourName);
        }
    }

    return {
        openServers: openServers,
        rootedServers: rootedServers,
        lockedServers: lockedServers,
        visited: visited,
        toVisit: toVisit
    };
}

class SearchServer {
    constructor(name, source) {
        this.name = name;
        this.source = source;
    }
}