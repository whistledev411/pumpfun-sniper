# 🤖Pumpfun Sniper

You can snipe and trade tokens on pumpfun.

You can filter tokens by creator or token ticker/symbol.

## Update Version2(Yellowstone GRPC mode)

I completed version2 that can snipe in 2~3 blocks after mint.

### Example Transactions

https://solscan.io/tx/3YnGCmgP1rFqWvtagnsKfTdBmGPWmN55QVSpFHt7oGpc1qcKmgsBZfpJ4PV88LRa9TteBhqys5Q2SvAmi3vvF6te
https://solscan.io/tx/4RB85q1K3TND6smuwYf2Ej9nLyAboJGSSa2YdgmGiYC5yPUDSoKXQrkLkJiCyQwzBKfxnQdyW1pxQbz4wsS3XJfY
https://solscan.io/tx/5ZvVvEynaWceyNeLkcSFBKLxy8wbJtkiUhUsA5daEgvL97oAgJQusjasAdHaXXBNj1LoJjCH2d5X4gpUGQaThTRv

# 💬Contact Me

If you have any question or something, feel free to reach out me anytime via telegram, discord or twitter.
<br>
#### 🌹You're always welcome🌹

Telegram: [@whistle](https://t.me/devbeast5775) <br>


# 👀Usage
1. Clone the repository

    ```
    git clone https://github.com/whistledev411/pumpfun-sniper.git
    cd pumpfun-sniper
    ```
2. Install dependencies

    ```
    npm install
    ```
3. Configure the environment variables

    Rename the .env.example file to .env and set RPC and WSS, main keypair's secret key, and others.

4. Run the bot

    ```
    npm start
    ```


## Geyser(GRPC) Mode.
If you have GRPC, you can monitor new Pump Token more quickly.
You can simply set the .env like following.

IS_GEYSER = true

GEYSER_RPC = 

## If you use NextBlock service, you can buy more quickly.

You can set the .env like following:

IS_NEXT = true

NEXT_BLOCK_API = 

NEXT_BLOCK_WALLET = 

NEXT_BLOCK_FEE = 

## Token Ticker Snipe

TICKER_MODE = true

TOKEN_TICKER = a

## Dev Wallet Snipe

DEV_MODE = true

DEV_WALLET_ADDRESS = 
