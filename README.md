# CryptoBot
*Potatoes and black holes*

### Installation
Node v9.11.2
Yarn v1.13.0
```sh
$ yarn
```

### Config
Add Binance keys to `providers/binance/config.js`
Create your advisor file(s) in `advisors/` folder
Set desired advisors in `config.js`

### Usage
```sh
$ yarn run start
```
"a" -> Next advisor
"c" -> Next chart
"d" -> Show chart data
"f" -> Show funds
"k" -> Close trades
"l" -> Show logs
"q" -> Quit
"t" -> Show trades
"v" -> Show trade details (from chart with trade)
"x" -> Previous chart
"z" -> Cycle charts with open trades

### Upgrade dependencies
```sh
$ yarn run upgrade
$ yarn run nuke
```
