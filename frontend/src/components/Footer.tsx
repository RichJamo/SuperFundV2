import React from "react";
import { FaTwitter, FaDiscord, FaYoutube, FaGithub, FaTelegram } from "react-icons/fa"; // Import social icons

const Footer = () => {
  return (
    <footer className="flex flex-col items-center justify-center mt-20 space-y-4">
      <p className="text-zinc-300 text-sm text-center">
        © 2024 Amana. All rights reserved.
      </p>
      
      {/* Links for Docs, FAQ, and Security */}
      <div className="flex space-x-4">
        <a href="/docs" className="text-zinc-400 hover:text-white">
          Docs
        </a>
        <a href="/faqs" className="text-zinc-400 hover:text-white">
          FAQ
        </a>
        <a href="/security" className="text-zinc-400 hover:text-white">
          Security
        </a>
      </div>

      {/* Social Icons below the links */}
      <div className="flex space-x-4 mt-4">
        <a href="https://x.com/Amana_DeFi" aria-label="Twitter" className="text-zinc-400 hover:text-white">
          <FaTwitter size={24} />
        </a>
        <a href="https://discord.com" aria-label="Discord" className="text-zinc-400 hover:text-white">
          <FaDiscord size={24} />
        </a>
        <a href="https://youtube.com" aria-label="YouTube" className="text-zinc-400 hover:text-white">
          <FaYoutube size={24} />
        </a>
        <a href="https://github.com" aria-label="GitHub" className="text-zinc-400 hover:text-white">
          <FaGithub size={24} />
        </a>
        <a href="https://telegram.org" aria-label="Telegram" className="text-zinc-400 hover:text-white">
          <FaTelegram size={24} />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
