# Evidence rules

- **Never claim a build, test, scan or deployment passed unless you ran it in this session and saw the result.** Quote the command and the relevant output lines. "Should work" is not evidence.
- Separate what you **observed** (read in code, config, schema, output) from what you **inferred**. Label inferences.
- If you could not run something (no SDK, no DB, no network, blocked by permissions), say exactly what was not verified and how a human can verify it.
- Don't invent business rules, column mappings, proc behaviour, gateway fields or tool names. If the spec and the code disagree, stop and ask.
- Cite code as `path:line`. Cite requirements by document, version and section.
- Findings worth keeping go into `docs-claude` through a reviewed PR, not into chat history.
