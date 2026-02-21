import axios from "axios";
import fs from "fs";
import crypto from "crypto";

async function run() {
  try {
    const apiKey = process.env.GI_API_KEY;

    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    const payload = {
      event: "github_publish",
      repository: process.env.GITHUB_REPOSITORY,
      commit: process.env.GITHUB_SHA,
      actor: process.env.GITHUB_ACTOR,
      run_id: process.env.GITHUB_RUN_ID,
      run_number: process.env.GITHUB_RUN_NUMBER,
      workflow: process.env.GITHUB_WORKFLOW,
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(
      "https://api.getintegrityapi.com/proof",
      payload,
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

    // Construct full receipt object (offline-verifiable artifact)
    const receipt = {
      receipt_version: "1",
      proof_id: proofId,
      receipt_url: receiptUrl,
      issued_at: new Date().toISOString(),
      github_context: {
        repository: process.env.GITHUB_REPOSITORY,
        commit: process.env.GITHUB_SHA,
        actor: process.env.GITHUB_ACTOR,
        run_id: process.env.GITHUB_RUN_ID,
        run_number: process.env.GITHUB_RUN_NUMBER,
        workflow: process.env.GITHUB_WORKFLOW
      },
      proof_response: response.data
    };

    // Write receipt.json
    fs.writeFileSync("receipt.json", JSON.stringify(receipt, null, 2));

    // Generate SHA256 digest of receipt for tamper detection
    const receiptBuffer = fs.readFileSync("receipt.json");
    const receiptHash = crypto
      .createHash("sha256")
      .update(receiptBuffer)
      .digest("hex");

    fs.writeFileSync("receipt.sha256", receiptHash);

    console.log("Proof ID:", proofId);
    console.log("Receipt URL:", receiptUrl);
    console.log("Receipt SHA256:", receiptHash);

  } catch (error) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    console.error("Proof generation failed:", message);
    process.exit(1);
  }
}

run();