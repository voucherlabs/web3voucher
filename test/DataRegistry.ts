import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

import { accessControlErrorRegex } from "./utils";

const OWNER_TOKEN_ID = 0;
const OTHER_TOKEN_ID = 1;

describe("DataRegistry", function(){
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployDataRegistryFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const nftCollection = await ethers.deployContract("NFT", [owner.address]);
    const dataRegistry = await ethers.deployContract("DataRegistry", [owner.address]);

    // grant roles
    const minterRole = await nftCollection.MINTER_ROLE();
    await nftCollection.grantRole(minterRole, owner.address);

    const writeRole = await dataRegistry.WRITER_ROLE();
    await dataRegistry.grantRole(writeRole, owner.address);

    // mint an NFT on collection to be used for data writing
    await nftCollection.safeMint(owner.address);
    await nftCollection.safeMint(otherAccount.address);

    return {dataRegistry, nftCollection, owner, otherAccount};
  }

  // fixture for mocking data written to registry
  async function mockData() {
    const [owner, other] = await ethers.getSigners();

    const key = ethers.id("foobar");
    const abiCoder = new ethers.AbiCoder();      
    const value = abiCoder.encode(["address","uint256"], [other.address, 12345]);

    return {key, value};
  }

  // fixture for mocking data schema
  async function mockSchema(){
    const key = ethers.id("foobar");
    const schema = "transfer(address,uint256)";

    //console.log(`key RLP encoded ${key}`);
    //console.log(`schema RLP encoded ${schema}`);

    return {key, schema};
  }

  describe("Deployment", function(){

    it("Should deploy success", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      
      expect(await dataRegistry.getAddress()).to.be.a.properAddress;
      expect(await nftCollection.getAddress()).to.be.a.properAddress;
    });

    it("Should mint NFT success", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);

      expect(await nftCollection.ownerOf(OWNER_TOKEN_ID)).to.equal(owner.address);
      expect(await nftCollection.ownerOf(OTHER_TOKEN_ID)).to.equal(otherAccount.address);
    });

    it("Should grant role properly", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);

      const writerRole = await dataRegistry.WRITER_ROLE();
      const minterRole = await nftCollection.MINTER_ROLE();

      expect(await dataRegistry.hasRole(writerRole, owner.address)).to.equal(true);
      expect(await nftCollection.hasRole(minterRole, owner.address)).to.equal(true);

      expect(await dataRegistry.hasRole(writerRole, otherAccount.address)).to.equal(false);
      expect(await nftCollection.hasRole(minterRole, otherAccount.address)).to.equal(false);
    });

  });

  describe("ReadWriteData", function(){
    it("Should write data reverted due to zero address requester", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.write(ethers.ZeroAddress, nftCollection.target, OTHER_TOKEN_ID, key, value))
             .to.be.revertedWith("Requester must be live account");
    });

    it("Should safeWrite data reverted due to zero address requester", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.safeWrite(ethers.ZeroAddress, nftCollection.target, OTHER_TOKEN_ID, key, value))
             .to.be.revertedWith("Requester must be true owner of NFT");
    });

    it("Should safeWrite data reverted due to invalid nftCollection address", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);

      const [signer1, signer2, signer3] = await ethers.getSigners();
      
      await expect(dataRegistry.safeWrite(otherAccount.address, signer3.address, OTHER_TOKEN_ID, key, value))
             .to.be.revertedWith("Requester must be true owner of NFT");
    });

    it("Should write data failed due to unauthorized access", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.connect(otherAccount).write(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value))
             .to.be.revertedWith(accessControlErrorRegex());
    });

    it("Should safeWrite data failed due to unauthorized access", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.connect(otherAccount).safeWrite(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value))
             .to.be.revertedWith(accessControlErrorRegex());
    });

    it("Should safeWrite data failed due to invalid owner", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.safeWrite(otherAccount.address, nftCollection.target, OWNER_TOKEN_ID, key, value))
             .to.be.revertedWith("Requester must be true owner of NFT");
    });

    it("Should write data successfully", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);

      expect(await dataRegistry.write(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value)).to.not.be.reverted;
      expect(await dataRegistry.read(nftCollection.target, OTHER_TOKEN_ID, key)).to.equal(value);      
    });

    it("Should safeWrite data successfully", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);

      expect(await dataRegistry.safeWrite(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value)).to.not.be.reverted;
      expect(await dataRegistry.read(nftCollection.target, OTHER_TOKEN_ID, key)).to.equal(value);      
    });
  });

  describe("Schema", function(){
    it("Should set schema reverted due to unauthorized access", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, schema} = await loadFixture(mockSchema);

      await expect(dataRegistry.connect(otherAccount).setSchema(key, schema)).to.be.revertedWith(accessControlErrorRegex());
    });

    it("Should set schema successfully", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, schema} = await loadFixture(mockSchema);

      await expect(dataRegistry.setSchema(key, schema)).to.not.be.reverted;
      expect(await dataRegistry.getSchema(key)).to.equal(schema);
    });
  });

  describe("Events", function(){
    it("Should emit Write event on writing data", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, value} = await loadFixture(mockData);
      
      await expect(dataRegistry.write(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value))
             .to.emit(dataRegistry, "Write")
             .withArgs(otherAccount.address, nftCollection.target, OTHER_TOKEN_ID, key, value);
    });

    it("Should emit Schema event on setting schema", async function(){
      const {dataRegistry, nftCollection, owner, otherAccount} = await loadFixture(deployDataRegistryFixture);
      const {key, schema} = await loadFixture(mockSchema);
      
      await expect(dataRegistry.setSchema(key, schema))
             .to.emit(dataRegistry, "Schema")
             .withArgs(key, schema);
    });    
  });

});