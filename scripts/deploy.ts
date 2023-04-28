import { ethers } from "hardhat";

async function main() {
  const baseTokenURI = "https://ipfs.io/ipfs/";

  const ERC721PetRobots = await ethers.getContractFactory("ERC721PetRobots");
  const erc721 = await ERC721PetRobots.deploy(baseTokenURI);

  await erc721.deployed();

  console.log("ERC721PetRobots:", erc721.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
