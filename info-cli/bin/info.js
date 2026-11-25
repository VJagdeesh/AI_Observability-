#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";

// Your Vercel proxy endpoint (no API key in the CLI)
const REPORT_URL = " https://info-proxy-1.vercel.app/api/report";

// ---------- Dummy component library ----------
const components = {
  Button: {
    description: "Clickable button for actions.",
    import: 'import { Button } from "@company/ui";',
    props: { variant: '"primary" | "secondary"', onClick: "() => void" },
    example: '<Button variant="primary" onClick={save}>Save</Button>',
  },
  Input: {
    description: "Single-line text field.",
    import: 'import { Input } from "@company/ui";',
    props: {
      label: "string",
      value: "string",
      onChange: "(v: string) => void",
    },
    example: '<Input label="Email" value={email} onChange={setEmail} />',
  },
  Card: {
    description: "Container with padding and shadow.",
    import: 'import { Card } from "@company/ui";',
    props: { title: "string", children: "ReactNode" },
    example: '<Card title="Profile">...</Card>',
  },
};

// ---------- AGENTS.md content written by `info init` ----------
const AGENTS_MD = `# Using the info CLI

Build UI only with components from our library (@company/ui).

## Commands
- \`info list\` – list all available components
- \`info get <Name>\` – usage, props and example for one component

## Workflow
1. Run \`info list\` to see what exists.
2. Run \`info get <Name>\` for each component you plan to use.
3. Use library components wherever possible. Build a custom one only if nothing fits.

## Final step: send a report (required)
When the UI is done, run \`info log\` with a single-line JSON string:

info log '{"agent":"<agent name>","model":"<model>","requirement":"<1-2 line summary>","totalComponents":<n>,"libraryComponentsUsed":["Button"],"missingComponents":["<needed but not in library>"],"customComponents":[{"name":"<name>","reason":"<why>"}],"helpfulness":<1-5>,"notes":"<optional>"}'

On Windows PowerShell, pipe the JSON instead (avoids quoting issues):

'{"agent":"...", ...same JSON...}' | info log

Rules:
- Count honestly. Do not include source code.
- If the command prints an error, fix the JSON and run it again.
`;

// ---------- CLI ----------
const program = new Command();
program
  .name("info")
  .description("Company UI library helper for AI agents")
  .version("0.1.0");

program
  .command("init")
  .description("Create AGENTS.md in the current folder")
  .action(() => {
    writeFileSync("AGENTS.md", AGENTS_MD);
    console.log("AGENTS.md created.");
  });

program
  .command("list")
  .description("List available components")
  .action(() => {
    for (const [name, c] of Object.entries(components))
      console.log(`${name} - ${c.description}`);
  });

program
  .command("get <name>")
  .description("Show usage of a component")
  .action((name) => {
    const c = components[name];
    if (!c) {
      console.error(`"${name}" not found. Run "info list".`);
      process.exit(1);
    }
    console.log(JSON.stringify({ name, ...c }, null, 2));
  });

program
  .command("log [report]")
  .description("Send the agent's build report (JSON string or stdin)")
  .action(async (reportArg) => {
    // Accept the JSON as an argument, or piped through stdin
    let raw = reportArg;
    if (!raw && !process.stdin.isTTY) {
      raw = "";
      for await (const chunk of process.stdin) raw += chunk;
    }
    if (!raw) {
      console.error("No report given. Pass JSON as an argument or pipe it in.");
      process.exit(1);
    }

    let report;
    try {
      report = JSON.parse(raw.trim());
    } catch {
      console.error("Report must be valid JSON. Fix it and retry.");
      process.exit(1);
    }
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      console.error("Report must be a JSON object. Fix it and retry.");
      process.exit(1);
    }

    const required = [
      "agent",
      "requirement",
      "totalComponents",
      "libraryComponentsUsed",
      "helpfulness",
    ];
    const missing = required.filter((k) => !(k in report));
    if (missing.length) {
      console.error(`Missing fields: ${missing.join(", ")}. Fix and retry.`);
      process.exit(1);
    }

    // Send only the report to the proxy; the proxy adds the Datadog key
    const url = process.env.INFO_REPORT_URL ?? REPORT_URL;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        console.log("Report sent.");
      } else {
        const body = await res.json().catch(() => ({}));
        console.error(
          `Report rejected (${res.status}): ${body.error ?? "unknown error"}. Fix and retry.`,
        );
        process.exitCode = 1;
      }
    } catch (e) {
      // Network problems should not break the user's work
      console.warn(`Report not sent: ${e.message}`);
    }
  });

await program.parseAsync();
