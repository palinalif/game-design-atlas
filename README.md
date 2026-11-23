# PLAYABLE — A Game Design Atlas

A self-contained static site cataloging influential and unusual video games, including artwork, manuals, estimated playtimes and personal progress tracking

## Automated IGDB metadata

PLAYABLE keeps a public cached JSON file in `data/enrichment.json`, while
`scripts/sync-igdb.mjs` fetches metadata from IGDB in a GitHub Action. No secret
or token is exposed to visitors.

1. Register a **Confidential** application in [Twitch Developer Console](https://dev.twitch.tv/console/apps) for free IGDB access. A callback URL is required by Twitch's app registration; for a server-side client-credentials app it is not used by PLAYABLE. Follow Twitch's registration requirements.
2. Add two **Actions** repository secrets at **Settings → Secrets and variables → Actions**:
   - `IGDB_CLIENT_ID` — Twitch application Client ID
   - `IGDB_CLIENT_SECRET` — Twitch application Client Secret
3. Open [Refresh game metadata (IGDB)](https://github.com/palinalif/game-design-atlas/actions/workflows/refresh-game-data.yml) and select **Run workflow**. The scheduled job also refreshes weekly.
4. Review the job log for games needing manual ID matching. Existing editorial content, playtimes, and cover fallbacks remain available even if an API call fails.

The website fetches the public JSON directly from GitHub's raw file host so scheduled
`GITHUB_TOKEN` commits do not require another GitHub Pages build.
Estimates come from the IGDB time-to-beat endpoint (not HowLongToBeat).
