import fs from 'fs';
import { execSync } from 'child_process';

const jarPath = 'wrapper.jar';
const manifestPath = 'META-INF/MANIFEST.MF';

try {
    // We'll use powershell to extract just the manifest
    execSync(`powershell -Command "Expand-Archive -Path ${jarPath} -DestinationPath temp_manifest -Force"`);
    const manifest = fs.readFileSync('temp_manifest/META-INF/MANIFEST.MF', 'utf8');
    console.log('Manifest Content:\n', manifest);
    execSync('powershell -Command "Remove-Item -Recurse temp_manifest"');
} catch (e) {
    console.error('Error:', e.message);
}
