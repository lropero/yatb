# Yet Another Trading Bot

_Potatoes and black holes_

### Requires

- Node v13.12.0
- Yarn v1.22.4

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
