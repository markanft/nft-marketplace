import { NextPage } from "next";
import { useEffect, useState } from "react";

import { nftAddress, nftMarketAddress } from "../config.js";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import NFTArtifact from "@artifacts/contracts/NFT.sol/NFT.json";
import NFTMarketArtifact from "@artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import { NFT as NFTContract } from "@contractTypes/NFT";
import { NFTMarket as NFTMarketContract } from "@contractTypes/NFTMarket";
import axios from "axios";
import { NFT, NftMeta } from "types.js";

const MyNfts: NextPage = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNfts();
  }, []);

  const loadNfts = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const nftContract = new ethers.Contract(
      nftAddress,
      NFTArtifact.abi,
      provider
    ) as unknown as NFTContract;
    const marketContract = new ethers.Contract(
      nftMarketAddress,
      NFTMarketArtifact.abi,
      provider.getSigner()
    ) as unknown as NFTMarketContract;

    const data = await marketContract.fetchMyNFTs();

    const nfts = await Promise.all(
      data.map(async (item) => {
        const tokenId = item.tokenId.toNumber();
        const tokenUri = await nftContract.tokenURI(tokenId);
        const meta: NftMeta = (await axios.get(tokenUri)).data;
        const price = ethers.utils.formatEther(item.price.toString());
        return {
          price,
          tokenId,
          seller: item.seller,
          owner: item.owner,
          image: meta.image,
          description: meta.decscription,
          name: meta.name,
          sold: item.sold,
        };
      })
    );
    setNfts(nfts);
    setLoading(false);
  };

  if (!loading && !nfts.length)
    return <h1 className="py-10 px-20 text-3xl">No NFTs owned</h1>;

  return (
    <div className="flex justify-center">
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} className="rounded" />
              <div className="p-4 bg-black">
                <p className="text-2xl font-bold text-white">
                  Price - {nft.price} Eth
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyNfts;
