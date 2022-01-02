export function calculate(ns, contractData) {
    let maxValue = Number.MIN_VALUE;
    let currentValue = 0;

    for(let num of contractData) {
        // If all numbers are negative then this will catch the highest negative number
        if(num > maxValue) {
            maxValue = num;
        }

        currentValue += num;

        if(currentValue < 0) {
            currentValue = 0;
        } else {
            if(currentValue > maxValue) {
                maxValue = currentValue
            }
        }
    }

    return maxValue;
}