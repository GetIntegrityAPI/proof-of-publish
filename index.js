import axios from "axios";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import PDFDocument from "pdfkit";

function mustGetEnv(name, fallback = "") {
  const v = process.env[name] ?? fallback;
  return (v && String(v).trim()) ? String(v).trim() : "";
}

function writeGithubOutput(key, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) return; // local runs / non-GHA
  fs.appendFileSync(outFile, `${key}=${String(value).replace(/\r?\n/g, " ")}\n`);
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function safeString(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function renderReceiptPdf(pdfPath, receipt, receiptHash) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });

    const stream = fs.createWriteStream(pdfPath);
    stream.on("finish", resolve);
    stream.on("error", reject);

    doc.pipe(stream);

    // Header
    doc.fontSize(22).text("GetIntegrityAPI — Publish Proof Receipt", { underline: false });
    doc.moveDown(0.5);

    const verified =
      receipt?.proof_response?.verified === true ||
      receipt?.proof_response?.verified === "true";

    doc.fontSize(12).text(`Status: ${verified ? "VERIFIED ✅" : "UNVERIFIED ❌"}`);
    doc.moveDown(0.25);

    // Key IDs
    doc.fontSize(11);
    doc.text(`Proof ID: ${safeString(receipt.proof_id)}`);
    doc.text(`Issued At: ${safeString(receipt.issued_at)}`);
    doc.text(`Validator: ${safeString(receipt?.proof_response?.validator ?? "")}`);
    doc.moveDown(0.5);

    doc.text(`Receipt URL: ${safeString(receipt.receipt_url)}`, {
      link: safeString(receipt.receipt_url),
      underline: true,
    });
    doc.moveDown(0.5);

    // Divider
    doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.75);

    // GitHub context
    doc.fontSize(14).text("GitHub Context");
    doc.moveDown(0.25);
    doc.fontSize(11);

    const gh = receipt.github_context || {};
    doc.text(`Repository: ${safeString(gh.repository)}`);
    doc.text(`Commit: ${safeString(gh.commit)}`);
    doc.text(`Actor: ${safeString(gh.actor)}`);
    doc.text(`Workflow: ${safeString(gh.workflow)}`);
    doc.text(`Run ID: ${safeString(gh.run_id)}`);
    doc.text(`Run Number: ${safeString(gh.run_number)}`);
    doc.text(`Ref: ${safeString(gh.ref)}`);
    doc.moveDown(0.75);

    // Crypto / capsule summary
    doc.fontSize(14).text("Cryptographic Capsule Summary");
    doc.moveDown(0.25);
    doc.fontSize(11);

    const capsule = receipt?.proof_response?.capsule || {};
    doc.text(`Algorithm: ${safeString(capsule.alg)}`);
    doc.text(`Key ID (kid): ${safeString(capsule.kid)}`);
    doc.text(`HP Version: ${safeString(capsule.hp_version)}`);
    doc.moveDown(0.75);

    // Offline verification
    doc.fontSize(14).text("Offline Verification");
    doc.moveDown(0.25);
    doc.fontSize(11);

    doc.text("1) Compute SHA256 of receipt.json");
    doc.text("2) Compare with receipt.sha256");
    doc.moveDown(0.25);
    doc.text(`Receipt SHA256: ${receiptHash}`);

    doc.moveDown(1.0);
    doc.fontSize(10).text(
      "This PDF is an informational rendering of the receipt.json. Offline integrity verification is performed by hashing receipt.json and comparing to receipt.sha256.",
      { lineGap: 2 }
    );

    doc.end();
  });
}

async function run() {
  try {
    const apiKey = mustGetEnv("GI_API_KEY");
    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    // IMPORTANT:
    // In GitHub Actions, GITHUB_WORKSPACE points to the checked-out repo path.
    // Even if we run from github.action_path, we MUST write artifacts into GITHUB_WORKSPACE
    // so upload-artifact can find them.
    const workspace = mustGetEnv("GITHUB_WORKSPACE", process.cwd());
    console.log("Workspace resolved to:", workspace);

    // Ensure workspace exists
    if (!fs.existsSync(workspace)) {
      throw new Error(`Workspace directory does not exist: ${workspace}`);
    }

    const payload = {
      event: "github_publish",
      repository: mustGetEnv("GITHUB_REPOSITORY"),
      commit: mustGetEnv("GITHUB_SHA"),
      actor: mustGetEnv("GITHUB_ACTOR"),
      run_id: mustGetEnv("GITHUB_RUN_ID"),
      run_number: mustGetEnv("GITHUB_RUN_NUMBER"),
      workflow: mustGetEnv("GITHUB_WORKFLOW"),
      ref: mustGetEnv("GITHUB_REF"),
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(
      "https://api.getintegrityapi.com/proof",
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (!response.data || !response.data.proof_id) {
      throw new Error("Invalid response from proof endpoint (missing proof_id)");
    }

    const proofId = response.data.proof_id;
    const receiptUrl = `https://api.getintegrityapi.com/verify/${proofId}`;

    const receipt = {
      receipt_version: "1",
      proof_id: proofId,
      receipt_url: receiptUrl,
      issued_at: new Date().toISOString(),
      github_context: {
        repository: payload.repository,
        commit: payload.commit,
        actor: payload.actor,
        run_id: payload.run_id,
        run_number: payload.run_number,
        workflow: payload.workflow,
        ref: payload.ref,
      },
      proof_response: response.data,
    };

    const receiptPath = path.join(workspace, "receipt.json");
    const hashPath = path.join(workspace, "receipt.sha256");
    const pdfPath = path.join(workspace, "receipt.pdf");

    // 1) receipt.json
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");

    // 2) receipt.sha256 (hash of receipt.json)
    const receiptHash = sha256File(receiptPath);
    fs.writeFileSync(hashPath, receiptHash + "\n", "utf8");

    // 3) receipt.pdf (human-friendly)
    await renderReceiptPdf(pdfPath, receipt, receiptHash);

    console.log("Proof ID:", proofId);
    console.log("Receipt URL:", receiptUrl);
    console.log("Receipt SHA256:", receiptHash);
    console.log("Receipt written to:", receiptPath);
    console.log("Hash written to:", hashPath);
    console.log("PDF written to:", pdfPath);

    // GitHub Outputs (modern way)
    writeGithubOutput("proof_id", proofId);
    writeGithubOutput("receipt_url", receiptUrl);
    writeGithubOutput("receipt_sha256", receiptHash);
    writeGithubOutput("receipt_json_path", receiptPath);
    writeGithubOutput("receipt_sha256_path", hashPath);
    writeGithubOutput("receipt_pdf_path", pdfPath);

  } catch (error) {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      String(error);

    console.error("Proof generation failed:", message);
    process.exit(1);
  }
}

run();
