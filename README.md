# GetIntegrityAPI Proof of Publish Action

[![GitHub release](https://img.shields.io/github/v/release/GetIntegrityAPI/proof-of-publish?label=release)](https://github.com/GetIntegrityAPI/proof-of-publish/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Proof%20of%20Publish-blue)](https://github.com/marketplace/actions/getintegrityapi-proof-of-publish)

**Category:** CI/CD Security • Release Integrity • Supply Chain Verification

Generate a public verification URL, signed publish proof, SHA-256 integrity digest, and audit-ready receipt artifacts for every CI/CD release.

Each workflow run produces a signed proof capsule anchored in the GetIntegrityAPI tamper-evident ledger, enabling independent verification of software releases, build events, and deployment activity.

This Action is designed for DevOps, DevSecOps, platform, and security teams that need verifiable release evidence without operating validator infrastructure or adding heavyweight supply-chain tooling.

This repository hosts the GitHub Action itself.

You normally use it from a separate consumer repository by adding a workflow under `.github/workflows` and storing `GI_API_KEY` in GitHub Actions secrets.

---

## Live Demo and Example Artifact Bundle

A public demo consumer repository is available to show the standard Proof-of-Publish workflow:

**Demo repository:** [`GetIntegrityAPI/proof-of-publish-demo`](https://github.com/GetIntegrityAPI/proof-of-publish-demo)

The demo workflow generates a public verification receipt and downloadable evidence artifacts.

**Latest demo proof:**

| Item | Value |
| --- | --- |
| Proof ID | `2558d4d1-7858-4ea6-ad8e-37d276dad521` |
| Repository | `GetIntegrityAPI/proof-of-publish-demo` |
| Workflow | `Publish Receipt Demo` |
| Run number | `9` |
| Commit | `79b32ecbf051bc02e089a2a4620709ddd48aba95` |
| Verification URL | [`View public verification receipt`](https://api.getintegrityapi.com/verify/2558d4d1-7858-4ea6-ad8e-37d276dad521) |

**Generated artifact bundle:**

| Artifact | Purpose |
| --- | --- |
| [`receipt.json`](https://assets.getintegrityapi.com/Website-images/PDFs/Example_Publish_Proof_Receipt.json) | Canonical machine-readable proof receipt |
| [`receipt.sha256`](https://assets.getintegrityapi.com/Website-images/PDFs/receipt.sha256) | SHA-256 digest for offline integrity verification |
| [`receipt.pdf`](https://assets.getintegrityapi.com/Website-images/PDFs/Example_Publish_Proof_Receipt.pdf) | Human-readable receipt for audit, review, and compliance evidence |

Viewing the demo receipt, downloading the artifact bundle, or inspecting previous workflow runs does not consume additional API usage.

Running the demo workflow manually creates a new publish receipt and consumes one usage unit from the configured `GI_API_KEY`.

---

## Why This Matters

Modern software delivery pipelines often produce logs, statuses, and artifacts — but not an independently verifiable integrity record of what was released and when.

This Action closes that gap by generating a publicly verifiable publish receipt for each CI/CD run.

Common use cases include:

- release integrity verification
- supply-chain transparency
- audit-ready deployment evidence
- cryptographic event lineage tracking
- independent release verification

---

## What Makes This Different

Most CI/CD systems can show that a workflow ran.

GetIntegrityAPI Proof of Publish creates an independent, cryptographically verifiable receipt for the release event.

Each receipt provides:

- a public verification URL
- a signed proof capsule
- a machine-readable receipt
- a SHA-256 digest for offline integrity checks
- a human-readable PDF receipt
- downloadable workflow artifacts for evidence retention

This gives release, security, and platform teams a lightweight way to preserve proof-backed deployment evidence.

---

## Who This Is For

GetIntegrityAPI Proof of Publish is designed for teams that need verifiable release evidence without operating their own validator infrastructure.

It is especially relevant for:

- DevOps and platform teams
- DevSecOps and security teams
- software supply-chain and release governance workflows
- audit, compliance, and evidence-retention processes
- teams that need public verification links for release or deployment activity
- organisations that want tamper-evident CI/CD records without heavyweight tooling

---

## What This Action Produces

Each workflow run produces:

- a Proof ID
- a public verification URL
- a SHA-256 digest for offline integrity checks
- a human-readable PDF receipt
- machine-readable receipt artifacts for evidence packaging

The recommended operating model is:

- public receipt URL for online verification
- generated workflow artifacts for evidence retention and audit packaging
- public key registry for independent cryptographic verification

---

## Generated Artifacts

Each run generates the following files:

```text
receipt.json
receipt.sha256
receipt.pdf
```

| Artifact | Purpose |
| --- | --- |
| `receipt.json` | Canonical machine-readable integrity record |
| `receipt.sha256` | SHA-256 digest used for offline integrity verification |
| `receipt.pdf` | Human-readable receipt for audit, review, and compliance evidence |

These files are intended to be preserved as GitHub Actions artifacts or stored alongside:

- release artifacts
- deployment records
- compliance documentation
- audit evidence packages
- supply-chain security archives

`receipt.pdf` is a generated workflow artifact, not a permanent public hosted report URL.

---

## Usage and Quota Note

Each successful workflow run generates a new Proof-of-Publish receipt.

Viewing an existing receipt, downloading an artifact bundle, opening a public verification URL, or inspecting previous workflow runs does not consume additional API usage.

Only generating a new proof consumes usage from the configured `GI_API_KEY`.

For public demos, use a dedicated demo or sandbox key. For customer testing, fork the demo repository and configure your own `GI_API_KEY` secret.

---

## Quick Start

1. Create or open the repository where you want publish proofs to be generated.
2. Add a repository secret named `GI_API_KEY`.
3. Create `.github/workflows/publish-receipt.yml`.
4. Add `uses: GetIntegrityAPI/proof-of-publish@v1` to the workflow.
5. Run the workflow manually or trigger it from your release process.
6. Review the generated:
   - `proof_id`
   - `receipt_url`
   - `receipt_sha256`
   - `receipt.pdf`
   - artifact bundle

This repository hosts the Action itself. Your normal production usage will usually happen in a separate consumer repository.

---

## Usage

Add the Action to your workflow and upload the generated receipt files as workflow artifacts.

```yaml
name: Publish Receipt

on:
  workflow_dispatch:
  push:
    branches: [ main ]

permissions:
  contents: read

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
        uses: actions/upload-artifact@v6
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
          echo "## GetIntegrityAPI Publish Receipt" >> $GITHUB_STEP_SUMMARY
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

- a public verification surface
- downloadable receipt artifacts
- a machine-readable integrity record
- an audit-friendly PDF receipt

---

## Demo Repository

A public demo consumer repository is available to show the standard onboarding and execution flow in a separate GitHub repository:

[`GetIntegrityAPI/proof-of-publish-demo`](https://github.com/GetIntegrityAPI/proof-of-publish-demo)

Latest successful demo proof:

[`View public verification receipt`](https://api.getintegrityapi.com/verify/2558d4d1-7858-4ea6-ad8e-37d276dad521)

Example generated artifacts:

- [`receipt.json`](https://assets.getintegrityapi.com/Website-images/PDFs/Example_Publish_Proof_Receipt.json)
- [`receipt.sha256`](https://assets.getintegrityapi.com/Website-images/PDFs/receipt.sha256)
- [`receipt.pdf`](https://assets.getintegrityapi.com/Website-images/PDFs/Example_Publish_Proof_Receipt.pdf)

The demo repository shows how a consumer repo can:

- install `GetIntegrityAPI/proof-of-publish@v1`
- store `GI_API_KEY` in GitHub Actions secrets
- generate a `proof_id`
- open the public `receipt_url`
- download the workflow artifact bundle

Viewing the demo receipt, downloading demo artifacts, or inspecting previous demo workflow runs does not generate a new proof or consume API usage.

Running the demo workflow manually creates a new publish receipt and consumes one usage unit from the configured `GI_API_KEY`.

This is the recommended reference model for customer onboarding, as distinct from this repository, which hosts the Action implementation itself.

---

## Inputs

| Input | Description | Required |
| --- | --- | --- |
| `api_key` | GetIntegrityAPI scoped API key | Yes |

---

## Outputs

| Output | Description |
| --- | --- |
| `proof_id` | Generated proof capsule ID |
| `receipt_url` | Public verification receipt URL |
| `receipt_sha256` | SHA-256 digest of `receipt.json` for offline integrity verification |
| `receipt_pdf_path` | Runner path to the generated `receipt.pdf` file |

---

## Example Job Summary

```text
Proof ID: 2558d4d1-7858-4ea6-ad8e-37d276dad521
Verification URL: https://api.getintegrityapi.com/verify/2558d4d1-7858-4ea6-ad8e-37d276dad521
Receipt SHA256: see receipt.sha256 artifact
Receipt PDF Path: /home/runner/work/proof-of-publish-demo/proof-of-publish-demo/receipt.pdf
```

---

## Verifying a Proof

Proofs generated by this Action can be verified in multiple ways.

### 1. Public Verification URL

Each run returns a `receipt_url` output that opens the public verification receipt page.

Example:

```text
https://api.getintegrityapi.com/verify/<proof_id>
```

This is the primary online verification surface for sharing and review.

### 2. GitHub Workflow Artifacts

The generated files can be downloaded from the workflow run artifacts:

```text
receipt.json
receipt.sha256
receipt.pdf
```

This is the recommended way to retain evidence packages from CI/CD runs.

### 3. Offline Integrity Verification

For offline integrity workflows:

- preserve `receipt.json`
- preserve `receipt.sha256`
- verify the SHA-256 digest locally
- verify the signed proof using the published public key material

This supports independent verification workflows without relying solely on the UI.

---

## Public Key Endpoints

GetIntegrityAPI publishes verification key material for independent proof verification.

```text
https://api.getintegrityapi.com/.well-known/hp-public-key
https://api.getintegrityapi.com/.well-known/hp-keys
```

These endpoints support cryptographic verification workflows using the published signing keys.

---

## Adding Your API Key

Store your API key as a GitHub Actions secret.

1. Open repository **Settings**.
2. Navigate to **Secrets and variables → Actions**.
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

For public examples or demos, use a dedicated demo or sandbox key. Do not place API keys directly in workflow files, README files, screenshots, issues, or public logs.

---

## Security Notes

- use scoped API keys
- store secrets in GitHub Actions Secrets
- rotate keys periodically according to your CI/CD security policy
- preserve receipt artifacts with your release evidence where appropriate
- treat `receipt.json` and `receipt.sha256` as part of your integrity evidence package
- do not expose `GI_API_KEY` in repository files, workflow logs, screenshots, issues, or public documentation

Generated receipts strengthen software supply-chain integrity by providing independent, cryptographically verifiable release evidence.

---

## Documentation

- [Developer Guide](https://getintegrityapi.com/docs)
- [Interactive API Reference](https://getintegrityapi.com/api)
- [Proof Verification](https://getintegrityapi.com/verify)

---

## About GetIntegrityAPI

GetIntegrityAPI provides cryptographically verifiable event integrity infrastructure.

The platform enables developers and organizations to generate tamper-evident proofs for software releases, operational events, and system records without operating validator infrastructure.

Learn more at [getintegrityapi.com](https://getintegrityapi.com).
