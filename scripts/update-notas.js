import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const NOTAS_DIR = path.join(PUBLIC_DIR, 'notas');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'notas.json');

// Ensure notas directory exists
if (!fs.existsSync(NOTAS_DIR)) {
    console.log('Creating notas directory...');
    fs.mkdirSync(NOTAS_DIR, { recursive: true });
}

try {
    const files = fs.readdirSync(NOTAS_DIR);
    const pdfFiles = files
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => ({
            name: file,
            path: `/notas/${file}`
        }));

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pdfFiles, null, 4));
    console.log(`✅ Updated notas.json with ${pdfFiles.length} files.`);
    console.log('Files found:', pdfFiles.map(f => f.name).join(', '));
} catch (error) {
    console.error('❌ Error updating file list:', error);
    process.exit(1);
}
