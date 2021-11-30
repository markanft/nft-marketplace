import { nftAddress, nftMarketAddress } from "config";
import { ethers } from "ethers";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { NFT, NftMeta } from "types.js";
import Web3Modal from "web3modal";
import NFTArtifact from "@artifacts/contracts/NFT.sol/NFT.json";
import NFTMarketArtifact from "@artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import { NFT as NFTContract } from "@contractTypes/NFT";
import { NFTMarket as NFTMarketContract } from "@contractTypes/NFTMarket";
import axios from "axios";

const CreatorDashboard: NextPage = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [sold, setSold] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNfts();
  }, []);

  const loadNfts = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    connection.on("accountsChanged", (accounts: string[]) => {
      loadNfts();
    });
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

    const data = await marketContract.fetchItemsCreated();

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
          sold: item.sold,
          image: meta.image,
          description: meta.decscription,
          name: meta.name,
        };
      })
    );

    const soldNfts = nfts.filter((item) => item.sold);
    setNfts(nfts);
    setSold(soldNfts);
    setLoading(false);
  };
  if (!loading && !nfts.length)
    return <h1 className="py-10 px-20 text-3xl">No NFTs created</h1>;

  return (
    <div>
      <div className="p-4">
        <h2 className="text-2xl py-2">NFTs Created</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} className="rounded" />
              <div className="p-4 bg-black">
                <p className="text-2xl font-bold text-white">
                  Price - {nft.price} Matic
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4">
        {Boolean(sold.length) && (
          <div>
            <h2 className="text-2xl py-2">NFTs sold</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {sold.map((nft, i) => (
                <div
                  key={i}
                  className="border shadow rounded-xl overflow-hidden"
                >
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
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;
