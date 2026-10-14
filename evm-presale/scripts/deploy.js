import hre from "hardhat";

async function main() {
  const FEE_RECEIVER = "0xc322cd9C8b583cd67A2293Bbf25c946F9934dF62"; // 实际收款地址
  const RELAYER_ADDRESS = "0xc322cd9C8b583cd67A2293Bbf25c946F9934dF62"; // 后端代扣服务器的钱包地址（你可以根据需要修改为你的后端热钱包地址）

  // 根据传入的 --network 参数动态匹配 USDT 合约地址
  const networkName = hre.network.name;
  let USDT_ADDRESS = "";

  if (networkName === "bsc") {
    USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BSC 主网 USDT
  } else if (networkName === "mainnet") {
    USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // 以太坊主网 USDT
  } else {
    throw new Error(`未配置当前网络 (${networkName}) 的 USDT 地址！`);
  }

  console.log(`正在部署 AIPartnerPresale 到 ${networkName} 网络...`);
  console.log(`使用的 USDT 地址: ${USDT_ADDRESS}`);
  console.log(`收款地址: ${FEE_RECEIVER}`);
  console.log(`代扣执行者 (Relayer) 地址: ${RELAYER_ADDRESS}`);

  const AIPartnerPresale = await hre.ethers.getContractFactory("AIPartnerPresale");
  // 传入 3 个构造函数参数
  const presale = await AIPartnerPresale.deploy(USDT_ADDRESS, FEE_RECEIVER, RELAYER_ADDRESS);

  await presale.waitForDeployment();
  const address = await presale.getAddress();

  console.log(`AIPartnerPresale 已成功部署到 ${networkName}，合约地址: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});