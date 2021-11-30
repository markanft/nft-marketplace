import { NextPage } from "next";
import { create as ipfsHttpClient } from "ipfs-http-client";

const ipfsClient = ipfsHttpClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  apiPath: "api/v0",
});

import { nftAddress, nftMarketAddress } from "config";
import NFTArtifact from "@artifacts/contracts/NFT.sol/NFT.json";
import NFTMarketArtifact from "@artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import { NFTMarket } from "@contractTypes/NFTMarket";
import { NFT } from "@contractTypes/NFT";
import { useState } from "react";
import { useRouter } from "next/router";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

const CreateNft: NextPage = () => {
  const [fileUrl, setFileUrl] = useState("");
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });

  const router = useRouter();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    try {
      const added = await ipfsClient.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      setFileUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const createNft = async () => {
    const { name, description, price } = formInput;
    if (!name || !description || !price) return;
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });
    try {
      const added = await ipfsClient.add(data);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      createSale(url);
    } catch (e) {
      console.error("Errore uploading file: ", e);
    }
  };

  const createSale = async (tokenUrl: string) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const NftContract = new ethers.Contract(
      nftAddress,
      NFTArtifact.abi,
      signer
    ) as unknown as NFT;
    let transaction = await NftContract.createToken(tokenUrl);
    let tx = await transaction.wait();

    if (tx.events) {
      const event = tx.events[0];
      const value = event.args[2] as ethers.BigNumber;
      const tokenId = value.toNumber();
      const price = ethers.utils.parseEther(formInput.price);

      const marketContract = new ethers.Contract(
        nftMarketAddress,
        NFTMarketArtifact.abi,
        signer
      ) as unknown as NFTMarket;

      const listingPrice = (await marketContract.getListingPrice()).toString();
      transaction = await marketContract.createMarketItem(
        nftAddress,
        tokenId,
        price,
        { value: listingPrice }
      );
      await transaction.wait();
      router.push("/");
    }
  };
  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Matic"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={createNft}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          Create Digital Asset
        </button>
      </div>
    </div>
  );
};

export default CreateNft;
