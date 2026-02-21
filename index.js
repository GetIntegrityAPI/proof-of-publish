import axios from "axios";
import fs from "fs";
import crypto from "crypto";
import path from "path";

async function run() {
  try {
    const apiKey = process.env.GI_API_KEY;

    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    const actionDir = process.cwd();
    const workspace = process.env.GITHUB_WORKSPACE;

    console.log("Action directory:", actionDir);
    console.log("Workspace env:", workspace);

    if (!workspace) {
      throw new Error("GITHUB_WORKSPACE is not defined.");
    }

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

    // Paths inside action directory
    const localReceiptPath = path.join(actionDir, "receipt.json");
    const localHashPath = path.join(actionDir, "receipt.sha256");

    // Write locally first
    fs.writeFileSync(localReceiptPath, JSON.stringify(receipt, null, 2));

    const receiptBuffer = fs.readFileSync(localReceiptPath);
    const receiptHash = crypto
      .createHash("sha256")
      .update(receiptBuffer)
      .digest("hex");

    fs.writeFileSync(localHashPath, receiptHash);

    console.log("Local receipt written:", localReceiptPath);
    console.log("Local hash written:", localHashPath);

    // Copy to workspace root
    const workspaceReceiptPath = path.join(workspace, "receipt.json");
    const workspaceHashPath = path.join(workspace, "receipt.sha256");

    fs.copyFileSync(localReceiptPath, workspaceReceiptPath);
    fs.copyFileSync(localHashPath, workspaceHashPath);

    console.log("Copied to workspace:");
    console.log("Receipt:", workspaceReceiptPath);
    console.log("SHA256:", workspaceHashPath);

    // Final existence check
    if (!fs.existsSync(workspaceReceiptPath)) {
      throw new Error("receipt.json not found in workspace after copy.");
    }

    if (!fs.existsSync(workspaceHashPath)) {
      throw new Error("receipt.sha256 not found in workspace after copy.");
    }

    console.log("Proof ID:", proofId);
    console.log("Receipt URL:", receiptUrl);
    console.log("Receipt SHA256:", receiptHash);

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
