import { BigNumber } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
const { expect } = chai;

chai.use(solidity);

type DeployArguments = {
  name: string;
  symbol: string;
  mintingFee: BigNumber;
  firstTokenURL: string;
};

type Attribute = {
  trait_type: string;
  value: string;
};

type MetadataJSON = {
  description: string;
  image: string;
  name: string;
  attributes: Attribute[];
};

describe("Yoink", () => {
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  let deployArgs: DeployArguments;
  let mockTokenMetadataJSON: MetadataJSON;

  beforeEach(async () => {
    const [owner, second, third] = await ethers.getSigners();

    account1 = owner;
    account2 = second;
    account3 = third;

    deployArgs = {
      name: "Yoink",
      symbol: "YNK",
      mintingFee: ethers.utils.parseEther("0.01"),
      firstTokenURL: "https://wwww.testing.com",
    };

    mockTokenMetadataJSON = {
      description: "test description",
      image: "www.testing.com",
      name: "test name",
      attributes: [
        {
          trait_type: "test trait 1",
          value: "test value 1",
        },
        {
          trait_type: "test trait 2",
          value: "test value 2",
        },
      ],
    };
  });

  const getDeployedContract = async ({
    name,
    symbol,
    mintingFee,
    firstTokenURL,
  }: DeployArguments) => {
    const contractFactory = await ethers.getContractFactory("Yoink");
    const contract = await contractFactory.deploy(
      name,
      symbol,
      mintingFee,
      firstTokenURL
    );

    return contract;
  };

  describe("deploys", () => {
    it("assigns variables on deploy", async () => {
      deployArgs.mintingFee = ethers.utils.parseEther("1");
      const contract = await getDeployedContract(deployArgs);

      const nameTxn = await contract.name();
      expect(nameTxn).to.equal("Yoink");

      const symbolTxn = await contract.symbol();
      expect(symbolTxn).to.equal("YNK");

      const mintingFeeTxn = await contract.mintingFee();
      expect(mintingFeeTxn).to.equal(ethers.utils.parseEther("1").toString());
    });

    it("mints first NFT on deploy with correct metadata", async () => {
      const contract = await getDeployedContract(deployArgs);

      const ownerOfTxn = await contract.ownerOf(1);
      expect(ownerOfTxn).to.equal(account1.address);

      const firstTokenTxn = await contract.tokenURI(1);
      expect(firstTokenTxn).to.equal(deployArgs.firstTokenURL);
    });

    it("allows empty strings for initialvariables", async () => {
      deployArgs.name = "";
      deployArgs.symbol = "";
      deployArgs.firstTokenURL = "";
      const contract = await getDeployedContract(deployArgs);

      const tokenNameTxn = await contract.name();
      expect(tokenNameTxn).to.equal("");

      const tokenSymbolTxn = await contract.symbol();
      expect(tokenSymbolTxn).to.equal("");

      const firstTokenTxn = await contract.tokenURI(1);
      expect(firstTokenTxn).to.equal("");
    });

    it("allows 0 ether as minting fee", async () => {
      deployArgs.mintingFee = ethers.utils.parseEther("0");
      const contract = await getDeployedContract(deployArgs);

      const mintingFeeTxn = await contract.mintingFee();
      expect(mintingFeeTxn).to.equal(ethers.utils.parseEther("0"));
    });
  });

  describe("exempt addresses", () => {
    it("exempts an address if toggleExemptAddress is called", async () => {
      const contract = await getDeployedContract(deployArgs);

      let addressExemptionStatusTxn = await contract.exemptAddresses(
        account3.address
      );
      expect(addressExemptionStatusTxn).to.equal(false);

      await contract.toggleExemptAddresses([account3.address]);

      addressExemptionStatusTxn = await contract.exemptAddresses(
        account3.address
      );
      expect(addressExemptionStatusTxn).to.equal(true);
    });

    it("un-exempts an address with toggleExemptAddress", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.toggleExemptAddresses([account3.address]);
      let addressExemptionStatusTxn = await contract.exemptAddresses(
        account3.address
      );
      expect(addressExemptionStatusTxn).to.equal(true);

      await contract.toggleExemptAddresses([account3.address]);
      addressExemptionStatusTxn = await contract.exemptAddresses(
        account3.address
      );
      expect(addressExemptionStatusTxn).to.equal(false);
    });

    it("emits an AddExemptAddress event", async () => {
      const contract = await getDeployedContract(deployArgs);

      const addExemptAddressTxn = await contract.toggleExemptAddresses([
        account2.address,
      ]);
      expect(addExemptAddressTxn)
        .to.emit(contract, "AddExemptAddress")
        .withArgs(account2.address);
    });

    it("emits a RemoveExemptAddress event", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.toggleExemptAddresses([account2.address]);

      const removeExemptAddressTxn = await contract.toggleExemptAddresses([
        account2.address,
      ]);
      expect(removeExemptAddressTxn)
        .to.emit(contract, "RemoveExemptAddress")
        .withArgs(account2.address);
    });

    it("can toggle multiple addresses at once", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.toggleExemptAddresses([account2.address]);
      await contract.toggleExemptAddresses([
        account1.address,
        account2.address,
        account3.address,
      ]);

      const [account1Status, account2Status, account3Status] =
        await Promise.all([
          contract.exemptAddresses(account1.address),
          contract.exemptAddresses(account2.address),
          contract.exemptAddresses(account3.address),
        ]);

      expect(account1Status).to.equal(true);
      expect(account2Status).to.equal(false);
      expect(account3Status).to.equal(true);
    });

    it("emits multiple events at once", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.toggleExemptAddresses([account2.address]);
      const toggleExemptionTxn = await contract.toggleExemptAddresses([
        account1.address,
        account2.address,
        account3.address,
      ]);

      expect(toggleExemptionTxn)
        .to.emit(contract, "AddExemptAddress")
        .withArgs(account1.address);
      expect(toggleExemptionTxn)
        .to.emit(contract, "RemoveExemptAddress")
        .withArgs(account2.address);
      expect(toggleExemptionTxn)
        .to.emit(contract, "AddExemptAddress")
        .withArgs(account3.address);
    });

    it("allows toggling many times for same address", async () => {
      const contract = await getDeployedContract(deployArgs);
      let currentState = false;

      for (let i = 0; i < 100; i++) {
        const addressExemptionStatusTxn = await contract.exemptAddresses(
          account3.address
        );
        expect(addressExemptionStatusTxn).to.equal(currentState);

        await contract.toggleExemptAddresses([account3.address]);
        currentState = !currentState;
      }
    });

    it("throws error if non-owner calls it", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract
          .connect(account3)
          .toggleExemptAddresses([account1.address]);
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });
  });

  describe("mint NFT", () => {
    describe("with URL for URI", () => {
      it("mints an NFT with a URL for the token URI on deploy", async () => {
        const contract = await getDeployedContract(deployArgs);

        const firstTokenOwnerTxn = await contract.ownerOf(1);
        expect(firstTokenOwnerTxn).to.equal(account1.address);
      });

      it("mints an NFT with a URL for the token URI on function call", async () => {
        const contract = await getDeployedContract(deployArgs);

        const mockTokenURL = "www.testing.com";
        await contract["mintNFT(string)"](mockTokenURL);

        const secondTokenOwnerTxn = await contract.ownerOf(2);
        expect(secondTokenOwnerTxn).to.equal(account1.address);

        const secondTokenURITxn = await contract.tokenURI(2);
        expect(secondTokenURITxn).to.equal(mockTokenURL);
      });

      it("increments newTokenID each time", async () => {
        const contract = await getDeployedContract(deployArgs);

        for (let i = 1; i <= 10; i++) {
          const tokenIDTxn = await contract.newTokenID();
          expect(tokenIDTxn).to.equal(i);
          await contract["mintNFT(string)"]("www.testing.com");
        }
      });

      it("emits a MintToken event on deploy", async () => {
        const contract = await getDeployedContract(deployArgs);

        expect(contract.deployTransaction)
          .to.emit(contract, "MintToken")
          .withArgs(account1.address, 1);
      });

      it("emits a MintToken event", async () => {
        const contract = await getDeployedContract(deployArgs);

        const mintTokenTxn = await contract["mintNFT(string)"](
          "www.testing.com"
        );

        expect(mintTokenTxn)
          .to.emit(contract, "MintToken")
          .withArgs(account1.address, 2);
      });
    });

    describe("with JSON for URI", () => {
      it("mints an NFT with static token URI via function call", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract["mintNFT((string,string,string,(string,string)[]))"](
          mockTokenMetadataJSON
        );

        const secondTokenURITxn = await contract.tokenURI(2);
        // This trims off the "data:application/json;base64," portion of the string
        const [, base46EncodedMetadata] = secondTokenURITxn.split(",");

        expect(JSON.parse(atob(base46EncodedMetadata))).to.eql(
          mockTokenMetadataJSON
        );
      });

      it("increments newTokenID each time", async () => {
        const contract = await getDeployedContract(deployArgs);

        for (let i = 1; i <= 10; i++) {
          const tokenIDTxn = await contract.newTokenID();
          expect(tokenIDTxn).to.equal(i);
          // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
          await contract["mintNFT((string,string,string,(string,string)[]))"](
            mockTokenMetadataJSON
          );
        }
      });

      it("emits a MintToken event", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        const mintTokenTxn = await contract[
          "mintNFT((string,string,string,(string,string)[]))"
        ](mockTokenMetadataJSON);

        expect(mintTokenTxn)
          .to.emit(contract, "MintToken")
          .withArgs(account1.address, 2);
      });
    });
  });

  describe("minting fee", () => {
    it("can update the minting fee", async () => {
      const contract = await getDeployedContract(deployArgs);

      let currentMintingFeeTxn = await contract.mintingFee();
      expect(currentMintingFeeTxn).to.equal(deployArgs.mintingFee);

      const newMintingFee = ethers.utils.parseEther("1");
      await contract.updateMintingFee(newMintingFee);

      currentMintingFeeTxn = await contract.mintingFee();
      expect(currentMintingFeeTxn).to.equal(newMintingFee);
    });

    it("throws error if non-owner tries to call it", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract
          .connect(account3)
          .updateMintingFee(ethers.utils.parseEther("100"));
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("is not enforced if minting address is exempt", async () => {
      const contract = await getDeployedContract(deployArgs);

      await contract.toggleExemptAddresses([account2.address]);
      await contract.connect(account2)["mintNFT(string)"]("www.testing.com");

      const secondTokenOwnerTxn = await contract.ownerOf(2);
      expect(secondTokenOwnerTxn).to.equal(account2.address);
    });

    it("throws error if minting address is not exempt", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.connect(account2)["mintNFT(string)"]("www.testing.com");
      } catch (newError) {
        error = newError;
      }

      expect(String(error).indexOf("Yoink: invalid fee") > -1).to.equal(true);
    });

    it("allows not paying fee if msg.sender is owner", async () => {
      deployArgs.mintingFee = ethers.utils.parseEther("100");
      const contract = await getDeployedContract(deployArgs);

      // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
      await contract
        .connect(account1)
        ["mintNFT((string,string,string,(string,string)[]))"](
          mockTokenMetadataJSON
        );

      const secondTokenOwnerTxn = await contract.ownerOf(2);
      expect(secondTokenOwnerTxn).to.equal(account1.address);
    });

    it("allows any address to mint a token if paying minting fee", async () => {
      deployArgs.mintingFee = ethers.utils.parseEther("1");
      const contract = await getDeployedContract(deployArgs);

      // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
      await contract
        .connect(account2)
        ["mintNFT((string,string,string,(string,string)[]))"](
          mockTokenMetadataJSON,
          { from: account2.address, value: ethers.utils.parseEther("1") }
        );

      const contractBalanceTxn = await contract.provider.getBalance(
        contract.address
      );
      expect(contractBalanceTxn).to.equal(ethers.utils.parseEther("1"));

      const secondTokenOwnerTxn = await contract.ownerOf(2);
      expect(secondTokenOwnerTxn).to.equal(account2.address);
    });

    it("throws error if msg.value is less than minting fee", async () => {
      deployArgs.mintingFee = ethers.utils.parseEther("1");
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract
          .connect(account3)
          ["mintNFT((string,string,string,(string,string)[]))"](
            mockTokenMetadataJSON,
            {
              from: account3.address,
              value: ethers.utils.parseEther("0.9999999"),
            }
          );
      } catch (newError) {
        error = newError;
      }

      expect(String(error).indexOf("Yoink: invalid fee") > -1).to.equal(true);
    });
  });

  describe("updateTokenURI", () => {
    describe("with URL for URI", () => {
      it("updates token URI", async () => {
        const contract = await getDeployedContract(deployArgs);

        await contract["updateTokenURI(uint256,string)"](1, "www.updated.com");

        const firstTokenURITxn = await contract.tokenURI(1);
        expect(firstTokenURITxn).to.equal("www.updated.com");
      });

      it("throws error if calling address is not owner of token", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract
          .connect(account2)
          ["mintNFT((string,string,string,(string,string)[]))"](
            mockTokenMetadataJSON,
            { from: account2.address, value: ethers.utils.parseEther("1") }
          );

        let error;
        try {
          await contract["updateTokenURI(uint256,string)"](
            2,
            "www.updated.com"
          );
        } catch (newError) {
          error = newError;
        }

        expect(String(error).indexOf("Yoink: not token owner") > -1).to.equal(
          true
        );
      });

      it("emits UpdateTokenURI event", async () => {
        const contract = await getDeployedContract(deployArgs);

        const updateTokenURITxn = await contract
          .connect(account1)
          ["updateTokenURI(uint256,string)"](1, "www.updated.com");

        expect(updateTokenURITxn)
          .to.emit(contract, "UpdateTokenURI")
          .withArgs(account1.address, 1);
      });
    });

    describe("with JSON for URI", () => {
      it("updates token URI", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract[
          "updateTokenURI(uint256,(string,string,string,(string,string)[]))"
        ](1, mockTokenMetadataJSON);

        const firstTokenURITxn = await contract.tokenURI(1);
        // This trims off the "data:application/json;base64," portion of the string
        const [, base46EncodedMetadata] = firstTokenURITxn.split(",");

        expect(JSON.parse(atob(base46EncodedMetadata))).to.eql(
          mockTokenMetadataJSON
        );
      });

      it("handles metadata object with no attributes", async () => {
        const contract = await getDeployedContract(deployArgs);

        mockTokenMetadataJSON.attributes = [];

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract[
          "updateTokenURI(uint256,(string,string,string,(string,string)[]))"
        ](1, mockTokenMetadataJSON);

        const firstTokenURITxn = await contract.tokenURI(1);
        // This trims off the "data:application/json;base64," portion of the string
        const [, base46EncodedMetadata] = firstTokenURITxn.split(",");

        expect(JSON.parse(atob(base46EncodedMetadata))).to.eql(
          mockTokenMetadataJSON
        );
      });

      it("haneles metadata object with many attributes", async () => {
        const contract = await getDeployedContract(deployArgs);

        mockTokenMetadataJSON.attributes = [
          ...mockTokenMetadataJSON.attributes,
          {
            trait_type: "additional 1",
            value: "additional 1",
          },
          {
            trait_type: "additional 2",
            value: "additional 2",
          },
          {
            trait_type: "additional 3",
            value: "additional 3",
          },
        ];

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract[
          "updateTokenURI(uint256,(string,string,string,(string,string)[]))"
        ](1, mockTokenMetadataJSON);

        const firstTokenURITxn = await contract.tokenURI(1);
        // This trims off the "data:application/json;base64," portion of the string
        const [, base46EncodedMetadata] = firstTokenURITxn.split(",");

        expect(JSON.parse(atob(base46EncodedMetadata))).to.eql(
          mockTokenMetadataJSON
        );
      });

      it("throws error if calling address is not owner of token", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        await contract
          .connect(account2)
          ["mintNFT((string,string,string,(string,string)[]))"](
            mockTokenMetadataJSON,
            { from: account2.address, value: ethers.utils.parseEther("1") }
          );

        let error;
        try {
          // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
          await contract[
            "updateTokenURI(uint256,(string,string,string,(string,string)[]))"
          ](2, mockTokenMetadataJSON);
        } catch (newError) {
          error = newError;
        }

        expect(String(error).indexOf("Yoink: not token owner") > -1).to.equal(
          true
        );
      });

      it("emits UpdateTokenURI event", async () => {
        const contract = await getDeployedContract(deployArgs);

        // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
        const updateTokenURITxn = await contract[
          "updateTokenURI(uint256,(string,string,string,(string,string)[]))"
        ](1, mockTokenMetadataJSON);

        expect(updateTokenURITxn)
          .to.emit(contract, "UpdateTokenURI")
          .withArgs(account1.address, 1);
      });
    });
  });

  describe("withdrawing ether", () => {
    it("allows the owner of the contract to withdraw", async () => {
      const contract = await getDeployedContract(deployArgs);

      // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
      await contract["mintNFT((string,string,string,(string,string)[]))"](
        mockTokenMetadataJSON,
        {
          from: account1.address,
          value: ethers.utils.parseEther("1"),
        }
      );

      let contractBalanceTxn = await contract.provider.getBalance(
        contract.address
      );
      expect(contractBalanceTxn).to.equal(ethers.utils.parseEther("1"));

      await contract.connect(account1).withdrawAllEther();

      contractBalanceTxn = await contract.provider.getBalance(contract.address);
      expect(contractBalanceTxn).to.equal(ethers.utils.parseEther("0"));
    });

    it("throws an error if a non-owner address attempts to withdraw", async () => {
      const contract = await getDeployedContract(deployArgs);

      // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
      await contract["mintNFT((string,string,string,(string,string)[]))"](
        mockTokenMetadataJSON,
        {
          from: account1.address,
          value: ethers.utils.parseEther("1"),
        }
      );

      let error;
      try {
        await contract.connect(account2).withdrawAllEther();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("throws an error if the contract balance is 0", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.withdrawAllEther();
      } catch (newError) {
        error = newError;
      }

      expect(String(error).indexOf("Yoink: no ether") > -1).to.equal(true);
    });

    it("emits a Withdraw event", async () => {
      const contract = await getDeployedContract(deployArgs);

      // @ts-ignore TS cannot detect the (string,string)[] attributes sub-type
      await contract["mintNFT((string,string,string,(string,string)[]))"](
        mockTokenMetadataJSON,
        {
          from: account1.address,
          value: ethers.utils.parseEther("1"),
        }
      );

      const withdrawTxn = await contract.withdrawAllEther();
      expect(withdrawTxn)
        .to.emit(contract, "Withdraw")
        .withArgs(
          account1.address,
          contract.address,
          ethers.utils.parseEther("1")
        );
    });
  });

  describe("ownership", () => {
    it("instantiates a new contract with owner", async () => {
      const contract = await getDeployedContract(deployArgs);
      const owner = await contract.owner();

      expect(owner).to.equal(account1.address);
    });

    it("transfers ownership", async () => {
      const contract = await getDeployedContract(deployArgs);
      const transferOwnershipTxn = await contract.transferOwnership(
        account2.address
      );

      expect(transferOwnershipTxn)
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(account1.address, account2.address);
    });

    it("throws error when non-owner attempts transfer", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.connect(account2).transferOwnership(account2.address);
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });

    it("renounces ownership", async () => {
      const contract = await getDeployedContract(deployArgs);
      const renounceOwnershipTxn = contract.renounceOwnership();

      expect(renounceOwnershipTxn)
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(
          account1.address,
          "0x0000000000000000000000000000000000000000"
        );
    });

    it("throws error when non-owner attempts renouncing ownership", async () => {
      const contract = await getDeployedContract(deployArgs);

      let error;
      try {
        await contract.connect(account2).renounceOwnership();
      } catch (newError) {
        error = newError;
      }

      expect(
        String(error).indexOf("Ownable: caller is not the owner") > -1
      ).to.equal(true);
    });
  });
});
