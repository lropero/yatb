# CryptoBot
*Potatoes and black holes*

### Requires
- Node v10.15.1
- Yarn v1.13.0

### Installation
```sh
$ yarn
```

### Configuration
- Add Binance keys to `providers/binance/config.js`
- Create your advisor file(s) in `advisors/` folder
- Set desired advisors in `config.js`

### Usage
```sh
$ yarn run start
```
- "a" -> Next advisor
- "c" -> Next chart
- "d" -> Show chart data
- "f" -> Show funds
- "k" -> Close trades
- "l" -> Show logs
- "p" -> Pause/unpause trading
- "q" -> Quit
- "t" -> Show trades
- "v" -> Show trade details (from chart with trade)
- "x" -> Previous chart
- "z" -> Cycle charts with open trades

### Upgrading dependencies
```sh
$ yarn run upgrade
$ yarn run nuke
```
