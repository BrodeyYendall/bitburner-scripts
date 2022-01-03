My scripts which I use for game BitBurner by danielyxie https://github.com/danielyxie/bitburner

# TODO List
## Hacking
*. Determine available "hack threads" for weaken and hack. Find largest batchesa nd use those
*. Removing waiting on ports. E.g. when grow finishes, don't publish results to port and don't read results from port
*. Time weaken such that it occurs simultaneously with other operations, reducing downtime
*. Farm more than one server at a time. When the current target's growth ratio is too poor then 
reduce its thread usage and provide threads to the next best server