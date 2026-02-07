// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CrabTradeNFT
 * @dev ERC-721 NFT contract for commemorating notable trades by the CrabTrader agent
 */
contract CrabTradeNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;

    // Counter for token IDs
    uint256 private _tokenIdCounter;

    // Struct to store trade metadata
    struct TradeRecord {
        string market;          // Market name/ID
        string position;        // YES/NO or LONG/SHORT
        uint256 entryPrice;     // Entry price in basis points (e.g., 5000 = 0.50)
        uint256 exitPrice;      // Exit price in basis points
        int256 pnlBps;          // Profit/Loss in basis points (can be negative)
        uint256 timestamp;      // Block timestamp
        string commentary;       // AI-generated commentary
    }

    // Mapping from token ID to trade record
    mapping(uint256 => TradeRecord) public trades;

    // Event emitted when a trade NFT is minted
    event TradeMinted(
        uint256 indexed tokenId,
        string market,
        int256 pnlBps,
        address indexed minter
    );

    constructor(address initialOwner) ERC721("CrabTrade NFT", "CRABTRADE") Ownable(initialOwner) {
        _tokenIdCounter = 1; // Start from token ID 1
    }

    /**
     * @dev Mint a new NFT for a notable trade
     * @param market Market name/ID
     * @param position Position type (YES/NO/LONG/SHORT)
     * @param entryPrice Entry price in basis points
     * @param exitPrice Exit price in basis points
     * @param pnlBps Profit/Loss in basis points
     * @param commentary AI-generated commentary
     */
    function mintTrade(
        string memory market,
        string memory position,
        uint256 entryPrice,
        uint256 exitPrice,
        int256 pnlBps,
        string memory commentary
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Store trade record
        trades[tokenId] = TradeRecord({
            market: market,
            position: position,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            pnlBps: pnlBps,
            timestamp: block.timestamp,
            commentary: commentary
        });

        // Mint NFT to owner (the agent)
        _safeMint(owner(), tokenId);

        // Set token URI (can be updated later with setTokenURI)
        string memory tokenURI = string(abi.encodePacked(
            "https://crabtrader.xyz/nft/",
            tokenId.toString()
        ));
        _setTokenURI(tokenId, tokenURI);

        emit TradeMinted(tokenId, market, pnlBps, owner());

        return tokenId;
    }

    /**
     * @dev Check if a trade is notable based on P&L threshold
     * @param pnlBps Profit/Loss in basis points
     * @return true if trade is notable (|pnlBps| > 2000, i.e., >20%)
     */
    function isNotableTrade(int256 pnlBps) public pure returns (bool) {
        // Notable if absolute value of P&L is greater than 2000 basis points (20%)
        int256 absPnl = pnlBps < 0 ? -pnlBps : pnlBps;
        return absPnl > 2000;
    }

    /**
     * @dev Get trade record for a token ID
     * @param tokenId Token ID
     * @return TradeRecord struct
     */
    function getTrade(uint256 tokenId) public view returns (TradeRecord memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return trades[tokenId];
    }

    /**
     * @dev Get total supply of minted NFTs
     * @return Total number of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    /**
     * @dev Override tokenURI to return custom metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Update token URI (only owner)
     */
    function updateTokenURI(uint256 tokenId, string memory newURI) public onlyOwner {
        _setTokenURI(tokenId, newURI);
    }
}
