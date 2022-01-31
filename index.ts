import express from "express";
import cors from "cors";
import { auth, db } from "./firebaseAdmin";
import "dotenv/config";
import { ThirdwebSDK } from "@3rdweb/sdk";
import { ethers } from "ethers";
import bodyParser from "body-parser";

const TWITTER_TWEET_API_URL = "https://api.twitter.com/2/tweets/";
const TWITTER_API_MORE_PARAMS = "?expansions=author_id";

const app = express();

app.use(bodyParser.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/mint", async (req, res) => {
  try {
    console.log(req.body);
    const payload = req.body;
    const tweetAuthordId = (await auth.verifyIdToken(req.headers.authorization))
      .firebase.identities["twitter.com"][0];

    const tweetUrl = payload.tweetUrl as string;
    let tweetId: string = "";
    if (payload.tweetId) {
      tweetId = payload.tweetId as string;
    } else {
      console.log(tweetUrl);
      tweetId = tweetUrl.split("/")[5];
      console.log(tweetId);
    }

    const URL = TWITTER_TWEET_API_URL + tweetId + TWITTER_API_MORE_PARAMS;

    console.log(URL);

    const twitterRes = await fetch(URL, {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
      method: "GET",
      redirect: "follow",
    });
    const tweetData = await twitterRes.json();
    console.log(tweetData);
    if (tweetData.data.author_id === tweetAuthordId) {
      const tweetRef = db.collection("nft").doc(tweetId);
      const tweetDoc = await tweetRef.get();

      if (!tweetDoc.exists) {
        const nftTweetData = payload.tweetData;

        const nftMedatada = {
          name: payload.name,
          description: payload.description || nftTweetData.data.text,
          image: payload.ipfsHash,
          external_url: `https://twnft.vercel.app/tweet/${tweetId}`,
          attributes: [
            {
              display_type: "date",
              trait_type: "date",
              value: Math.floor(
                new Date(nftTweetData.data.created_at).getTime() / 1000
              ),
            },
            {
              display_type: "text",
              trait_type: "Author Name",
              value: nftTweetData.includes.users[0].name,
            },
            {
              display_type: "text",
              trait_type: "Author Username",
              value: nftTweetData.includes.users[0].username,
            },
            {
              display_type: "text",
              trait_type: "content",
              value: nftTweetData.data.text,
            },
            {
              display_type: "text",
              trait_type: "Tweet URL",
              value: tweetUrl,
            },
            {
              display_type: "text",
              trait_type: "Tweet ID",
              value: tweetId,
            },
          ],
        };

        const sdk = new ThirdwebSDK(
          new ethers.Wallet(
            process.env.PRIVATE_KEY,
            ethers.getDefaultProvider("https://rinkeby-light.eth.linkpool.io/")
          )
        );
        const nftModule = sdk.getNFTModule(process.env.NFT_MODULE_ADDRESS);

        console.log(payload);
        console.log(nftMedatada);

        const result = await nftModule.mintTo(
          payload.receiverAddress,
          nftMedatada
        );

        const nftCollectionRef = db.collection("nft");
        const firebaseRes = await nftCollectionRef.doc(tweetId).set({
          ...nftMedatada,
          created_date: new Date().toISOString(),
          creatorAddress: payload.receiverAddress,
          tweetId: tweetId,
          tweetUrl: tweetUrl,
          tweetOwnerId: tweetAuthordId,
        });

        res.send({ data: { result, firebaseRes } });
      } else {
        res.send({ error: "tweetMinted" });
      }
    } else {
      res.send({ error: "notTweetOwner" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error generating signature for NFT" });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`TwNFT Backend listening on port ${process.env.PORT || 4000}!`);
});
