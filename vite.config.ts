import react from "@vitejs/plugin-react-swc";
import { promises as fs } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
// import mkcert from "vite-plugin-mkcert";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";

const backend = "http://localhost:5212";
const backendProxyOption = { target: backend, headers: { host: new URL(backend).host } };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate：新版本发布后 Service Worker 立即接管并刷新页面。自建部署里旧包被 SW
      // 长期缓存会让用户看到「改完了但页面没变」的假象（Pro 徽标、旧布局等），因此这里不做
      // 手动确认。若希望保留「有新版本，请刷新」的提示流程，改回 "prompt" 即可。
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false,
      workbox: {
        // 注意：index.html 必须排除在 precache 之外。
        //
        // workbox-precaching 对以 `/` 结尾的请求会自动追加 index.html 去找缓存条目
        // （目录索引匹配），而这一步发生在 NavigationRoute 的 denylist 之前。只要
        // precache 里有 index.html，访问 `/` 就会直接命中缓存的 SPA 壳，永远打不开
        // Go 反向代理给 Astro 渲染的官网首页 —— 加多少 denylist 都没用。
        globIgnores: ["**/*leaflet*", "**/*mapbox*", "**/*Leaflet*", "**/*Mapbox*", "index.html"],
        // 插件默认会补上 `navigateFallback: "index.html"`，必须显式关掉：index.html 已经
        // 不在 precache 里，workbox 的 createHandlerBoundToURL 会直接抛 non-precached-url，
        // 让整个 Service Worker 安装失败。导航由下面的 NetworkFirst 负责。
        navigateFallback: undefined,
        maximumFileSizeToCacheInBytes: 10000000,
        // 导航请求统一 NetworkFirst：在线时始终取服务端最新 HTML（官网首页 / 小店前台
        // 来自 Astro，控制台 / 登录页来自内嵌 SPA），离线时才回退到缓存。
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "storflow-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32 },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/pdfjs-dist/build/*.mjs",
          dest: "assets/pdfjs",
        },
      ],
    }),
    {
      name: "load-stylesheet-async",
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(.+?)">/g,
          `<link rel="stylesheet" crossorigin href="$1" media="print" onload="this.media='all'">`,
        );
      },
    },
    {
      name: "generate-version",
      async writeBundle(outputOptions) {
        const version = {
          name: process.env.npm_package_name,
          version: process.env.npm_package_version,
        };
        const path = resolve(__dirname, outputOptions.dir, "version.json");
        await fs.writeFile(path, JSON.stringify(version));
      },
    },
  ],
  define: {
    __ASSETS_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: "build", // keep same as v3 with minimal changes
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const chunkMap = {
            common: [
              "vite/preload-helper",
              "vite/modulepreload-polyfill",
              "vite/dynamic-import-helper",
              "commonjsHelpers",
              "commonjs-dynamic-modules",
              "__vite-browser-external",
            ],
            monaco: ["monaco-editor"],
            codemirror: ["@codemirror"],
            excalidraw: [
              "node_modules/@excalidraw",
              "node_modules/browser-fs-access",
              "node_modules/image-blob-reduce",
              "node_modules/pica/",
            ],
            mermaid: ["node_modules/mermaid", "node_modules/katex"],
            leaflet: ["node_modules/leaflet", "node_modules/react-leaflet"],
            react: ["node_modules/react", "node_modules/react-dom"],
            mapbox: ["node_modules/mapbox-gl"],
          };

          // https://github.com/vitejs/vite/issues/5189#issuecomment-2175410148
          for (const [chunkName, patterns] of Object.entries(chunkMap)) {
            if (patterns.some((pattern) => id.includes(pattern))) {
              return chunkName;
            }
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    cors: false,
    proxy: {
      "/api": backendProxyOption,
      "/s/": backendProxyOption,
      "/f/": backendProxyOption,
      "/manifest.json": backendProxyOption,
    },
  },
});
