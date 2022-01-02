export function calculate(ns, contractData) {
    let answer = 0;

    let currentMax = 0;
    for (let i = 0; i <= currentMax; i++) {
        let newMax = i + contractData[i];

        if (newMax > currentMax) {
            currentMax = newMax;
        }

        if (currentMax >= contractData.length - 1) {
            answer = 1;
        }
    }

    return answer;
}