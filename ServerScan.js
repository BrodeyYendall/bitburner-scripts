import {Server} from "Server.js"
import {Hacker} from "Hacker.js"

export function breathFirstScan(ns, hacker = new Hacker(ns), scanFrom = null, visited = []) {
	var toVisit;
	if (scanFrom === null) {
		toVisit = ["home"];
	} else {
		toVisit = scanFrom;
	}

	var openServers = [];
	var rootedServers = [];
	var lockedServers = [];

	for (var i = 0; i < toVisit.length; i++) {
		var neighbourName = toVisit[i];

		if (visited.includes(neighbourName)) {
			continue;
		}

		visited.push(neighbourName);

		const isOpen = ns.hasRootAccess(neighbourName) || hacker.hackServer(neighbourName);
		if (isOpen) {
			var server = new Server(ns, neighbourName, ns.getServer(neighbourName));

			const hackingLevelRequired = ns.getServerRequiredHackingLevel(neighbourName)
			if (ns.getHackingLevel() < hackingLevelRequired) {
				ns.print(neighbourName + " needs hacking level " + hackingLevelRequired + " to access");
				rootedServers.push(server)
			} else {
				openServers.push(server);
			}

			toVisit = toVisit.concat(ns.scan(neighbourName));
		} else {
			lockedServers.push(neighbourName);
		}
	}

	var toReturn = {
		openServers: openServers,
		rootedServers: rootedServers,
		lockedServers: lockedServers,
		visited: visited
	};

	return toReturn;
}