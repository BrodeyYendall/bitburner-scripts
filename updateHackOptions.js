const HACK_OPTION_UPDATE_PORT = 4;

/** @param {NS} ns **/
export async function main(ns) {
    await ns.writePort(HACK_OPTION_UPDATE_PORT, "updated");
}