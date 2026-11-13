# Agensi skill package

`household-finance-assistant/` is the folder to zip and upload to Agensi
(`SKILL.md` must be at the root of the zip).

```
household-finance-assistant/
├── SKILL.md              # instructions the buyer's agent follows
├── scripts/hfi.mjs       # small client (Node 18+, no dependencies)
├── references/api.md     # request / response reference
└── config/env.example    # the two settings a buyer needs
```

It contains no secrets. Each buyer creates their own API key in the web app.

Before uploading: deploy the agent API (see [`docs/AGENT_API.md`](../docs/AGENT_API.md))
and test the skill yourself with your own key.
