//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWhitelist.sol";

contract CryptoDevs is ERC721Enumerable, Ownable {
    
    //To set tokenURI which will be concatenation of baseURI and tokenId.
    string _baseTokenURI;    
    //Price of one Crypto DEV NFT  
    uint256 public _price = 0.01 ether;    
    //Pause the contract in case of emergency
    bool public _paused; 
    // max number of NFTs to be minted         
    uint256 public maxTokenIds = 20;       
    // total number of tokenids minted  
    uint public tokenIds;
    // Whitelist contract instance 
    IWhitelist whitelist;
    //keep track of whether presale started or not
    bool public presaleStarted; 
    //timestamp for when presale would end
    uint256 public presaleEnded; 
    modifier onlyWhenNotPaused{
        require(!_paused,"Contract currently paused");
        _;
    }

    constructor (string memory baseURI, address whitelistContract) ERC721("Crypto Devs","CD"){
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    // starts a presale for the whitelisted addresses
    function startPresale() public onlyOwner {
        presaleStarted = true;
        presaleEnded = block.timestamp + 5 minutes;
    }

    //allow user to mint one NFT per transaction during the presale

    function presaleMint() public payable onlyWhenNotPaused {

        require(presaleStarted && block.timestamp < presaleEnded, "Presale is not running"); 
        require(whitelist.whitelistedAddress(msg.sender), "You are not whitelisted");
        require(tokenIds <maxTokenIds, "Exceeded maximum Crypto Devs supply");
        require(msg.value >= _price, "Ether sent is not correct");
        tokenIds += 1;
        // _safeMint is a safer version of _mint
        _safeMint(msg.sender,tokenIds);
    }
    
    //allows user to mint 1 NFT per transaction after the presale has ended.
    
    function mint() public payable onlyWhenNotPaused {
        require(presaleStarted && block.timestamp >= presaleEnded, "Presale is still running");
        require(tokenIds <maxTokenIds, "Exceeded maximum Crypto Devs supply");
        require(msg.value >= _price, "Ether sent is not correct");
        tokenIds += 1;
        _safeMint(msg.sender,tokenIds);
    }

    //_baseURI overides the OpenZeppelin's ERC721 implementation which by default returned an empty string for the baseURI
    
    function _baseURI() internal view override returns(string memory){
        return _baseTokenURI;
    }

    function setPaused(bool val) public onlyOwner {
        _paused = val;
    }
    
    //sends all the ether in the contract to the owner of the contract

    function withdraw() public onlyOwner {
        address _owner = owner();
        uint amount = address(this).balance;
        (bool sent,) = _owner.call{value: amount}("");
        require(sent,"Failed to send Ether");
    }
    //function to recieve Ether msg.data must be empty
    receive() external payable{}
    //fallback function is called when msg.data is not empty
    fallback() external payable{}
}