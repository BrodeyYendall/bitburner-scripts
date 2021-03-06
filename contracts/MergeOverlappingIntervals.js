export function calculate(ns, data) {
    let contractData = JSON.parse(JSON.stringify(data)); // Make a deep copy of the data for pretty prints

    let foundMerge = true;
    while (foundMerge) {
        foundMerge = false;
        for (let i = 0; i < contractData.length; i++) {
            let firstInterval = contractData[i];

            for (let j = 0; j < contractData.length; j++) {
                let secondInterval = contractData[j];

                if (secondInterval.length === 0 || i === j) {
                    continue;
                }

                // firstInterval starts inside the second interval
                if ((firstInterval[0] >= secondInterval[0] && firstInterval[0] <= secondInterval[1])) {
                    // ns.tprint(`Merging [${firstInterval}] and [${secondInterval}] at end`);

                    // If firstInterval finishes after secondInterval then change the "end" of the merge.
                    // If this is false then firstInterval is completely inside secondInterval
                    if (firstInterval[1] >= secondInterval[1]) {
                        contractData[j][1] = firstInterval[1];
                    }

                    contractData[i] = [];
                    foundMerge = true;

                    // ns.tprint(contractData);
                    break;
                    // firstInterval ends inside the second interval
                } else if (firstInterval[1] >= secondInterval[0] && firstInterval[1] <= secondInterval[1]) {
                    // ns.tprint(`Merging [${firstInterval}] and [${secondInterval}] at start`);

                    // If firstInterval finishes before secondInterval then change the "start" of the merge.
                    // If this is false then firstInterval is completely inside secondInterval
                    if (firstInterval[0] <= secondInterval[0]) {
                        contractData[j][0] = firstInterval[0];
                    }

                    contractData[i] = [];
                    foundMerge = true;

                    // ns.tprint(contractData);
                    break;
                }
            }
        }

        contractData = contractData.filter(data => data.length > 0);
        contractData.sort((a, b) => a[0] - b[0]); // Change order to ascending
    }

    return contractData;
}