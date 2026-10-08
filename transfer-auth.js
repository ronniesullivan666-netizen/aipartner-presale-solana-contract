const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, TransactionInstruction } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    const oldWalletSecret = JSON.parse(fs.readFileSync("old-wallet.json", "utf-8"));
    const newWalletSecret = JSON.parse(fs.readFileSync("new-wallet.json", "utf-8"));
    
    const oldWallet = Keypair.fromSecretKey(Uint8Array.from(oldWalletSecret));
    const newWallet = Keypair.fromSecretKey(Uint8Array.from(newWalletSecret));

    console.log("Old Wallet (Current Authority):", oldWallet.publicKey.toBase58());
    console.log("New Wallet (Target Authority):", newWallet.publicKey.toBase58());

    const bpfLoaderUpgradeableId = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
    const programId = new PublicKey("AgBSRTVFzdjV9ChfqEEJHCca2mn11Unw1vtZsP3NhqmN");
    
    const [programDataAccount] = PublicKey.findProgramAddressSync(
        [programId.toBuffer()],
        bpfLoaderUpgradeableId
    );

    // Instruction index 3 代表 SetUpgradeAuthority
    const data = Buffer.alloc(4);
    data.writeUInt32LE(3, 0); 

    // 补齐官方要求的完整 3 个账户：[ProgramData, 旧钱包, 新钱包]
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: programDataAccount, isSigner: false, isWritable: true },
            { pubkey: oldWallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: newWallet.publicKey, isSigner: false, isWritable: false },
        ],
        programId: bpfLoaderUpgradeableId,
        data: data,
    });

    const transaction = new Transaction().add(instruction);

    console.log("Sending transaction...");
    const txid = await sendAndConfirmTransaction(
        connection,
        transaction,
        [oldWallet],
        { commitment: "confirmed" }
    );

    console.log("✅ Successfully transferred upgrade authority!");
    console.log("Transaction Signature:", txid);
}

main().catch(err => {
    console.error("❌ Error:", err);
});
