import axios from "axios";
import fs from "fs";
import crypto from "crypto";
import path from "path";

async function run() {
  try {
    const apiKey = process.env.GI_API_KEY;
    const workspace =
      process.env.GI_WORKSPACE ||
      process.env.GITHUB_WORKSPACE ||
      process.cwd();

    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    if (!workspace) {
      console.error("Workspace path not resolved.");
      process.exit(1);
    }

    console.log("Resolved workspace:", workspace);

    const payload = {
      event: "github_publish",
      repository: process.env.GITHUB_REPOSITORY,
      commit: process.env.GITHUB_SHA,
      actor: process.env.GITHUB_ACTOR,
      run_id: process.env.GITHUB_RUN_ID,
      run_number: process.env.GITHUB_RUN_NUMBER,
      workflow: process.env.GITHUB_WORKFLOW,
      ref: process.env.GITHUB_REF,
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

    if (!response.data || !response.data.proof_id) {
      throw new Error("Invalid response from proof endpoint");
    }

    const proofId = response.data.proof_id;
    const receiptUrl = `https://api.getintegrityapi.com/verify/${proofId}`;

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
        workflow: process.env.GITHUB_WORKFLOW,
        ref: process.env.GITHUB_REF
      },
      proof_response: response.data
    };

    const receiptPath = path.join(workspace, "receipt.json");
    const hashPath = path.join(workspace, "receipt.sha256");

    // Write receipt.json directly into workspace
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

    const receiptBuffer = fs.readFileSync(receiptPath);
    const receiptHash = crypto
      .createHash("sha256")
      .update(receiptBuffer)
      .digest("hex");

    fs.writeFileSync(hashPath, receiptHash);

    console.log("Proof ID:", proofId);
    console.log("Receipt URL:", receiptUrl);
    console.log("Receipt SHA256:", receiptHash);
    console.log("Receipt written to:", receiptPath);
    console.log("Hash written to:", hashPath);

    // Modern GitHub output method
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `proof_id=${proofId}\nreceipt_url=${receiptUrl}\nreceipt_sha256=${receiptHash}\n`
      );
    }

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
