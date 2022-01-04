export function calculate(ns, contractData) {
    if (contractData.length > 1) {
        let iIncrement = 0
        let jIncrement = 1;

        let result = [];
        let visited = new Array(contractData.length);
        // for(let i = 0; i < visited.length; i++) {
        //     let subArray = new Array(contractData[0].length);
        //     subArray.fill(false);
        //     visited[i] = subArray;
        // }
        //
        // prettyPrint(ns, contractData, visited);
        // ns.tprint(visited);

        let i = 0;
        let j = 0;

        while (true) {
            if (i >= contractData.length || j >= contractData[i].length || i < 0 || j < 0 || visited[i][j]) {
                // go back
                i -= iIncrement;
                j -= jIncrement;

                // change direction
                if (iIncrement === 0 && jIncrement === 1) {
                    iIncrement = 1;
                    jIncrement = 0;
                } else if (iIncrement === 1 && jIncrement === 0) {
                    iIncrement = 0;
                    jIncrement = (-1);
                } else if (iIncrement === 0 && jIncrement === -1) {
                    iIncrement = (-1);
                    jIncrement = 0;
                } else if (iIncrement === -1 && jIncrement === 0) {
                    iIncrement = 0;
                    jIncrement = 1;
                }

                // go forward
                i += iIncrement;
                j += jIncrement;

                if (visited[i][j]) {
                    break;
                }
            }

            result.push(contractData[i][j]);
            visited[i][j] = true;
            i += iIncrement;
            j += jIncrement;


            // ns.tprint(`i: ${i}, j: ${j}, ic: ${iIncrement}, jc: ${jIncrement}`);
            // ns.tprint(result);
            // prettyPrint(ns, contractData, visited);
            // await ns.sleep(500);
        }

        return result;
    } else {
        return contractData;
    }
}

// export function prettyPrint(ns, data, visited) {
// 	let print = "\n";
// 	for(let i = 0; i < data.length; i++) {
// 		for(let j = 0; j < data[i].length; j++) {
// 			if(visited[i][j]) {
// 				print += "--,";
// 			} else {
// 				print += data[i][j] + (data[i][j] < 10 ? " ":"") + ",";
// 			}
// 		}
// 		print += "\n";
// 	}
// 	ns.tprint(print);
// }