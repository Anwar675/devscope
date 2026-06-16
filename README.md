This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Load Test Infrastructure Agent

Users can install the optional infra agent on their server to collect host CPU/RAM,
Docker container stats, and Kubernetes pod/container metrics for load-test
architecture recommendations.

On the DevScope server, set a shared token:

```bash
LOADTEST_AGENT_TOKEN="replace-with-a-long-random-token"
```

On the user's server, run:

```bash
node scripts/devscope-infra-agent.mjs \
  --run-id lt_your_run_id \
  --post-url https://your-devscope-host/api/loadtest/lt_your_run_id/infrastructure \
  --token "$LOADTEST_AGENT_TOKEN"
```

If Docker or Kubernetes metrics are unavailable, the agent keeps the existing
CPU/RAM keys and marks pod/container metrics as `not_collected` or `unknown`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
