import * as core from "@actions/core";
import axios from "axios";

async function run() {
  try {
    const apiKey = core.getInput("api_key");

    if (!apiKey) {
      core.setFailed("api_key input is required");
      return;
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

    core.setOutput("proof_id", proofId);
    core.setOutput("receipt_url", receiptUrl);

    console.log(`Proof ID: ${proofId}`);
    console.log(`Receipt URL: ${receiptUrl}`);

  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    core.setFailed(message);
  }
}

run();