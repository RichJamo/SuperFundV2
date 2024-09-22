import React from "react";
import { PayEmbed } from "thirdweb/react";
import { client } from "../utils/client";
import { base } from "thirdweb/chains";
import { BASE_USDC_CONTRACT_ADDRESS } from "../constants";
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
            address: BASE_USDC_CONTRACT_ADDRESS,
            name: "Base USDC",
            symbol: "USDC",
            icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
          },
          chain: base,
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
            chain: base,
            // token: {
            //   address: BASE_USDC_CONTRACT_ADDRESS,
            //   name: "Base USDC",
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
