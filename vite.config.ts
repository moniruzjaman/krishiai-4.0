
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        short_name: "Krishi AI 4.0",
        name: "Krishi AI 4.0: Smart Agri Ecosystem",
        description: "বাংলাদেশের কৃষকদের জন্য এআই চালিত আধুনিক কৃষি সমাধান।",
        start_url: ".",
        display: "standalone",
        theme_color: "#0A8A1F",
        background_color: "#ffffff",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  define: {
    // Safely inject env vars into the browser context
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || null),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || null),
    'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || null),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || null),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || null),
    'process.env.HF_TOKEN': JSON.stringify(process.env.HF_TOKEN || null)
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase') || id.includes('firebase') || id.includes('@capacitor') || id.includes('lucide') || id.includes('framer-motion')) {
              return 'vendor-heavy';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
