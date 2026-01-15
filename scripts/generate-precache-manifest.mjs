#!/usr/bin/env node

/**
 * Generate precache manifest with content hashes for the service worker.
 * This script runs before the build process to ensure cache busting works correctly.
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate MD5 hash for a file
 * @param {string} filePath - Path to the file
 * @returns {string} MD5 hash of the file contents
 */
function generateFileHash(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileContent).digest('hex');
}

/**
 * Generate precache manifest with file hashes.
 */
function generatePrecacheManifest() {
  const publicDir = path.join(__dirname, '..', 'public');

  const filesToCache = [
    '/data/metadata.json',
    '/data/hotlines.json',
    '/bettergov-horizontal-logo.png',
  ];

  const manifest = {};

  console.log('🔨 Generating precache manifest...\n');

  filesToCache.forEach(fileUrl => {
    const filePath = path.join(publicDir, fileUrl);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: File not found: ${filePath}`);
      manifest[fileUrl] = null;
      return;
    }

    const hash = generateFileHash(filePath);
    manifest[fileUrl] = hash;

    console.log(`✓ ${fileUrl}`);
    console.log(`  Hash: ${hash}\n`);
  });

  const manifestPath = path.join(__dirname, '..', 'precache-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ Precache manifest generated: ${manifestPath}\n`);
}

try {
  generatePrecacheManifest();
} catch (error) {
  console.error('❌ Error generating precache manifest:', error);
  process.exit(1);
}
