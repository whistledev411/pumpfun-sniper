# 🤖Solana Pumpfun Sniper

You can snipe and trade tokens on pumpfun.

You can filter tokens by creator or token ticker/symbol.

 (Yellowstone gRPC + jito + nextblock + bloxroute + temperal)

## Update Version2(Yellowstone GRPC mode)

I completed version2 that can snipe in 1 or 2 blocks after mint.

### Example Transactions

https://solscan.io/tx/5q1EZZsWWAhAzWqLFY1238Brr6Go1aLTu8G3sAebMWLUZSAnwfnUA7LMvfbPmdcxhbANM7FAWB8DtwTiedPieraR

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

Pumpfun sniper

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
