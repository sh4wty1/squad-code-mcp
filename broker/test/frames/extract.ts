// Runs the prototype's script outside the browser and dumps each frame as text.
import { readFileSync, writeFileSync } from "node:fs";
const [html, outDir] = process.argv.slice(2);
const src = readFileSync(html!, "utf8");
const m = /<script type="text\/x-dc" data-dc-script>([\s\S]*?)<\/script>/.exec(src)!;
const body = m[1]!.replace(/class Component extends DCLogic[\s\S]*$/, "");
const fn = new Function("React", "document", body + "\nreturn {FRAMES};");
const { FRAMES } = fn({ createElement: () => null, createRef: () => ({}) }, {});
const index: string[] = [];
for (const [label, note, make] of FRAMES) {
  const g = make();
  const id = String(label).split(" · ")[0];
  const text = g.R.map((r: any[]) => r.map((k) => k.c).join("").replace(/\s+$/, "")).join("\n") + "\n";
  writeFileSync(`${outDir}/${id}.txt`, text);
  index.push(`${id}\t${g.w}x${g.h}\t${label}\t${note}`);
}
writeFileSync(`${outDir}/index.tsv`, index.join("\n") + "\n");
console.log(index.join("\n"));
