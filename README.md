My scripts which I use for game BitBurner by danielyxie https://github.com/danielyxie/bitburner

# TODO List
## Hacking
### Bugs
* Drain only works for the first initial loops
* calculateMaxHack is calculating incorrect values
* If drain port is full then threads will be release prematurely

### Features
* Time weaken such that it occurs simultaneously with other operations, reducing downtime
* Farm more than one server at a time. When the current target's growth ratio is too poor then 
reduce its thread usage and provide threads to the next best server