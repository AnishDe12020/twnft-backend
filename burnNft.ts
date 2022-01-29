import { ThirdwebSDK } from "@3rdweb/sdk";
import { ethers } from "ethers";
import "dotenv/config";

const sdk = new ThirdwebSDK(
  new ethers.Wallet(
    process.env.PRIVATE_KEY,
    ethers.getDefaultProvider("https://rinkeby-light.eth.linkpool.io/")
  )
);
const nftModule = sdk.getNFTModule(process.env.NFT_MODULE_ADDRESS);

nftModule
  .burn(2)
  .then(result => {
    console.log(result);
  })
  .catch(err => {
    console.log(err);
  });
