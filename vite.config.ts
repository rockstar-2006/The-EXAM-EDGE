import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use relative base './' ONLY when specifically packaging standalone desktop or mobile file:// bundles
  const isStandalonePackage = mode === 'electron' || mode === 'mobile' || process.env.ELECTRON_BUILD === 'true';

  return {
    base: isStandalonePackage ? './' : '/',
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
