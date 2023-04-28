// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// =============================================================
//                       ERRORS
// =============================================================

/// When public spawning has not yet started
error SpawningIsPaused();

/// Zero NFTs spawn. Wallet can spawn at least one NFT.
error ZeroTokensSpawn();

/// For price check. msg.value should be greater than or equal to spawn price
error LowPrice();

/// Max supply limit exceed error
error PetsExceeded();

contract ERC721PetRobots is ERC721A, Ownable, IERC2981 {
    using Strings for uint256;

    uint16 public constant maxPetsSupply = 4444; // maxPetsSupply =  + reservePets + publicPetsSupply
    uint16 private constant _publicPetsSupply = 4444; // tokens avaiable for public
    uint16 public reservePets = 350; // tokens reserve for the owner

    uint16 private _totalPublicPets; // number of tokens minted from public supply
    uint16 private _royalties = 700; // royalties in bps 1% = (1 *100) = 100 bps

    uint256 public spawnPrice = 0.015 ether; // spawn price per token
    bool public isSpawning;

    address public royaltiesReciver; // EOA for as royalties receiver for collection
    string public baseURI; // token base uri

    // =============================================================
    //                       MODIFIERS
    // =============================================================

    modifier spawnRequirements(uint16 volume) {
        if (!isSpawning) revert SpawningIsPaused();
        if (volume == 0) revert ZeroTokensSpawn();

        // todo: add logic for ERC1155 balance / paid mint
        _;
    }

    // =============================================================
    //                       FUNCTIONS
    // =============================================================

    /**
     * @dev  It will spawn from tokens allocated for public
     * @param volume is the quantity of tokens to be spawn
     */
    function spawn(uint16 volume) external payable spawnRequirements(volume) {
        _maxSupplyCheck(volume);
        _safeMint(_msgSender(), volume);
    }

    /**
     * @dev spawn function only callable by the Contract owner. It will spawn from reserve tokens for owner
     * @param to is the address to which the tokens will be spawn
     * @param volume is the quantity of tokens to be spawn
     */
    function spawnFromReserve(address to, uint16 volume) external onlyOwner {
        if (volume > reservePets) revert PetsExceeded();
        reservePets -= volume;
        _safeMint(to, volume);
    }

    // =============================================================
    //                       PRIVATE FUNCTIONS
    // =============================================================

    /**
     * @dev private function to compute max supply limit
     */
    function _maxSupplyCheck(uint16 volume) private {
        uint16 totalPets = _totalPublicPets + volume;
        if (totalPets > _publicPetsSupply) revert PetsExceeded();
        _totalPublicPets = totalPets;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @dev it is only callable by Contract owner. it will toggle spawn status
     */
    function toggleSpawningStatus() external onlyOwner {
        isSpawning = !isSpawning;
    }

    /**
     * @dev it will update spawn price
     * @param _spawnPrice is new value for spawn
     */
    function setSpawnPrice(uint256 _spawnPrice) external onlyOwner {
        spawnPrice = _spawnPrice;
    }

    /**
     * @dev it will update baseURI for tokens
     * @param _uri is new URI for tokens
     */
    function setBaseURI(string memory _uri) external onlyOwner {
        baseURI = _uri;
    }

    /**
     * @dev it will update the address for royalties receiver
     * @param _account is new royalty receiver
     */
    function setRoyaltiesReciver(address _account) external onlyOwner {
        require(_account != address(0));
        royaltiesReciver = _account;
    }

    /**
     * @dev it will update the royalties for token
     * @param royalties_ new percentage of royalties. it should be  in bps (1% = 1 *100 = 100). 6.9% => 6.9 * 100 = 690
     */
    function setRoyalties(uint16 royalties_) external onlyOwner {
        require(royalties_ > 0, "should be > 0");
        _royalties = royalties_;
    }

    /**
     * @dev it is only callable by Contract owner. it will withdraw balace of contract
     */
    function withdraw() external onlyOwner {
        bool success = payable(msg.sender).send(address(this).balance);
        require(success, "Transfer failed!");
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @dev it will return tokenURI for given tokenIdToOwner
     * @param tokenId is valid token id mint in this contract
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(
        bytes4 _interfaceId
    ) public view virtual override(ERC721A, IERC165) returns (bool) {
        return
            _interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /**
     *  @dev it retruns the amount of royalty the owner will receive for given tokenId
     *  @param tokenId is valid token number
     *  @param value is amount for which token will be traded
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 value
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        require(
            _exists(tokenId),
            "ERC2981RoyaltyStandard: Royalty info for nonexistent token"
        );
        return (royaltiesReciver, (value * _royalties) / 10000);
    }

    /**
     * @dev Returns the starting token ID.
     * To change the starting token ID, please override this function.
     */
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    // =============================================================
    //                      CONSTRUCTOR
    // =============================================================

    constructor(string memory _uri) ERC721A("Pet Robots", "PT") {
        baseURI = _uri;
        royaltiesReciver = msg.sender;
    }
}
