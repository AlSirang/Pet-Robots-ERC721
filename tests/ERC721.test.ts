// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use as chaiUse } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { ERC721PetRobots } from "../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { BLOCK_NUMBER } from "../hardhat.config";
chaiUse(chaiAsPromised);

/// ************** CONSTANTS **************** ///
const ONE_ETH = ethers.utils.parseEther("1");
const BASE_URI = "http://dummy.url/";
const TOKEN_URI = `${BASE_URI}1.json`;
const TOKEN_ONE = 1;
const NAME = "Pet Robots";
const SYMBOL = "PT";
const MAX_SUPPLY = 4444;
const RESERVED_TOKENS = 150;
const PUBLIC_SUPPLY = MAX_SUPPLY - RESERVED_TOKENS;
const ERC1155_DROE = "0x35c742c97ae97632f3a7c98a405cc4034f034ce3";

/// ************** TESTS **************** ///
describe("PetRobots", async function () {
  let nft: ERC721PetRobots;
  let accounts: SignerWithAddress[];

  let deployer: SignerWithAddress; // owner of the Contract
  let accountX: SignerWithAddress; // any account which is not owner of the contract
  let minter: SignerWithAddress; // minter

  beforeEach(async function () {
    // reset Block
    await reset(process.env.ETH_MAINNET_URL, BLOCK_NUMBER);

    accounts = await ethers.getSigners();

    deployer = accounts[0];
    accountX = accounts[1];
    minter = accounts[2];

    const ERC721PetRobots = await ethers.getContractFactory("ERC721PetRobots");
    nft = await ERC721PetRobots.deploy(BASE_URI, ERC1155_DROE);

    await Promise.all([nft.toggleMintStatus(), nft.toggleRedeemStatus()]);
  });

  /***** test case 1 ******/
  describe("deploy contract, test state values:", () => {
    it("name", async () => {
      expect(await nft.name()).to.eq(NAME);
    });

    it("symbol", async () => {
      expect(await nft.symbol()).to.eq(SYMBOL);
    });
    it("base url", async () => {
      expect(await nft.symbol()).to.eq(SYMBOL);
    });

    it("max supply", async () => {
      expect(await nft.maxPetsSupply()).to.eq(MAX_SUPPLY);
    });
  });

  /***** test case 2 ******/
  describe("deploy contract, test mint", () => {
    const tokens = 1;
    let mintPrice: BigNumberish;
    let receipt: any;

    beforeEach(async () => {
      mintPrice = await nft.mintPrice();
      const value = mintPrice.mul(tokens);
      receipt = await nft.connect(minter).mint(tokens, {
        value,
      });
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(tokens);
    });

    it("BASE + TOKEN URI", async () => {
      let tokenURI = await nft.tokenURI(TOKEN_ONE);
      expect(tokenURI).to.eq(TOKEN_URI);
    });

    it("owner", async () => {
      expect(await nft.ownerOf(TOKEN_ONE)).to.eq(minter.address);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(minter.address)).to.eq(tokens);
    });

    it("should emit Transfer Event", async () => {
      const TransferEventArgs = [
        ethers.constants.AddressZero,
        minter.address,
        TOKEN_ONE,
      ];
      await expect(receipt)
        .to.emit(nft, "Transfer")
        .withArgs(...TransferEventArgs);
    });

    it("low price", async () => {
      const volume = 3;

      const mintPrice = await nft.mintPrice();
      ERC1155_DROE;

      await expect(
        nft.mint(volume, {
          value: mintPrice.mul(volume - 1),
        })
      ).to.revertedWith("LowPrice");
    });
  });

  /***** test case 3 ******/
  describe("deploy contract, mint from reserve", function () {
    const toknesMinted = 10;
    let receipt: any;
    beforeEach(async () => {
      receipt = await nft.mintFromReserve(accountX.address, toknesMinted);
    });

    it("balance", async () => {
      expect(await nft.balanceOf(accountX.address)).to.eq(toknesMinted);
    });

    it("should decrease reserve", async () => {
      expect(await nft.reservePets()).to.eq(RESERVED_TOKENS - toknesMinted);
    });

    it("total supply", async () => {
      expect(await nft.totalSupply()).to.eq(toknesMinted);
    });
  });

  /***** test case 4 ******/
  describe("deploy contract, royalties update info", () => {
    let mintPriceWei: BigNumberish;

    beforeEach(async () => {
      const mintPrice = await nft.mintPrice();
      mintPriceWei = mintPrice.mul(1);
    });

    /***** test case 4.1 ******/
    describe("update royalties Amount", () => {
      it("not owner ", async () => {
        await expect(nft.connect(accountX).setRoyalties("0")).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("should revert for percentage 0 ", async () => {
        await expect(nft.setRoyalties("0")).to.reverted;
      });

      it("royalty amount", async () => {
        const royalties = 10 * 100; // royalties percentage
        await nft.setRoyalties(royalties);

        let royaltyAmount = null;

        await nft.connect(minter).mint(1, { value: mintPriceWei });
        ({ royaltyAmount } = await nft.royaltyInfo(TOKEN_ONE, ONE_ETH));
        const percentage = 1 * (royalties / 10000);
        expect(royaltyAmount).to.be.eq(
          ethers.utils.parseEther(percentage.toString())
        );
      });
    });

    /***** test case 4.2 ******/
    describe(" update royalties receiver", () => {
      it("not owner ", async () => {
        await expect(
          nft.connect(accountX).setRoyaltiesReciver(accountX.address)
        ).to.revertedWith("Ownable: caller is not the owner");
      });

      it("update royalites receiver ", async () => {
        await nft.setRoyaltiesReciver(accountX.address);

        await nft.connect(minter).mint(1, { value: mintPriceWei });
        let { receiver } = await nft.royaltyInfo(TOKEN_ONE, ONE_ETH);

        expect(receiver).to.be.eq(accountX.address);
      });
    });
  });

  /***** test case 5 ******/
  describe("deploy contract, test supports interfaces", () => {
    // the interface id can be foud on the eip page https://eips.ethereum.org/EIPS/eip-721
    it("supports the IERC721 interface", async () => {
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.equal(true);
    });

    it("supports the IERC721Metadata interface", async () => {
      expect(await nft.supportsInterface("0x5b5e139f")).to.be.equal(true);
    });

    it("supports the IERC165 interface", async () => {
      expect(await nft.supportsInterface("0x01ffc9a7")).to.be.equal(true);
    });

    it("supports the IERC2981 interface", async () => {
      expect(await nft.supportsInterface("0x2a55205a")).to.be.equal(true);
    });
  });

  /***** test case 6 ******/
  describe("deploy contract, mint all public tokens", () => {
    beforeEach(async () => {
      await nft.setMintPrice(0);
      await nft.setWalletLimit(MAX_SUPPLY);
      await nft.mint(PUBLIC_SUPPLY);
    });
    it("total supply should be equal to max supply", async () => {
      expect(await nft.totalSupply()).to.eq(PUBLIC_SUPPLY);
    });
    it("balace of caller should be equal to max supply", async () => {
      expect(await nft.balanceOf(deployer.address)).to.eq(PUBLIC_SUPPLY);
    });
  });

  /***** test case 7 ******/
  describe("deploy contract, transfer ownership", () => {
    it("update the owner", async () => {
      await nft.transferOwnership(accountX.address);
      expect(await nft.owner()).to.eq(accountX.address);
    });
  });

  /***** test case 8 ******/
  describe("deploy contract, mint all tokens", function () {
    describe("mint all tokens from reserve", function () {
      beforeEach(async () => {
        await nft.mintFromReserve(deployer.address, RESERVED_TOKENS);
      });

      it("balance", async () => {
        expect(await nft.balanceOf(deployer.address)).to.eq(RESERVED_TOKENS);
      });

      it("should revert on reserve limit exceeded", async () => {
        await expect(nft.mintFromReserve(minter.address, 1)).revertedWith(
          "PetsExceeded"
        );
      });
    });

    describe("mint all reserve tokens, than public supply", () => {
      beforeEach(async () => {
        await nft.mintFromReserve(deployer.address, RESERVED_TOKENS);
        await nft.setMintPrice("0");
        await nft.setWalletLimit(MAX_SUPPLY);

        for (let i = 0; i < 4; i++) {
          let volume = 1000;
          if (accounts[i].address == deployer.address)
            volume -= RESERVED_TOKENS;

          await nft.connect(accounts[i]).mint(volume);
        }

        // mint last 444 NFTs
        await nft.connect(accounts[5]).mint(444);
      });

      it("mint public nfts", async () => {
        for (let i = 0; i < 4; i++) {
          let volume = 1000;
          expect(await nft.balanceOf(accounts[i].address)).to.eq(volume);
        }
      });

      it(`total public supply should be ${PUBLIC_SUPPLY}`, async () => {
        const totalSupply = await nft.totalSupply();

        expect(totalSupply.sub(RESERVED_TOKENS)).to.eq(PUBLIC_SUPPLY);
      });

      it(`total supply should be ${MAX_SUPPLY}`, async () => {
        expect(await nft.totalSupply()).to.be.eq(MAX_SUPPLY);
      });

      it(`return correct owner for token ${MAX_SUPPLY}`, async () => {
        expect(await nft.ownerOf(MAX_SUPPLY)).to.be.eq(accounts[5].address);
      });
      it(`revert on reading information for tokenId above ${MAX_SUPPLY}`, async () => {
        await expect(nft.ownerOf(MAX_SUPPLY + 1)).to.reverted;
      });
    });
  });

  //  max supply test
  describe("mint more than max supply", () => {
    beforeEach(async () => {
      await Promise.all([
        nft.mintFromReserve(deployer.address, RESERVED_TOKENS),
        nft.setMintPrice("0"),
        nft.setWalletLimit(MAX_SUPPLY + MAX_SUPPLY),
      ]);
      await nft.mint(PUBLIC_SUPPLY);
    });

    it("total supply should be 10000", async () => {
      expect(await nft.totalSupply()).to.be.eq(MAX_SUPPLY);
    });

    it("should revert mint for max  max supply exceeded", async () => {
      const exceededAmount = 1;

      await expect(nft.mint(exceededAmount)).to.revertedWith("PetsExceeded");
    });
  });
});
