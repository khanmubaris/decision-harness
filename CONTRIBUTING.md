# Contributing to Crossroads

Thanks for considering a contribution. Crossroads is a personal decision-exploration tool: it helps people inspect possible paths and trade-offs, without predicting outcomes or deciding for them.

## Start here

1. Read the [README](README.md) and [Code of Conduct](CODE_OF_CONDUCT.md).
2. Check existing issues before starting significant work.
3. For a bug or feature idea, open an issue first so the direction can be discussed.
4. Fork the repository, create a focused branch, and open a pull request against `main`.

## Local setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

The offline **Try the demo** path works without an API key. Add `OPENAI_API_KEY` only if you want to test live generation locally; never commit it.

## Before opening a pull request

```sh
npm test
npm run build
```

Explain the user problem, describe the change, and include screenshots for visible UI changes. Keep pull requests small and focused.

## Product principles

- Keep the user in control; Crossroads explores options, it does not prescribe a choice.
- Label fictional and offline content clearly.
- Keep calculations deterministic and state their assumptions.
- Do not add invented probabilities, success scores, financial forecasts, or unverified external facts.
- Support keyboard use, screen readers, mobile layouts, and `prefers-reduced-motion`.
- Never commit API keys, real personal data, browser profiles, or `.env` files.

## Demo scenarios

Fictional demos belong in `lib/decision/demo.ts`. Use clearly fictional inputs, explain relevant assumptions, and add or update tests. Demo content must work offline and must not be presented as a live AI result.

## License

By contributing, you agree that your contributions are licensed under the repository's [ISC License](LICENSE).
