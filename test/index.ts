import { NFT } from "@contractTypes/NFT";
import { NFTMarket } from "@contractTypes/NFTMarket";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("NFTMarket", function () {
  it("Should create and execut market sales", async function () {
    const Market = await ethers.getContractFactory("NFTMarket");
    const market = (await Market.deploy()) as unknown as NFTMarket;
    await market.deployed();
    const marketAddress = market.address;

    const NFT = await ethers.getContractFactory("NFT");
    const nft = (await NFT.deploy(marketAddress)) as unknown as NFT;
    await nft.deployed();
    const nftAdress = nft.address;

    const listingPrice = (await market.getListingPrice()).toString();
    const auctionPrice = ethers.utils.parseEther("100");

    await nft.createToken("nftUri1");
    await nft.createToken("nftUri2");

    await market.createMarketItem(nftAdress, 1, auctionPrice, {
      value: listingPrice,
    });
    await market.createMarketItem(nftAdress, 2, auctionPrice, {
      value: listingPrice,
    });

    const [_, buyerAddress] = await ethers.getSigners();
    await market
      .connect(buyerAddress)
      .createMarketSale(nftAdress, 1, { value: auctionPrice });

    const items = await market.fetchMarketItems();

    expect(items.length, "market items length").to.equal(1);

    const tokenUri2 = await nft.tokenURI(items[0].tokenId);
    expect(tokenUri2, "owner item tokenURI").to.equal("nftUri2");
    expect(items[0].itemId, "available item id").to.equal("2");

    const ownerItems = await market.connect(buyerAddress).fetchMyNFTs();

    expect(items.length).to.equal(1);
    const tokenUri1 = await nft.tokenURI(ownerItems[0].tokenId);
    expect(tokenUri1, "owner item tokenURI").to.equal("nftUri1");
    expect(ownerItems[0].itemId, "owner item id").to.equal("1");
    expect(ownerItems[0].sold, "nft should be sold").to.equal(true);

    const itemsCreated = await market.fetchItemsCreated();

    expect(itemsCreated.length).to.equal(2);

    expect(
      market.createMarketItem(nftAdress, 1, 0, { value: listingPrice })
    ).to.be.revertedWith("Price must be at least 1 wei");

    expect(
      market.createMarketItem(nftAdress, 1, auctionPrice, { value: 0 })
    ).to.be.revertedWith("Price must be equal to list price");

    expect(
      market.connect(buyerAddress).createMarketSale(nftAdress, 1, { value: 0 })
    ).to.be.revertedWith("Value not equal to price");
  });
});
