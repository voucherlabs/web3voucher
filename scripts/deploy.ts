import { ethers } from "hardhat";
import { setTimeout } from "timers/promises";

const WAITING_SETTLE_TIME = 10000; // in miliseconds

async function main() {
  let [signer] = await ethers.getSigners();

  const token = await ethers.deployContract("USDT", [signer.address, signer.address]);
  console.log(`Deploy ERC20 contract at address ${token.target}`);

  const nft = await ethers.deployContract("NFT", [signer.address]);
  console.log(`Deploy NFT-collection contract at address ${nft.target}`);

  const dataRegistry = await ethers.deployContract("DataRegistry", [signer.address]);
  console.log(`Deploy Data-registry contract at address ${dataRegistry.target}`);

  const voucher = await ethers.deployContract("Voucher", [
    token.target, nft.target, dataRegistry.target
  ]);
  console.log(`Deploy Voucher contract at address ${voucher.target}`);

  // grant roles
  // the role name must be hashed in local, because deployed contracts above is not verified yet
  // in order to interact with unverified contract on networks, we need to cast contract to predefined ABI via deployed address
  // then call the predefined function grantRole
  // we also need to wait a few seconds for networks to settle up, this is the difference between local networks and real networks

  console.log(`Waiting a few seconds for networks to settle up...`);
  await setTimeout(WAITING_SETTLE_TIME);

  const nft2 = await ethers.getContractAt("AccessControl", nft.target);
  const dataRegistry2 = await ethers.getContractAt("AccessControl", dataRegistry.target);

  const minterERC721Role = ethers.id("MINTER_ROLE");  
  let grantRoleTx = await nft2.grantRole(minterERC721Role, voucher.target);
  let receipt = await grantRoleTx.wait();
  console.log(`Grant MINTER role to Voucher contract ${voucher.target}`);

  const writerRole = ethers.id("WRITER_ROLE");
  grantRoleTx = await dataRegistry2.grantRole(writerRole, voucher.target);
  receipt = await grantRoleTx.wait();
  console.log(`Grant WRITER role to Voucher contract ${voucher.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});