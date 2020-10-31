# YATB 🤖

Yet another trading bot.

<img src="yatb.gif?raw=true" width="600">

### Requires

- Node v14.15.0
- Node.js native addon build tool → [node-gyp](https://github.com/nodejs/node-gyp)

### Installation

```sh
$ npm ci
```

### Configuration

- Create your advisor file(s) in `advisors` folder and setup strategies (refer to [advisors/example.js](https://github.com/lropero/yatb/blob/master/advisors/example.js))
- Set provider and desired advisors in `config.js`

### Binance configuration

- Set provider to 'binance' in `config.js`
- Add Binance keys to `providers/binance/config.js`

### Running the bot

```sh
# Run in safe mode
$ npm run start

# Run in console mode (safe)
$ npm run start:console

# Run in real mode
$ npm run start:real
```

### UI usage

```sh
a → Next advisor
c → Next chart
x → Previous chart
d → Show chart data (press again to change mode)
f → Show funds (press again to refresh)
l → Show logs (press again to scroll up)
t → Show trades
v → Show trade details (from chart with trade)
k → Close all trades
p → Pause/unpause trading
z → Cycle charts with open trades
q → Quit
```

### Architecture

YATB requires a market data provider (e.g. Binance) and can register N advisors upon initialization. An advisor is basically an array of sights, each sight having a symbol (e.g. `BTCUSDT`), timeframe (e.g. `5m`) and optionally strategies to follow. The bot will start receiving market data for each of the sights and will calculate indicators accordingly as required by strategies. Advisors will in turn be notified by the bot when market data has changed (i.e. a new candle has finished drawing) and execute strategies on data. If any strategy triggers a signal, the advisor will broadcast a message together with `trade` params for the strategy and the bot will pick it up, place an order, and manage the trade until it's closed. All this internal communication happens asynchronously using RxJS.

### Creating strategies

You can create your own strategies and use them within your advisor(s) (Node.js skills required), browse existing [strategies](https://github.com/lropero/yatb/tree/master/strategies) to see how they are built (TODO: write how-to-build-strategy documentation). You can use any of [these indicators](https://tulipindicators.org/list), refer to `Function Prototype` on each indicator from that list to build the `params` object required by strategies (or see how existing strategies match up things 😅).

Please consider naming and sharing your strategy by creating a pull request.

### Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

### TODO

- Add more providers
- Add more strategies
- Add tests
- TypeScript?

### License

[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/)
