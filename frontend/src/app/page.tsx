"use client";

import React, { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import superfundLogo from "../../public/superfund_logo.jpg"; // Adjust the path if needed
import { client } from "../utils/client"; // Adjust the path if needed
import VaultsContainer from "../containers/VaultsContainer"; // Adjust the path if needed
import BuyContainer from "../containers/BuyContainer"; // Adjust the path if needed
import About from "../components/About"; // Adjust the path if needed
import Image from "next/image";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { arbitrum } from "thirdweb/chains";
import { ARBITRUM_USDC_CONTRACT_ADDRESS } from "@/constants";

// Set the root element where your app is rendered
// In Next.js, you might not need this as Next.js manages the root element
// Modal.setAppElement("#__next"); // "__next" is the default root element in Next.js

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey"],
    },
    smartAccount: { chain: arbitrum, sponsorGas: true } ,
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("com.ledger"),
  createWallet("global.safe"),
];

export default function Page() {
  const account = useActiveAccount();
  const [activeSection, setActiveSection] = useState<"vaults" | "buy" | "about">(
    "vaults"
  );

  return (
    <main className="p-4 pb-10 min-h-screen flex container mx-auto relative overflow-hidden">
      {account && (
        <nav className="w-3/8 bg-gray-800 text-white p-6 rounded-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter text-zinc-100">
              Amana
            </h1>
          </div>
          <ul className="space-y-4">
            <li
              className={`cursor-pointer ${
                activeSection === "vaults" ? "font-bold" : ""
              }`}
              onClick={() => setActiveSection("vaults")}
            >
              Vaults
            </li>
            <li
              className={`cursor-pointer ${
                activeSection === "buy" ? "font-bold" : ""
              }`}
              onClick={() => setActiveSection("buy")}
            >
              Fund Wallet
            </li>
            <li
              className={`cursor-pointer ${
                activeSection === "about" ? "font-bold" : ""
              }`}
              onClick={() => setActiveSection("about")}
            >
              About
            </li>
          </ul>
        </nav>
      )}
      <div className="flex-1 py-20 pl-6">
        <div className="relative flex flex-col items-center justify-start h-full space-y-8">
          {!account && <Header />}
          {account && (
            <div className="absolute top-0 right-0 transform translate-x-[+10%] translate-y-[-90%]">
              <ConnectButton
                client={client}
                wallets={wallets}
                connectModal={{ size: "compact" }}
                accountAbstraction={{
                  chain: arbitrum,
                  sponsorGas: true,
                }}
                detailsButton={{
                  displayBalanceToken: {
                    [arbitrum.id]: ARBITRUM_USDC_CONTRACT_ADDRESS,
                  },
                }}
              />
            </div>
          )}
          {account ? (
            <>
              {activeSection === "vaults" && <VaultsContainer />}
              {activeSection === "buy" && <BuyContainer />}
              {activeSection === "about" && <About />}
            </>
          ) : (
            <ConnectButton
              client={client}
              wallets={wallets}
              connectButton={{ label: "Get Started" }}
              connectModal={{ size: "compact" }}
              accountAbstraction={{
                chain: arbitrum,
                sponsorGas: true,
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col items-center justify-center mt-40 space-y-4">
      <h1 className="text-2xl md:text-6xl font-bold tracking-tighter text-zinc-100">
        Amana
      </h1>

      <p className="text-zinc-300 text-base text-center">
        Connect your wallet or login / signup to get started.<br />
        If you are connecting for the first time, a new smart account will be created for you.<br />
        This makes it possible for us to offer you 1-click, gas-free transactions.<br />
        This smart account wallet belongs to you, and only you can access your private key.
      </p>
    </header>
  );
}
