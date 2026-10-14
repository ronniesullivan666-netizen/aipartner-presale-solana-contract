import fs from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  // 1. 获取 Hardhat 的编译器配置与构建输入
  const compilerConfig = hre.config.solidity.compilers[0];
  
  // 2. 构造 Solidity 标准 JSON 输入格式 (Standard JSON Input)
  const input = {
    language: "Solidity",
    sources: {},
    settings: {
      optimizer: {
        enabled: compilerConfig.settings.optimizer.enabled,
        runs: compilerConfig.settings.optimizer.runs,
      },
      evmVersion: compilerConfig.settings.evmVersion,
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
        }
      }
    }
  };

  // 3. 读取 contracts 目录下的所有合约源码
  const contractsDir = path.join(process.cwd(), "contracts");
  const files = fs.readdirSync(contractsDir);
  
  for (const file of files) {
    if (file.endsWith(".sol")) {
      const filePath = path.join(contractsDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      input.sources[`contracts/${file}`] = { content };
    }
  }

  // 如果项目引用了 node_modules 中的依赖（如 @openzeppelin），Hardhat 的标准输入也可以包含或由编译器自动解析。
  // 将生成的 JSON 写入文件
  const outputPath = path.join(process.cwd(), "standard-input.json");
  fs.writeFileSync(outputPath, JSON.stringify(input, null, 2));
  console.log(`Standard JSON 文件已成功生成: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});