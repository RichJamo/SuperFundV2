import React from "react";
import { PayEmbed } from "thirdweb/react";
import { client } from "../utils/client";



const BuyView: React.FC = ({}) => {

  return (
    <div className="mt-16">

      <PayEmbed client={client} />

    </div>
  );
};

export default BuyView;
