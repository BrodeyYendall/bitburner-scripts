const CORE_CUTOFF = 100000;

export function neededGrowthServers(ns, server, growAmount = 0, isPerformanceIndicator = true) {
    let currentBalance;
    let currentSecurity;
    if (isPerformanceIndicator) {
        currentBalance = server.moneyMax - growAmount;
        currentSecurity = server.minDifficulty;
    } else {
        currentBalance = ns.getServerMoneyAvailable(server.hostname);
        currentSecurity = ns.getServerSecurityLevel(server.hostname);
    }

    if (currentBalance <= 0) {
        currentBalance = 1;
    }

    let targetBalance;
    let amountToGrow;
    if (growAmount === 0) {
        targetBalance = server.moneyMax;
        amountToGrow = targetBalance - currentBalance;
    } else {
        amountToGrow = growAmount;
        targetBalance = currentBalance + growAmount;
    }

    let cores;
    if (isPerformanceIndicator) {
        cores = Math.log(targetBalance / (server.moneyMax - amountToGrow)) / Math.log(calculateServerGrowth(ns, server, ns.getPlayer(), 1, server.minDifficulty));
    } else {
        for (cores = 0; currentBalance < targetBalance && cores < CORE_CUTOFF; cores++) {
            const serverGrowth = calculateServerGrowth(ns, server, ns.getPlayer(), 1, currentSecurity);
            currentBalance *= serverGrowth;
            currentSecurity += 0.004;
        }

        if (cores >= CORE_CUTOFF) {
            ns.tprint("*** Possible error, reached max grow estimation. Server balance might be so low its impractical to grow or actually need this many grows");
            throw "Possible error, reached max grow estimation. Server balance might be so low its impractical to grow or actually need this many grows";
        }
    }

    return cores;
}

export function determineMaxHack(ns, server, growServers, isPerformanceIndicator = false) {
    let originalBalance;
    if (isPerformanceIndicator) {
        originalBalance = server.moneyMax;
    } else {
        originalBalance = ns.getServerMoneyAvailable(server.hostname);
        if (originalBalance < server.moneyMax - 1000) {
            ns.tprint("Server not completely grown");
            throw "Server not completely grown"
        }

    }

    let currentBalance = originalBalance;

    let currentSecurity;
    if (isPerformanceIndicator) {
        currentSecurity = server.minDifficulty;
    } else {
        currentSecurity = ns.getServerSecurityLevel(server.hostname);
        if (currentSecurity !== server.minDifficulty) {
            ns.tprint("Got current security " + currentSecurity + " when it should be " + server.minDifficulty);
        }
    }


    for (let i = 0; i < growServers && currentBalance > 1000; i++) {
        const serverGrowth = calculateServerGrowth(ns, server, ns.getPlayer(), 1, currentSecurity);
        currentBalance /= serverGrowth;
        currentSecurity += 0.004 // We are growing in reverse but the security level isn't currently simulated if we subtract. Adding correctly simulates the changes
        if (currentSecurity < server.minDifficulty) {
            currentSecurity = server.minDifficulty;
        }
    }


    const player = ns.getPlayer();
    const percentageHacked = calculatePercentMoneyHacked(ns, server, player, server.minDifficulty);
    if (percentageHacked <= 0) {
        return {
            hackCores: 0,
            amountHacked: 0
        }
    }
    // ns.tprint(`cb: ${currentBalance}, ob: ${originalBalance}, p: ${percentageHacked}`);

    // (balance - (Math.floor(balance * percentHacked) * x)) * (percentGrown ^ y);

    // topBalance - (Math.floor(topBalance * percentHacked) * x) = lowBalance
    // topBalance - lowBalance = Math.floor(topBalance * percentHacked) * x
    // (topBalance - lowBalance) / Math.floor(topBalance * percentHacked) =  x

    const amountHacked = originalBalance - currentBalance;
    const hackCores = (amountHacked) / Math.floor(originalBalance * percentageHacked);

    return {
        hackCores: hackCores,
        amountHacked: amountHacked
    }
}


/* ************

   The following code is taken from the game source code. I have made small changes but the overall formulas remain the same

************* */


/**
 * Returns time it takes to complete a hack on a server, in seconds
 */
export function calculateHackingTime(server, player, securityLevel = -1) {
    const hackingDifficulty = (securityLevel === -1) ? server.minDifficulty : securityLevel
    const difficultyMult = server.requiredHackingSkill * hackingDifficulty;

    const baseDiff = 500;
    const baseSkill = 50;
    const diffFactor = 2.5;
    let skillFactor = diffFactor * difficultyMult + baseDiff;
    // tslint:disable-next-line
    skillFactor /= player.hacking + baseSkill;

    const hackTimeMultiplier = 5;
    return (hackTimeMultiplier * skillFactor) /
        (player.hacking_speed_mult * calculateIntelligenceBonus(player.intelligence, 1));
}


/**
 * Returns the chance the player has to successfully hack a server
 */
export function calculateHackingChance(server, player, ignoreHackingLevel = false) {
    const hackFactor = 1.75;
    const hackingDifficulty = ignoreHackingLevel ? server.minDifficulty : server.hackDifficulty
    const difficultyMult = (100 - hackingDifficulty) / 100;
    const skillMult = hackFactor * player.hacking;
    const skillChance = (skillMult - server.requiredHackingSkill) / skillMult;
    const chance =
        skillChance * difficultyMult * player.hacking_chance_mult * calculateIntelligenceBonus(player.intelligence, 1);
    if (chance > 1) {
        return 1;
    }
    if (chance < 0) {
        return 0;
    }

    return chance;
}

export function calculateIntelligenceBonus(intelligence, weight = 1) {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}

/**
 * Returns the percentage of money that will be stolen from a server if
 * it is successfully hacked (returns the decimal form, not the actual percent value)
 */
export function calculatePercentMoneyHacked(ns, server, player, securityLevel = 0) {
    // Adjust if needed for balancing. This is the divisor for the final calculation
    const balanceFactor = 240;

    let hackingDifficulty;
    if (securityLevel === 0) {
        hackingDifficulty = server.hackDifficulty;
    } else {
        hackingDifficulty = securityLevel;
    }

    const difficultyMult = (100 - hackingDifficulty) / 100;
    const skillMult = (player.hacking - (server.requiredHackingSkill - 1)) / player.hacking;
    const percentMoneyHacked = (difficultyMult * skillMult * player.hacking_money_mult) / balanceFactor;

    if (percentMoneyHacked < 0) {
        return 0;
    }
    if (percentMoneyHacked > 1) {
        return 1;
    }

    return percentMoneyHacked;
}

/**
 * Returns time it takes to complete a grow operation on a server, in seconds
 */
export function calculateGrowTime(server, player, securityLevel = -1) {
    const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2

    return growTimeMultiplier * calculateHackingTime(server, player, securityLevel);
}

/**
 * Returns time it takes to complete a weaken operation on a server, in seconds
 */
export function calculateWeakenTime(server, player, securityLevel = -1) {
    const weakenTimeMultiplier = 4; // Relative to hacking time

    return weakenTimeMultiplier * calculateHackingTime(server, player, securityLevel);
}

export function numCycleForGrowth(ns, server, growth, player, cores = 1, ignoreHackingLevel = false) {
    // const hackingDifficulty = ignoreHackingLevel ? 0 : server.hackDifficulty
    // const ServerBaseGrowthRate = 1.0;
    // const ServerMaxGrowthRate = 1.0035;
    // let ajdGrowthRate = 1 + ((ServerBaseGrowthRate - 1) / hackingDifficulty);
    // if (ajdGrowthRate > ServerMaxGrowthRate) {
    //   ajdGrowthRate = ServerMaxGrowthRate;
    // }

    const serverGrowthPercentage = server.serverGrowth / 100;

    const coreBonus = 1 + ((cores - 1) / 16);

    const cycles = Math.log(growth) / (player.hacking_grow_mult * serverGrowthPercentage * coreBonus);

    return Math.round(cycles * -1);
}


export function calculateServerGrowth(ns, server, player, threads, security_level, cores = 1) {
    const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

    //Get adjusted growth rate, which accounts for server security
    const growthRate = 1.03;
    let adjGrowthRate = 1 + (growthRate - 1) / security_level;
    if (adjGrowthRate > 1.0035) {
        adjGrowthRate = 1.0035;
    }

    //Calculate adjusted server growth rate based on parameters
    const serverGrowthPercentage = server.serverGrowth / 100;
    const numServerGrowthCyclesAdjusted =
        numServerGrowthCycles * serverGrowthPercentage;

    //Apply serverGrowth for the calculated number of growth cycles
    const coreBonus = 1 + (cores - 1) / 16;
    return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * player.hacking_grow_mult * coreBonus);
}