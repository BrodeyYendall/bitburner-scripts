/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([
        ["ram", 4096],
        ["sell-old", "yes"]
    ]);

    const purchaseLimit = ns.getPurchasedServerLimit();
    let serversToBuy = purchaseLimit

    let ram = args["ram"];
    let currentServers = [];
    if (args["sell-old"] === "yes") {
        currentServers = ns.getPurchasedServers();

        const preFilterLength = currentServers.length;
        currentServers = currentServers.filter(serverName => ns.getServerMaxRam(serverName) > ram);

        serversToBuy -= preFilterLength - currentServers.length;
    }

    while (serversToBuy > 0) {
        if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
            if (currentServers.length > 0) {
                ns.deleteServer(currentServers[0]);
                currentServers = currentServers.slice(1);
            }
            const serverName = `pserv-${ram}-${purchaseLimit - serversToBuy}`
            ns.tprint("Buying " + serverName);
            // ns.purchaseServer(serverName, ram);
            serversToBuy--;
        }
        await ns.sleep(10000);
    }

    ns.tprint(`Brought ${serversToBuy} new servers. All servers are ${ram}GB`)
}