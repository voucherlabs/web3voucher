// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IDynamic.sol";

contract DataRegistry is AccessControl, IDynamic {
  using Address for address;

  // rbac roles
  bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

  // data schemas  
  mapping (address => mapping (uint256 => mapping (bytes32 => bytes))) _registry;
  mapping (bytes32 => string) _schemas;

  struct DataRecord {
    bytes32 key;
    bytes value;
  }

  constructor(address defaultAdmin) {
    _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
  }

  function write(address requester, address nftCollection, uint256 tokenId, bytes32 key, bytes calldata value)
    public onlyRole(WRITER_ROLE)    
    returns (bool)
  {
    require(requester != address(0), "Requester must be live account");
    _registry[nftCollection][tokenId][key] = value;

    // emit onchain events
    emit Write(requester, nftCollection, tokenId, key, value);

    return true;
  }

  function _requesterIsNFTOwner(address requester, address nftCollection, uint256 tokenId) private view returns (bool) {
    if (requester == address(0)) return false;
    if (!nftCollection.isContract()) return false;
    if (IERC721(nftCollection).ownerOf(tokenId) != requester) return false; // TODO
    return true;
  }

  function safeWrite(address requester, address nftCollection, uint256 tokenId, bytes32 key, bytes calldata value)
    public onlyRole(WRITER_ROLE)    
    returns (bool)
  {
    require(_requesterIsNFTOwner(requester, nftCollection, tokenId), "Requester must be true owner of NFT");
    _registry[nftCollection][tokenId][key] = value;

    // emit onchain events
    emit Write(requester, nftCollection, tokenId, key, value);

    return true;
  }

  function read(address nftCollection, uint256 tokenId, bytes32 key) public view returns (bytes memory) {
    return _registry[nftCollection][tokenId][key];
  }

  function setSchema(bytes32 key, string calldata schema)
    public onlyRole(WRITER_ROLE)
    returns (bool) {
    _schemas[key] = schema;

    // emit onchain events
    emit Schema(key, schema);

    return true;
  }

  function getSchema(bytes32 key)
    public view
    returns (string memory) {
      return _schemas[key];
    }

}