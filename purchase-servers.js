/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.flags([
        ["ram", 4096],
        ["sell-old", "yes"]
    ]);

    var purchaseLimit = ns.getPurchasedServerLimit();
    var serversToBuy = purchaseLimit

    var ram = args["ram"];
    var currentServers = new Array();
    if(args["sell-old"] === "yes") {
        currentServers = ns.getPurchasedServers();

        var preFilterLength = currentServers.length;
        var currentServers = currentServers.filter(serverName => ns.getServerMaxRam(serverName)> ram);

        serversToBuy -= preFilterLength - currentServers.length;
    }

    while(serversToBuy > 0) {
        if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
            if(currentServers.length > 0) {
                ns.deleteServer(currentServers[0]);
                currentServers = currentServers.slice(1);
            }
            var serverName = `pserv-${ram}-${purchaseLimit - serversToBuy}`
            ns.tprint("Buying " + serverName);
            // ns.purchaseServer(serverName, ram);
            serversToBuy--;
        }
        await ns.sleep(10000);
    }

    ns.tprint(`Brought ${serversToBuy} new servers. All servers are ${ram}GB`)
}