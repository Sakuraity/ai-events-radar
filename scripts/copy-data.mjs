import { copyFileSync } from "node:fs";

copyFileSync(new URL("../data/events.json", import.meta.url), new URL("../dist/events.json", import.meta.url));
