import React from "react";
import { PayEmbed } from "thirdweb/react";
import { client } from "../utils/client";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "../constants";
import { truncate } from "fs/promises";

const BuyView: React.FC = ({}) => {

  return (
    <div className="mt-16">

      <PayEmbed 
      client={client}
      payOptions={{
        mode: "fund_wallet",
        prefillBuy: {
          token: {
            address: ARBITRUM_USDC_CONTRACT_ADDRESS,
            name: "Arbitrum USDC",
            symbol: "USDC",
            icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
          },
          chain: arbitrum,
          allowEdits: {
            amount: true, // allow editing buy amount
            token: false, // disable selecting buy token
            chain: false, // disable selecting buy chain
          },
        },
        buyWithCrypto: {
          prefillSource: {
            allowEdits: {
              chain: false,
              token: true,
            },
            chain: arbitrum,
            // token: {
            //   address: ARBITRUM_USDC_CONTRACT_ADDRESS,
            //   name: "Arbitrum USDC",
            //   symbol: "USDC",
            // }
          }
        },
        buyWithFiat: 
        {
        },
        metadata: {name: "Fund Wallet"},
      }}
      />

    </div>
  );
};

export default BuyView;
