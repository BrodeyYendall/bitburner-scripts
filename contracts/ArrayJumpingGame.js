export function calculate(ns, contractData) {
    var answer = 0;

    var currentMax = 0;
    for(var i = 0; i <= currentMax; i++) {
        var newMax = i + contractData[i];

        if(newMax > currentMax) {
            currentMax = newMax;
        }

        if(currentMax >= contractData.length - 1) {
            answer = 1;
        }
    }

    return answer;
}