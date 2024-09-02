import { AAVE_OPTIMISM_SUBGRAPH_URL } from "../constants/urls";

export const fetchVaultData = async (vaultIds: string[]): Promise<any> => {
  const vaultIdsString = vaultIds.map(id => `"${id.toLowerCase()}"`).join(",");

  try {
    const response = await fetch(
      AAVE_OPTIMISM_SUBGRAPH_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            {
              markets(where: {id_in: [${vaultIdsString}]}) {
                id
                name
                inputToken {
                  symbol
                  decimals
                }
                totalValueLockedUSD
                rates {
                  id
                  rate
                  type
                }
              }
            }
          `
        })
      }
    );

    const data = await response.json();
    if (data.errors) {
      console.error("Error fetching data:", data.errors);
      return null;
    }

    const result = data.data.markets;
    return result;

  } catch (error) {
    console.error("Error fetching Aave data:", error);
    throw error;
  }
};
