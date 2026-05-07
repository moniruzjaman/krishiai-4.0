import fs from 'fs';
import { execSync } from 'child_process';

// Since I don't have a zip library easily accessible, I'll use powershell's Expand-Archive or just try to read it.
// Actually, I'll just try to search for the string "Main-Class" in the file.
const buf = fs.readFileSync('android/gradle/wrapper/gradle-wrapper.jar');
const content = buf.toString('utf8');
if (content.includes('Main-Class')) {
    console.log('Main-Class attribute found in file.');
    // Find the class name
    const match = content.match(/Main-Class: ([^\r\n]+)/);
    if (match) console.log('Class:', match[1]);
} else {
    console.log('Main-Class attribute NOT found.');
}
