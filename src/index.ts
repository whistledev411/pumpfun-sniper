import {
    Connection,
    Keypair,
} from "@solana/web3.js";
import base58 from "bs58";
import dotnet from 'dotenv'
import { commitment, PUMP_FUN_PROGRAM } from "./constants";
import buyToken from "./pumputils/utils/buyToken";
import { convertHttpToWebSocket, formatDate } from "./utils/commonFunc";

dotnet.config();

// Get Env info

const rpc = process.env.RPC_ENDPOINT;
console.log("🚀 ~ rpc:", rpc)
const payer = process.env.PRIVATE_KEY;
console.log("🚀 ~ payer:", payer)
const devwallet = process.env.DEV_WALLET_ADDRESS;
console.log("🚀 ~ devwallet:", devwallet)
const buyamount = process.env.BUY_AMOUNT;
console.log("🚀 ~ buyamount:", buyamount)


const tokenDevWalletSniper = async (rpcEndPoint: string, payer: string, solIn: number, devWallet: string) => {
    try {
        const payerKeypair = Keypair.fromSecretKey(base58.decode(payer));
        let isBuying = false;
        const connection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "confirmed" });
        const logConnection = new Connection(rpcEndPoint, { wsEndpoint: convertHttpToWebSocket(rpcEndPoint), commitment: "processed" });
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
                    let isDev = false;
                    let dev = '';
                    const allAccounts = parsedTransaction?.transaction.message.accountKeys;
                    for (let i = 0; i < allAccounts.length; i++) {
                        const account = allAccounts[i].pubkey.toString();
                        if (account === devWallet) {
                            isDev = true;
                            dev = account;
                        }
                    }
                    if (!isDev) return;
                    console.log("Dev wallet => ", `https://solscan.io/address/${dev}`);
                    const mint = parsedTransaction?.transaction.message.accountKeys[1].pubkey;
                    console.log('new token => ', `https://solscan.io/token/${mint.toString()}`)
                    await stopListener()
                    isBuying = true;
                    try {
                        console.log("Global listener is removed!");
                    } catch (err) {
                        console.log(err);
                    }
                    console.log(' going to start buying =>')
                    console.time('first')
                    const sig = await buyToken(mint, connection, payerKeypair, solIn, 1);
                    console.timeEnd('first')
                    if (!sig) {
                        // isBuying = false;
                    } else {
                        console.log('Buy success')
                    }
                }
            },
            commitment
        );

    } catch (err) {
        console.log(err);
        return { stopListener: undefined };
    }
};




tokenDevWalletSniper(rpc!, payer!, Number(buyamount!), devwallet!)