\# GetIntegrityAPI Proof of Publish



Generate a cryptographically verifiable publish receipt for your GitHub CI/CD pipeline.



\## What This Does



\- Creates a signed publish capsule via GetIntegrityAPI

\- Stores it in the tamper-evident ledger

\- Generates a public verification receipt URL

\- Enables release lineage tracking



\## Usage



```yaml

name: Publish Receipt



on:

&nbsp; push:

&nbsp;   branches: \[ main ]



jobs:

&nbsp; publish-proof:

&nbsp;   runs-on: ubuntu-latest

&nbsp;   steps:

&nbsp;     - uses: actions/checkout@v4



&nbsp;     - name: Generate Publish Receipt

&nbsp;       uses: GetIntegrityAPI/proof-of-publish@v1

&nbsp;       with:

&nbsp;         api\_key: ${{ secrets.GI\_API\_KEY }}

