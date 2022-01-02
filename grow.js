/** @param {NS} ns **/
export async function main(ns) {
    let growResult = await ns.grow(ns.args[0]);

    let wroteToPort = false;
    while (!wroteToPort) {
        await ns.sleep(5);
        wroteToPort = await ns.tryWritePort(ns.args[1], {
            name: ns.args[2],
            result: growResult,
            identifier: ns.args[3]
        });
    }
}