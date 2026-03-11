import fs from "fs";
import crypto from "crypto";
import path from "path";
import axios from "axios";
import PDFDocument from "pdfkit";

/* -----------------------------
Helper utilities
------------------------------*/

function mustGetEnv(name, fallback = "") {
  const v = process.env[name] ?? fallback;
  return v && String(v).trim() ? String(v).trim() : "";
}

function writeGithubOutput(key, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) return;
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

/* -----------------------------
PDF Receipt Renderer
------------------------------*/

function renderReceiptPdf(pdfPath, receipt, receiptHash) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });

    const stream = fs.createWriteStream(pdfPath);
    stream.on("finish", resolve);
    stream.on("error", reject);

    doc.pipe(stream);

    // Header
    doc.fontSize(22).text("GetIntegrityAPI — Publish Proof Receipt");
    doc.moveDown(0.5);

    const verified =
      receipt?.proof_response?.verified === true ||
      receipt?.proof_response?.verified === "true";

    doc.fontSize(12).text(`Status: ${verified ? "VERIFIED ✅" : "UNVERIFIED ❌"}`);
    doc.moveDown(0.5);

    doc.fontSize(11);
    doc.text(`Proof ID: ${safeString(receipt.proof_id)}`);
    doc.text(`Issued At: ${safeString(receipt.issued_at)}`);
    doc.text(`Validator: ${safeString(receipt?.proof_response?.validator)}`);
    doc.moveDown(0.5);

    doc.text(`Receipt URL: ${safeString(receipt.receipt_url)}`, {
      link: safeString(receipt.receipt_url),
      underline: true,
    });

    doc.moveDown(0.5);

    doc.moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.75);

    // GitHub context
    doc.fontSize(14).text("GitHub Context");
    doc.moveDown(0.25);

    const gh = receipt.github_context || {};

    doc.fontSize(11);
    doc.text(`Repository: ${safeString(gh.repository)}`);
    doc.text(`Commit: ${safeString(gh.commit)}`);
    doc.text(`Actor: ${safeString(gh.actor)}`);
    doc.text(`Workflow: ${safeString(gh.workflow)}`);
    doc.text(`Run ID: ${safeString(gh.run_id)}`);
    doc.text(`Run Number: ${safeString(gh.run_number)}`);
    doc.text(`Ref: ${safeString(gh.ref)}`);

    doc.moveDown(0.75);

    // Capsule summary
    doc.fontSize(14).text("Cryptographic Capsule Summary");
    doc.moveDown(0.25);

    const capsule = receipt?.proof_response?.capsule || {};

    doc.fontSize(11);
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

    doc.moveDown(1);

    doc.fontSize(10).text(
      "This PDF is an informational rendering of receipt.json. Offline verification is performed by hashing receipt.json and comparing it to receipt.sha256."
    );

    doc.end();
  });
}

/* -----------------------------
Main Action
------------------------------*/

async function run() {
  try {
    const apiKey = mustGetEnv("GI_API_KEY");

    if (!apiKey) {
      console.error("GI_API_KEY is required");
      process.exit(1);
    }

    const workspace = mustGetEnv("GITHUB_WORKSPACE", process.cwd());

    if (!fs.existsSync(workspace)) {
      throw new Error(`Workspace directory does not exist: ${workspace}`);
    }

    console.log("Workspace resolved to:", workspace);

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
          "User-Agent": "getintegrity-github-action",
        },
        timeout: 15000,
      }
    );

    if (!response?.data?.proof_id) {
      throw new Error("Invalid response from proof endpoint (missing proof_id)");
    }

    const proofId = response.data.proof_id;
    const receiptUrl = response.data.receipt_url;

    const receipt = {
      proof_id: proofId,
      receipt_url: receiptUrl,
      issued_at: new Date().toISOString(),
      github_context: payload,
      proof_response: response.data,
    };

    const receiptPath = path.join(workspace, "receipt.json");
    const hashPath = path.join(workspace, "receipt.sha256");
    const pdfPath = path.join(workspace, "receipt.pdf");

    // Write receipt.json
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");

    // Compute hash
    const receiptHash = sha256File(receiptPath);

    fs.writeFileSync(hashPath, receiptHash + "\n", "utf8");

    // Render PDF
    await renderReceiptPdf(pdfPath, receipt, receiptHash);

    console.log("Proof ID:", proofId);
    console.log("Receipt URL:", receiptUrl);
    console.log("Receipt SHA256:", receiptHash);
    console.log("Receipt written to:", receiptPath);
    console.log("Hash written to:", hashPath);
    console.log("PDF written to:", pdfPath);

    // GitHub outputs
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

/* -----------------------------
Execute
------------------------------*/

run();
