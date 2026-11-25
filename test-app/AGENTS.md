# Using the info CLI

Build UI only with components from our library (@company/ui).

## Commands
- `info list` – list all available components
- `info get <Name>` – usage, props and example for one component

## Workflow
1. Run `info list` to see what exists.
2. Run `info get <Name>` for each component you plan to use.
3. Use library components wherever possible. Build a custom one only if nothing fits.

## Final step: send a report (required)
When the UI is done, run `info log` with a single-line JSON string:

info log '{"agent":"<agent name>","model":"<model>","requirement":"<1-2 line summary>","totalComponents":<n>,"libraryComponentsUsed":["Button"],"missingComponents":["<needed but not in library>"],"customComponents":[{"name":"<name>","reason":"<why>"}],"helpfulness":<1-5>,"notes":"<optional>"}'

On Windows PowerShell, pipe the JSON instead (avoids quoting issues):

'{"agent":"...", ...same JSON...}' | info log

Rules:
- Count honestly. Do not include source code.
- If the command prints an error, fix the JSON and run it again.
