import type { NextPage } from "next";
import { nftAddress, nftMarketAddress } from "./../config.js";
import NFTArtifact from "@artifacts/contracts/NFT.sol/NFT.json";
import NFTMarketArtifact from "@artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { NFTMarket as NFTMarketContract } from "@contractTypes/NFTMarket";
import { NFT as NFTContract } from "@contractTypes/NFT";
import axios from "axios";
import Web3Modal from "web3modal";
import { NFT } from "types.js";

const Home: NextPage = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNFTs();
  }, []);

  const loadNFTs = async () => {
    console.log(process.env.NEXT_PUBLIC_NODE_URL);
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_NODE_URL
    );
    const nftContract = new ethers.Contract(
      nftAddress,
      NFTArtifact.abi,
      provider
    ) as unknown as NFTContract;
    const marketContract = new ethers.Contract(
      nftMarketAddress,
      NFTMarketArtifact.abi,
      provider
    ) as unknown as NFTMarketContract;

    const data = await marketContract.fetchMarketItems();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await nftContract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        const price = ethers.utils.formatEther(i.price.toString());
        return {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
          sold: i.sold,
        };
      })
    );
    setNfts(items);
    setLoading(false);
  };

  const buyNft = async (nft: NFT) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(
      nftMarketAddress,
      NFTMarketArtifact.abi,
      signer
    ) as unknown as NFTMarketContract;

    const price = ethers.utils.parseEther(nft.price.toString());

    const transaction = await marketContract.createMarketSale(
      nftAddress,
      nft.tokenId,
      { value: price }
    );
    transaction.wait();
    loadNFTs();
  };

  if (!loading && !nfts.length)
    return <h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>;

  return (
    <div className="flex justify-center">
      <div className="px-4 max-w-1600">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} />
              <div className="p-4">
                <p className="h-64 text-2xl font-semibold">{nft.name}</p>
                <div className="h-70 overflow-hidden">
                  <p className="text-gray-400">{nft.description}</p>
                </div>
              </div>
              <div className="p-4 bg-black">
                <p className="text-2xl mb-4 font-bold text-white">
                  {nft.price} Matic
                </p>
                <button
                  className="w-full bg-pink-500 text-white font-bold py-2 px-12 rounded"
                  onClick={() => buyNft(nft)}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
