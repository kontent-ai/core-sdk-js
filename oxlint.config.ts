import { defineConfig } from "oxlint";
import { kontentOxlintConfig } from "./lib/devkit/oxlint/kontent.oxlint-config.ts";

export default defineConfig({ extends: [kontentOxlintConfig] });
