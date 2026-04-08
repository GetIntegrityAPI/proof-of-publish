# GetIntegrityAPI Proof of Publish Action

[![GitHub release](https://img.shields.io/github/v/release/GetIntegrityAPI/proof-of-publish)](https://github.com/GetIntegrityAPI/proof-of-publish/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue)](https://github.com/marketplace)

**Category:** CI/CD Security • Release Integrity • Supply Chain Verification

---

Generate a **cryptographically verifiable publish receipt** for every CI/CD release.

Each workflow run produces a **signed proof capsule anchored in the GetIntegrity tamper-evident ledger**, enabling independent verification of software releases, build events, and deployment activity.

This Action is designed for **DevOps, DevSecOps, platform, and security teams** that need verifiable release evidence without operating validator infrastructure or adding heavyweight supply-chain tooling.

---

## Why This Matters

Modern software delivery pipelines often produce logs, statuses, and artifacts — but not an **independently verifiable integrity record** of what was released and when.

This Action closes that gap by generating a **publicly verifiable publish receipt** for each CI/CD run.

Common use cases include:

* **Release integrity verification**
* **Supply-chain transparency**
* **Audit-ready deployment evidence**
* **Cryptographic event lineage tracking**
* **Independent release verification**

---

## What This Action Produces

Each workflow run produces:

* a **Proof ID**
* a **public verification URL**
* a **SHA-256 digest for offline integrity checks**
* a **human-readable PDF receipt**
* machine-readable receipt artifacts for evidence packaging

The recommended operating model is:

* **Public receipt URL** for online verification
* **Generated workflow artifacts** for evidence retention and audit packaging
* **Public key registry** for independent cryptographic verification

---

## Generated Artifacts

Each run generates the following files:

```text
receipt.json
receipt.sha256
receipt.pdf
```

| Artifact         | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `receipt.json`   | Canonical machine-readable integrity record                       |
| `receipt.sha256` | SHA-256 digest used for offline integrity verification            |
| `receipt.pdf`    | Human-readable receipt for audit, review, and compliance evidence |

These files are intended to be preserved as **GitHub Actions artifacts** or stored alongside:

* release artifacts
* deployment records
* compliance documentation
* audit evidence packages
* supply-chain security archives

> `receipt.pdf` is a generated workflow artifact, not a permanent public hosted report URL.

---

## Usage

Add the Action to your workflow and upload the generated receipt files as workflow artifacts.

```yaml
name: Publish Receipt

on:
  workflow_dispatch:
  push:
    branches: [ main ]

jobs:
  publish-proof:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - name: Generate Publish Receipt
        id: publish
        uses: GetIntegrityAPI/proof-of-publish@v1
        with:
          api_key: ${{ secrets.GI_API_KEY }}

      - name: Show Verification Receipt
        shell: bash
        run: |
          echo "Proof ID: ${{ steps.publish.outputs.proof_id }}"
          echo "Verification URL: ${{ steps.publish.outputs.receipt_url }}"
          echo "Receipt SHA256: ${{ steps.publish.outputs.receipt_sha256 }}"
          echo "Receipt PDF Path: ${{ steps.publish.outputs.receipt_pdf_path }}"

      - name: Verify generated files exist
        shell: bash
        run: |
          set -euo pipefail

          test -f receipt.json
          test -f receipt.sha256
          test -f "${{ steps.publish.outputs.receipt_pdf_path }}"

          echo "Verified files:"
          ls -l receipt.json receipt.sha256 "${{ steps.publish.outputs.receipt_pdf_path }}"

      - name: Upload publish receipt artifacts
        uses: actions/upload-artifact@v4
        with:
          name: publish-receipt-${{ github.run_id }}
          if-no-files-found: error
          path: |
            receipt.json
            receipt.sha256
            ${{ steps.publish.outputs.receipt_pdf_path }}

      - name: Publish Verification Summary
        shell: bash
        run: |
          echo "## GetIntegrity Publish Receipt" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Proof ID:** ${{ steps.publish.outputs.proof_id }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Verification URL:** ${{ steps.publish.outputs.receipt_url }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Receipt SHA256:** ${{ steps.publish.outputs.receipt_sha256 }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Receipt PDF Path:** ${{ steps.publish.outputs.receipt_pdf_path }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Artifact Bundle:** publish-receipt-${{ github.run_id }}" >> $GITHUB_STEP_SUMMARY
```

This gives every pipeline run:

* a public verification surface
* downloadable receipt artifacts
* a machine-readable integrity record
* an audit-friendly PDF receipt

---

## Inputs

| Input     | Description                    | Required |
| --------- | ------------------------------ | -------- |
| `api_key` | GetIntegrityAPI scoped API key | Yes      |

---

## Outputs

| Output             | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `proof_id`         | Generated proof capsule ID                                          |
| `receipt_url`      | Public verification receipt URL                                     |
| `receipt_sha256`   | SHA-256 digest of `receipt.json` for offline integrity verification |
| `receipt_pdf_path` | Runner path to the generated `receipt.pdf` file                     |

---

## Example Job Summary

```text
Proof ID: 544d398d-caa7-4eda-8663-29b671e6b67a
Verification URL: https://api.getintegrityapi.com/verify/544d398d-caa7-4eda-8663-29b671e6b67a
Receipt SHA256: 1dd31cc87cf7f3d93d045f4ab5a4334193935ef8ae5043d38933fb3a13c13dff
Receipt PDF Path: /home/runner/work/proof-of-publish/proof-of-publish/receipt.pdf
```

---

## Verifying a Proof

Proofs generated by this Action can be verified in multiple ways.

### 1) Public Verification URL

Each run returns a `receipt_url` output that opens the public verification receipt page.

Example:

```text
https://api.getintegrityapi.com/verify/<proof_id>
```

This is the primary online verification surface for sharing and review.

### 2) GitHub Workflow Artifacts

The generated files can be downloaded from the workflow run artifacts:

* `receipt.json`
* `receipt.sha256`
* `receipt.pdf`

This is the recommended way to retain evidence packages from CI/CD runs.

### 3) Offline Integrity Verification

For offline integrity workflows:

* preserve `receipt.json`
* preserve `receipt.sha256`
* verify the SHA-256 digest locally
* verify the signed proof using the published public key material

This supports independent verification workflows without relying solely on the UI.

---

## Public Key Endpoints

GetIntegrity publishes verification key material for independent proof verification.

```text
https://api.getintegrityapi.com/.well-known/hp-public-key
https://api.getintegrityapi.com/.well-known/hp-keys
```

These endpoints support cryptographic verification workflows using the published signing keys.

---

## Adding Your API Key

Store your API key as a GitHub Actions secret.

1. Open **Repository Settings**
2. Navigate to **Secrets and variables → Actions**
3. Add a new secret named:

```text
GI_API_KEY
```

Then reference it in your workflow:

```yaml
with:
  api_key: ${{ secrets.GI_API_KEY }}
```

Use a scoped key with the minimum permissions required for your release workflow.

---

## Security Notes

* Use **scoped API keys**
* Store secrets in **GitHub Actions Secrets**
* Rotate keys periodically according to your CI/CD security policy
* Preserve receipt artifacts with your release evidence where appropriate
* Treat `receipt.json` and `receipt.sha256` as part of your integrity evidence package

Generated receipts strengthen software supply-chain integrity by providing **independent, cryptographically verifiable release evidence**.

---

## Documentation

* [Developer Guide](https://getintegrityapi.com/#developer-guide)
* [Interactive API Reference](https://api.getintegrityapi.com/docs)
* [Proof Verification](https://getintegrityapi.com/#verify)

---

## About GetIntegrityAPI

GetIntegrityAPI provides **cryptographically verifiable event integrity infrastructure**.

The platform enables developers and organizations to generate **tamper-evident proofs for software releases, operational events, and system records** without operating validator infrastructure.

Learn more at [getintegrityapi.com](https://getintegrityapi.com).
