export function calculate(ns, contractData) {
    var maxValue = Number.MIN_VALUE;
    var currentValue = 0;

    for(var num of contractData) {
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