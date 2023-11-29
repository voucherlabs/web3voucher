// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IDynamic {
  // events
  event Write(address requester, address nftCollection, uint256 tokenId, bytes32 key, bytes value);
  event Schema(bytes32 key, string schema);

  // metadata getters / setters
  function write(address requester, address nftCollection, uint256 tokenId, bytes32 key, bytes calldata value) external returns (bool);  // unsafe setter
  function safeWrite(address requester, address nftCollection, uint256 tokenId, bytes32 key, bytes calldata value) external returns (bool);  // setter with safe checks

  function read(address nftCollection, uint256 tokenId, bytes32 key) external view returns (bytes memory);

  // data schema getters / setters
  function setSchema(bytes32 key, string calldata schema) external returns (bool);
  function getSchema(bytes32 key) external view returns (string memory);  
}