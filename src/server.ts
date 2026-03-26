import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || '8080';

  // --- API Routes (Your Chat Logic) ---
  app.post('/api/chat', (req, res) => { /* ... existing logic ... */ res.send("AI logic here"); });

  // --- STATIC FILE SOLVER ---
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // List of possible places where Vite might have put 'index.html'
    const root = process.cwd(); // Should be /app
    const possiblePaths = [
      path.join(root, 'dist'),
      path.join(root, 'build'),
      path.join(__dirname, 'dist'),
      path.join(__dirname, '..', 'dist')
    ];

    let finalPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        finalPath = p;
        break;
      }
    }

    if (finalPath) {
      console.log(`✅ FOUND FRONTEND AT: ${finalPath}`);
      app.use(express.static(finalPath));
      app.get('*', (req, res) => res.sendFile(path.join(finalPath, 'index.html')));
    } else {
      // THIS IS THE FAIL-SAFE: If it can't find the files, it prints the directory tree
      console.error(`❌ ERROR: Could not find index.html.`);
      console.log(`Current Dir: ${root}`);
      console.log(`Root Contents: ${fs.readdirSync(root)}`);
      
      app.get('*', (req, res) => {
        const tree = fs.readdirSync(root).join(', ');
        res.status(404).send(`Frontend missing. Files found in /app: ${tree}`);
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on ${PORT}`);
  });
}

startServer().catch(console.error);
