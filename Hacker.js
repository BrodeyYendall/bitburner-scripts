export class Hacker {
    constructor(ns) {
        this.ns = ns;
        this.hackOptions = new Array();

        this.HACK_OPTION_MAP = [
            {file: "brutessh.exe", command: this.ns.brutessh},
            {file: "ftpcrack.exe", command: this.ns.ftpcrack},
            {file: "relaysmtp.exe", command: this.ns.relaysmtp},
            {file: "httpworm.exe", command: this.ns.httpworm},
            {file: "sqlinject.exe", command: this.ns.sqlinject},
        ];

        this.refreshHackOptions()
    }

    refreshHackOptions() {
        for(var i = this.hackOptions.length; i < this.HACK_OPTION_MAP.length; i++) {
            if (!this.ns.fileExists(this.HACK_OPTION_MAP[i].file)) {
                return;
            }
            this.hackOptions.push(this.HACK_OPTION_MAP[i].command);
        }
    }

    hackServer(serverName) {
        var numPortsRequired = this.ns.getServerNumPortsRequired(serverName);
        if (this.hackOptions.length < numPortsRequired) {
            this.ns.tprint(serverName + " needs " + numPortsRequired + " open ports");
            return false;
        }

        for (var i = 0; i < numPortsRequired; i++) {
            this.hackOptions[i](serverName);
        }

        this.ns.nuke(serverName);
        this.ns.tprint("Unlocked " + serverName);
        return true;
    }
}