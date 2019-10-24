# Yet Another Trading Bot
*Potatoes and black holes*

### Requires
- Node v12.13.0

### Installation
```sh
$ npm install
```

### Configuration
- Add Binance keys to `providers/binance/config.js`
- Create your advisor file(s) in `advisors/` folder
- Set desired advisors in `config.js`

### Usage
```sh
$ npm run start
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
