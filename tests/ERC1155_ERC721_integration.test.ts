// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumberish, Transaction } from "ethers";
import { ethers } from "hardhat";
import { BLOCK_NUMBER } from "../hardhat.config";
import { ERC721PetRobots, IERC1155 } from "../typechain";

chaiUse(chaiAsPromised);

const BASE_URI = "http://dummy.url/";
const ERC1155_DROE = "0x35c742c97ae97632f3a7c98a405cc4034f034ce3"; // DROE ERC1155 CONTRACT ADDRESS
const DROE_EXTENSION = "0x35C742C97aE97632F3a7C98A405cC4034f034ce3";
const CLAIM_INDEX = 1073027312;
const MANI_FOLD_ADDRESS = "0xE7d3982E214F9DFD53d23a7f72851a7044072250";

/**
 * @dev these test cases should be run with forked mainnet
 */
describe("ERC1155_ERC721_integration.test", async function () {
  let nft: ERC721PetRobots;
  let DROE_ERC1155: IERC1155;
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress; // owner of the Contract
  let account2: SignerWithAddress; // owner of the Contract

  beforeEach(async () => {
    // reset Block
    await reset(process.env.ETH_MAINNET_URL, BLOCK_NUMBER);

    accounts = await ethers.getSigners();

    deployer = accounts[0];
    account2 = accounts[1];

    const ERC721PetRobots = await ethers.getContractFactory("ERC721PetRobots");
    nft = await ERC721PetRobots.deploy(BASE_URI, ERC1155_DROE);
    await nft.toggleSpawn();

    // CONNECT DROE ERC1155 CONTRACT
    DROE_ERC1155 = await ethers.getContractAt("IERC1155", ERC1155_DROE);

    // CONNECT MANI FOLD CONTRACT
    const MANI_FOLD = await ethers.getContractAt(
      "ILazyPayableClaim",
      MANI_FOLD_ADDRESS
    );

    await MANI_FOLD.mintBatch(
      DROE_EXTENSION,
      CLAIM_INDEX,
      12, // NFTs amount
      [],
      [],
      deployer.address,
      {
        value: ethers.utils.parseEther("0.09"),
      }
    );
  });

  describe("deploy ERC721, test spawn ", () => {
    let spawnPrice: BigNumberish;

    beforeEach(async () => {
      spawnPrice = await nft.spawnPrice();
    });

    describe("spawn for ETH", () => {
      let receipt: Transaction;
      beforeEach(async () => {
        receipt = await nft.spawn(1, {
          value: spawnPrice,
        });
      });
      it("should allow to spawn for price", async () => {
        expect(receipt).to.emit(nft, "Transfer");
      });
      it("should update ERC721 balanceOf", async () => {
        expect(await nft.balanceOf(deployer.address)).to.eq(1);
      });
    });

    describe("spawn for KeyCards", () => {
      let receipt: Transaction;

      beforeEach(async () => {
        await DROE_ERC1155.setApprovalForAll(nft.address, true);

        receipt = await nft.spawn(1);
      });

      it("should return allow to spawn for price", async () => {
        expect(receipt).to.emit(nft, "Transfer");
      });
      it("should update balanceOf", async () => {
        expect(await nft.balanceOf(deployer.address)).to.eq(1);
      });

      it("should burn correct KeyCards", async () => {
        expect(await DROE_ERC1155.balanceOf(deployer.address, 1)).to.eq(11);
      });
      it("should burn all KeyCards", async () => {
        await nft.spawn(11);
        expect(await DROE_ERC1155.balanceOf(deployer.address, 1)).to.eq(0);
      });
    });

    describe("spawn for KeyCards Failure cases", () => {
      it("should revert when ERC721 is not approved", async () => {
        await expect(nft.spawn(1)).to.reverted;
      });

      it("should revert when no KeyCards and ETH", async () => {
        await expect(nft.connect(account2).spawn(1)).to.revertedWith(
          "LowPrice"
        );
      });
    });
  });
});
