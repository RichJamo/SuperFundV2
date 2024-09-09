import React from "react";
import { PayEmbed } from "thirdweb/react";
import { client } from "../utils/client";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "../constants";

const BuyView: React.FC = ({}) => {

  return (
    <div className="mt-16">

      <PayEmbed 
      client={client} 
      payOptions={{
        buyWithFiat: false,
        prefillBuy: {
          token: {
            address: ARBITRUM_USDC_CONTRACT_ADDRESS,
            name: "Arbitrum USDC",
            symbol: "USDC",
            // icon: "...", // optional
          },
          chain: arbitrum,
          allowEdits: {
            amount: true, // allow editing buy amount
            token: false, // disable selecting buy token
            chain: false, // disable selecting buy chain
          },
        },
        
      }}
      />

    </div>
  );
};

export default BuyView;
