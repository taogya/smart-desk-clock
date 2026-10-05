import { cp, mkdir, rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of ["index.html", "src", ".nojekyll"])
  await cp(file, `dist/${file}`, { recursive: true });
