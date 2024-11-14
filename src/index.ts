import {
    Connection,
    Keypair,
} from "@solana/web3.js";
import base58 from "bs58";
import dotnet from 'dotenv'
import { commitment, PUMP_FUN_PROGRAM } from "./constants";
import { convertHttpToWebSocket, formatDate } from "./utils/commonFunc";

import WebSocket = require("ws");

dotnet.config();


const rpc = process.env.RPC_ENDPOINT;
console.log("🚀 ~ rpc:", rpc)
const payer = process.env.PRIVATE_KEY;
console.log("🚀 ~ payer:", payer)
const devwallet = process.env.DEV_WALLET_ADDRESS;
console.log("🚀 ~ devwallet:", devwallet)
const buyamount = process.env.BUY_AMOUNT;
console.log("🚀 ~ buyamount:", buyamount)

const tokenDevWalletSniper = async (rpcEndPoint: string, payer: string, solIn: number, devAddr: string) => {
    try {
        const payerKeypair = Keypair.fromSecretKey(base58.decode(payer));
        let isBuying = false;
        const connection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
        const logConnection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
        let globalLogListener: any;

        // Function to stop the listener
        const stopListener = async () => {
            if (globalLogListener !== undefined) {
                try {
                    await logConnection.removeOnLogsListener(globalLogListener);
                    isBuying = true
                } catch (err) {
                    console.log("Error stopping listener:", err);
                }
            }
        };
        globalLogListener = logConnection.onLogs(
            PUMP_FUN_PROGRAM,
            async ({ logs, err, signature }) => {
                if (err) return
                const isMint = logs.filter(log => log.includes("MintTo")).length;
                if (isMint && !isBuying) {
                    const parsedTransaction = await logConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
                    if (!parsedTransaction) {
                        return;
                    }
                    console.log("new signature => ", `https://solscan.io/tx/${signature}`, await formatDate());
                    console.time('sig')
                    let dev = parsedTransaction?.transaction.message.accountKeys[0].pubkey.toString();

                    // if (dev === devAddr) return;

                    console.log("Dev wallet => ", `https://solscan.io/address/${dev}`);
                    const mint = parsedTransaction?.transaction.message.accountKeys[1].pubkey;
                    console.log('New token => ', `https://solscan.io/token/${mint.toString()}`)
                    await stopListener()
                    isBuying = true;
                    console.log('Going to start buying =>')
                    console.timeEnd('sig');
                    
                }
            },
            commitment
        );

    } catch (err) {
        console.log(err);
        return { stopListener: undefined };
    }
};


const withGaser = (rpcEndPoint: string, payer: string, solIn: number, devAddr: string) => {
    const GEYSER_RPC = process.env.GEYSER_RPC;
    if (!GEYSER_RPC) return console.log('Geyser RPC is not provided!');
    const ws = new WebSocket(GEYSER_RPC);
    const connection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
    const payerKeypair = Keypair.fromSecretKey(base58.decode(payer));
    function sendRequest(ws: WebSocket) {
        const request = {
            jsonrpc: "2.0",
            id: 420,
            method: "transactionSubscribe",
            params: [
                {
                    failed: false,
                    accountInclude: ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"]
                },
                {
                    commitment: "processed",
                    encoding: "jsonParsed",
                    transactionDetails: "full",
                    maxSupportedTransactionVersion: 0
                }
            ]
        };
        ws.send(JSON.stringify(request));
    }

    ws.on('open', function open() {
        console.log('WebSocket is open');
        sendRequest(ws);  // Send a request once the WebSocket is open
    });

    ws.on('message', async function incoming(data) {
        const messageStr = data.toString('utf8');
        try {
            const messageObj = JSON.parse(messageStr);

            const result = messageObj.params.result;
            const logs = result.transaction.meta.logMessages;
            const signature = result.signature; // Extract the signature
            const accountKeys = result.transaction.transaction.message.accountKeys.map((ak: { pubkey: any; }) => ak.pubkey);

            if (logs && logs.some((log: string | string[]) => log.includes('Program log: Instruction: InitializeMint2'))) {
                console.log('New pump.fun token!');
                console.log('tx:', `https://solscan.io/tx/${signature}`, formatDate());
                ws.close();
                
                console.time('sig');

                console.log('Creator:', accountKeys[0]);
                console.log('Token:', accountKeys[1]);

                const dev = accountKeys[0]
                const mint = accountKeys[1]

                // if (dev === devAddr) return;

                console.log("Dev wallet => ", `https://solscan.io/address/${dev}`);
                console.log('New token => ', `https://solscan.io/token/${mint.toString()}`)
                
                console.timeEnd('sig');
                console.log('Going to start buying =>')
                console.time('buy')
                

                // Log the first and second account keys if they exist

            }
        } catch (e) {

        }
    });

}

const runBot = () => {
    const isGeyser = process.env.IS_GEYSER === 'true';
    if (isGeyser) {
        console.log('Geyser mode selected!');
        withGaser(rpc!, payer!, Number(buyamount!), devwallet!);
    } else {
        console.log("Common Mode selected!");
        tokenDevWalletSniper(rpc!, payer!, Number(buyamount!), devwallet!)
    }
    console.log("🚀 ~ runBot ~ isGeyser:", isGeyser)
}

runBot()