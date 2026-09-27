#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";

import { publishIpns, uploadDirectory, writeDeployRecord } from "./lib/pinata.mjs";

const outDir = process.env.OUT_DIR?.trim() || "out";

if (!existsSync(join(process.cwd(), outDir))) {
  console.error(`Missing ${outDir}/ — run: npm run build`);
  process.exit(1);
}

try {
  console.log(`pinata: uploading ${outDir}/ …`);
  const upload = await uploadDirectory(outDir);
  let ipns = null;
  if (process.env.PINATA_IPNS_NAME?.trim()) {
    console.log(`pinata: publishing IPNS name "${process.env.PINATA_IPNS_NAME.trim()}" …`);
    ipns = await publishIpns(upload.cid);
  }

  const record = {
    deployedAt: new Date().toISOString(),
    ...upload,
    ipns,
  };
  const recordPath = writeDeployRecord(record);

  console.log("");
  console.log("Optional IPFS pin — share these:");
  console.log(`  CID:       ${upload.cid}`);
  console.log(`  Gateway:   ${upload.directoryUrl}`);
  console.log(`  dweb.link: ${upload.dwebUrl}`);
  if (ipns) {
    console.log(`  IPNS:      ${ipns.ipnsUrl}`);
    console.log(`  dweb IPNS: ${ipns.dwebIpnsUrl}`);
  }
  console.log("");
  console.log(`Record: ${recordPath.replace(/\\/g, "/")}`);
  console.log("");
  console.log("Bake into .env.local, then rebuild once:");
  console.log(`  NEXT_PUBLIC_IPFS_CID=${upload.cid}`);
  console.log(`  NEXT_PUBLIC_IPFS_GATEWAY=${upload.gateway}`);
  if (ipns) {
    console.log(`  NEXT_PUBLIC_IPNS_NAME=${ipns.name}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
