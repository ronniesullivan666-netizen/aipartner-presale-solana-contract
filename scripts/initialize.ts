// 在文件最上方添加未捕获异常的全局监听
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 未捕获的 Promise 异常:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("💥 未捕获的全局异常:", err);
  process.exit(1);
});

import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction, 
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 开始执行预售合约初始化脚本...");

  // 1. 配置网络连接与管理员 Wallet
  const rpcUrl = "https://mainnet.helius-rpc.com/?api-key=37673d77-fa71-41d2-9572-b8d4defa5cee";
  const walletPath = "/root/.config/solana/secure-id.json";

  if (!fs.existsSync(walletPath)) {
    throw new Error(`找不到 Wallet 密钥文件: ${walletPath}`);
  }

  const rawWalletKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(rawWalletKey));
  const wallet = new anchor.Wallet(adminKeypair);

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  console.log("📌 管理员钱包地址:", wallet.publicKey.toString());

  // 2. 加载 IDL 文件
  const idlPath = path.resolve(__dirname, "../target/idl/aipartner_presale.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`找不到 IDL 文件: ${idlPath}`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const programId = new PublicKey("7P31pbAExHjzeyr6Y9y2fjmnjLezd4sKDZ5rfvwzZxet");
  idl.address = programId.toString();

  const program = new Program(idl as Idl, provider);
  console.log("📌 合约 Program ID:", program.programId.toString());

  // 3. 配置 Mint 与派生地址
  const aipartnerMint = new PublicKey("gEGxuSEFogvopZkZqH3aPU6LqQzUGnUZfeHcqmZ52s8");
  const presaleStateKeypair = Keypair.generate();

  console.log("\n==========================================");
  console.log("⭐ [重要] 请记录 Presale State 地址:");
  console.log("Presale State Pubkey:", presaleStateKeypair.publicKey.toString());
  console.log("==========================================\n");

  const [presaleAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale_authority"), presaleStateKeypair.publicKey.toBuffer()],
    program.programId
  );
  console.log("📌 Presale Authority PDA:", presaleAuthority.toString());

  const vaultAipartnerAccount = getAssociatedTokenAddressSync(
    aipartnerMint,
    presaleAuthority,
    true
  );
  console.log("📌 Vault AIPartner ATA:", vaultAipartnerAccount.toString());

  // 4. 检查预售金库 ATA 是否存在
  const vaultAccountInfo = await connection.getAccountInfo(vaultAipartnerAccount);
  let preInstructions = [];
  if (!vaultAccountInfo) {
    console.log("🔨 预售金库 ATA 未创建，添加创建 ATA 指令...");
    const createAtaIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      vaultAipartnerAccount,
      presaleAuthority,
      aipartnerMint
    );
    preInstructions.push(createAtaIx);
  }

  const rate = new anchor.BN(100);

  // 5. 发送交易（严格按照 Rust 源码的账户顺序排列 keys）
  console.log("⌛ 正在提交初始化交易到 Solana 主网...");

  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const data = Buffer.alloc(8 + 8);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(rate.toString()), 8);

  const tx = new anchor.web3.Transaction().add(
    ...preInstructions,
    new anchor.web3.TransactionInstruction({
      programId: program.programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },                  // admin
        { pubkey: aipartnerMint, isSigner: false, isWritable: false },                    // aipartner_mint
        { pubkey: vaultAipartnerAccount, isSigner: false, isWritable: true },             // vault_aipartner_account
        { pubkey: presaleAuthority, isSigner: false, isWritable: false },                 // presale_authority
        { pubkey: presaleStateKeypair.publicKey, isSigner: true, isWritable: true },      // presale_state
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },                 // token_program
      ],
      data: data,
    })
  );

  const txHash = await provider.sendAndConfirm(tx, [presaleStateKeypair]);

  console.log("\n🎉 初始化成功！");
  console.log("交易签名 (TxHash):", txHash);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ 执行出错:", err);
    process.exit(1);
  });