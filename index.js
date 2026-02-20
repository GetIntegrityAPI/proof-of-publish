import axios from "axios";

async function run() {
  try {
    const apiKey = process.env.GI_API_KEY;

    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    const response = await axios.post(
      "https://api.getintegrityapi.com/proof",
      {
        event: "github_publish",
        repository: process.env.GITHUB_REPOSITORY,
        commit: process.env.GITHUB_SHA,
        actor: process.env.GITHUB_ACTOR
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const proofId = response.data.proof_id;
    const receiptUrl = `https://api.getintegrityapi.com/verify/${proofId}`;

    console.log(`Proof ID: ${proofId}`);
    console.log(`Receipt URL: ${receiptUrl}`);

  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    console.error(message);
    process.exit(1);
  }
}

run();