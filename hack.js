/** @param {NS} ns **/
export async function main(ns) {
    let hackResult = await ns.hack(ns.args[0]);

    let wroteToPort = false;
    while (!wroteToPort) {
        await ns.sleep(5);
        wroteToPort = await ns.tryWritePort(ns.args[1], {
            name: ns.args[2],
            result: hackResult,
            identifier: ns.args[3]
        });
    }
}