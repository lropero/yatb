# YATB 🤖

Yet another trading bot.

<img src="yatb.gif?raw=true" width="400">

### Requires

- Node v14.4.0

### Installation

```sh
$ npm install
```

### Configuration

- Create your advisor file(s) in `advisors/` folder and setup strategies (refer to `advisors/example.js`)
- Set provider and desired advisors in `config.js`

### Binance configuration

- Add Binance keys to `providers/binance/config.js`
- Set provider to 'binance' in `config.js`

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

- "a" → Next advisor
- "c" → Next chart
- "d" → Show chart data
- "f" → Show funds
- "k" → Close trades
- "l" → Show logs
- "p" → Pause/unpause trading
- "q" → Quit
- "t" → Show trades
- "v" → Show trade details (from chart with trade)
- "x" → Previous chart
- "z" → Cycle charts with open trades

### Architecture

Lorem ipsum dolor sit amet, consectetur adipiscing elit. In at fermentum turpis, interdum vulputate leo. Quisque rhoncus lectus molestie odio sodales dapibus id sed elit. Sed hendrerit varius felis, sodales vulputate dolor pretium et. Phasellus lorem mauris, vestibulum a feugiat id, imperdiet ultricies velit. Aenean euismod elit non libero commodo gravida. Maecenas urna leo, fringilla nec dui vitae, finibus imperdiet eros. Quisque elementum mauris et eros malesuada, nec pellentesque nisi ornare. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Vivamus efficitur, magna consequat pharetra laoreet, nulla nulla elementum velit, et imperdiet urna neque non erat. Vivamus vitae ullamcorper lectus. Fusce ut tempor risus. Suspendisse potenti. Nulla facilisi. Mauris a dolor eget lorem molestie tincidunt.

### Creating strategies

You can create your own strategies and use them within your advisor(s).
