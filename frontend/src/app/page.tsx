"use client";

import React, { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import superfundLogo from "../../public/superfund_logo.jpg"; // Adjust the path if needed
import { client } from "../utils/client"; // Adjust the path if needed
import VaultsContainer from "../containers/VaultsContainer"; // Adjust the path if needed
import Image from "next/image";

// Set the root element where your app is rendered
// In Next.js, you might not need this as Next.js manages the root element
// Modal.setAppElement("#__next"); // "__next" is the default root element in Next.js

export default function Page() {
  const account = useActiveAccount();
  const [activeSection, setActiveSection] = useState<"vaults" | "clients">(
    "vaults"
  );

  return (
    <main className="p-4 pb-10 min-h-[100vh] flex container max-w-screen-lg mx-auto relative">
      {account && (
        <nav className="w-3/8 bg-gray-800 text-white p-6 rounded-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tighter text-zinc-100">
              SuperFund
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
          </ul>
        </nav>
      )}
      <div className="flex-1 py-20 pl-6">
        <div className="relative flex flex-col items-center mb-20">
          {!account && <Header />}
          {account && (
            <div className="absolute top-0 right-0 transform translate-x-[+10%] translate-y-[-90%]">
              <ConnectButton
                client={client}
                appMetadata={{
                  name: "Example app",
                  url: "https://example.com",
                }}
              />
            </div>
          )}
          {account ? (
            <>
              {activeSection === "vaults" && <VaultsContainer />}
            </>
          ) : (
            <ConnectButton
              client={client}
              appMetadata={{
                name: "Example app",
                url: "https://example.com",
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
    <header className="flex flex-col items-center mb-20 md:mb-20">
      <Image
        src={superfundLogo}
        alt=""
        className="size-[150px] md:size-[150px]"
        style={
          {
            // filter: "drop-shadow(0px 0px 24px #a726a9a8)"
          }
        }
      />

      <h1 className="text-2xl md:text-6xl font-bold tracking-tighter mb-6 text-zinc-100">
        OmniYield
      </h1>

      <p className="text-zinc-300 text-base">
        Please connect your wallet to get started.
      </p>
    </header>
  );
}
