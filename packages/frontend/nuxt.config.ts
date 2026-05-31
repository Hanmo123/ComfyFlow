import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["./app/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        "@vue-flow/background",
        "@vue-flow/controls",
        "@vue-flow/core",
        "@vue-flow/minimap",
        "class-variance-authority",
        "clsx",
        "lucide-vue-next",
        "reka-ui",
        "tailwind-merge",
      ],
    },
  },

  modules: ["shadcn-nuxt"],
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: "@/components/ui",
  },

  routeRules: {
    "/**": { ssr: false },
  },
});
