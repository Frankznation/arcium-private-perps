const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy CrabTradeNFT
  const CrabTradeNFT = await hre.ethers.getContractFactory("CrabTradeNFT");
  const nft = await CrabTradeNFT.deploy(deployer.address);

  await nft.waitForDeployment();
  const address = await nft.getAddress();

  console.log("CrabTradeNFT deployed to:", address);
  console.log("\nSet this in your .env file:");
  console.log(`NFT_CONTRACT_ADDRESS=${address}`);

  // Verify on BaseScan (optional)
  if (hre.network.name === "base") {
    console.log("\nTo verify on BaseScan, run:");
    console.log(`npx hardhat verify --network base ${address} ${deployer.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
