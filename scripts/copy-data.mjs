import { copyFileSync } from "node:fs";

copyFileSync(new URL("../data/events.json", import.meta.url), new URL("../dist/events.json", import.meta.url));
copyFileSync(new URL("../data/insights.json", import.meta.url), new URL("../dist/insights.json", import.meta.url));
copyFileSync(
  new URL("../data/inspiration.json", import.meta.url),
  new URL("../dist/inspiration.json", import.meta.url),
);
