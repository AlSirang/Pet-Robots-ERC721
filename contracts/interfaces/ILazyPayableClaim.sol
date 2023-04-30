// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface ILazyPayableClaim {
    /**
     * @notice allow a wallet to lazily claim a token according to parameters
     * @param creatorContractAddress the creator contract address
     * @param claimIndex the index of the claim for which we will mint
     * @param mintCount the number of claims to mint
     * @param mintIndices the mint index (only needed for merkle claims)
     * @param merkleProofs if the claim has a merkleRoot, verifying merkleProof ensures that address + minterValue was used to construct it (only needed for merkle claims)
     * @param mintFor mintFor must be the msg.sender or a delegate wallet address (in the case of merkle based mints)
     */
    function mintBatch(
        address creatorContractAddress,
        uint256 claimIndex,
        uint16 mintCount,
        uint32[] calldata mintIndices,
        bytes32[][] calldata merkleProofs,
        address mintFor
    ) external payable;
}
