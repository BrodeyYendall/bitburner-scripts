import * as AlgorithmicStockTraderI from "/contracts/AlgorithmicStockTraderI.js"
import * as AlgorithmicStockTraderII from "/contracts/AlgorithmicStockTraderII.js"
import * as AlgorithmicStockTraderIII from "/contracts/AlgorithmicStockTraderIII.js"
import * as ArrayJumpingGame from "/contracts/ArrayJumpingGame.js"
import * as FindLargestPrimeFactor from "/contracts/FindLargestPrimeFactor.js"
import * as MinimumPathSuminaTriangle from "/contracts/MinimumPathSuminaTriangle.js"
import * as SpiralizeMatrix from "/contracts/SpiralizeMatrix.js"
import * as SubarraywithMaximumSum from "/contracts/SubarraywithMaximumSum.js"
import * as TotalWaystoSum from "/contracts/TotalWaystoSum.js"
import * as UniquePathsinaGridI from "/contracts/UniquePathsinaGridI.js"
import * as MergeOverlappingIntervals from "/contracts/MergeOverlappingIntervals.js"

import * as ServerScan from "ServerScan.js"

export async function main(ns) {
    let scanResults = ServerScan.breathFirstScan(ns);

    let allServers = scanResults.openServers.concat(scanResults.rootedServers).concat(scanResults.lockedServers);
    for (let server of allServers) {
        if (server.name != null) {
            let foundContracts = ns.ls(server.name, ".cct");
            for (let contract of foundContracts) {
                await solveContract(ns, contract, server.name);
            }
        }
    }
}

async function solveContract(ns, contract, serverName) {
    let contractType = ns.codingcontract.getContractType(contract, serverName);
    let contractData = ns.codingcontract.getData(contract, serverName)
    ns.tprint("Solving " + contract + " from " + serverName + " which is " + contractType);

    let answer;
    switch (contractType) {
        case "Algorithmic Stock Trader I":
            answer = AlgorithmicStockTraderI.calculate(ns, contractData);
            break;
        case "Algorithmic Stock Trader II":
            answer = AlgorithmicStockTraderII.calculate(ns, contractData);
            break;
        case "Algorithmic Stock Trader III":
            answer = AlgorithmicStockTraderIII.calculate(ns, contractData);
            break;
        // case "Algorithmic Stock Trader IV":
        // 	answer = await AlgorithmicStockTraderIV.calculate(ns, contractData[1], contractData[0]);
        // 	break;
        case "Array Jumping Game":
            answer = ArrayJumpingGame.calculate(ns, contractData);
            break;
        case "Find Largest Prime Factor":
            answer = FindLargestPrimeFactor.calculate(ns, contractData);
            break;
        case "Minimum Path Sum in a Triangle":
            answer = MinimumPathSuminaTriangle.calculate(ns, contractData);
            break;
        case "Spiralize Matrix":
            answer = SpiralizeMatrix.calculate(ns, contractData);
            break;
        case "Subarray with Maximum Sum":
            answer = SubarraywithMaximumSum.calculate(ns, contractData);
            break;
        case "Total Ways to Sum":
            answer = TotalWaystoSum.calculate(ns, contractData);
            break;
        case "Unique Paths in a Grid I":
            answer = UniquePathsinaGridI.calculate(ns, contractData);
            break;
        case "Merge Overlapping Intervals":
            answer = MergeOverlappingIntervals.calculate(ns, contractData);
            break;
        default:
            ns.tprint("**** Contract not implemented (" + contract + ")****\n\n");
            return false;
    }

    let contractReward = ns.codingcontract.attempt(answer, contract, serverName, {returnReward: true});
    if (contractReward === "") {
        ns.tprint(`Failed to solve "${contract}" with [${contractData}] = ${answer}`);
    } else {
        ns.tprint(`Successfully solved "${contract}" with [${contractData}] = ${answer}`);
        ns.tprint("** Reward Recieved: " + contractReward)
    }
}