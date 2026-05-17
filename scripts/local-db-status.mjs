import fs from "node:fs";
import { getDatabaseConfig, getLocalDatabaseState, statusFile } from "./local-db-shared.mjs";

const config = getDatabaseConfig();
const state = await getLocalDatabaseState(config);

let details = null;
if (fs.existsSync(statusFile)) {
  details = JSON.parse(fs.readFileSync(statusFile, "utf8"));
}

console.log(
  JSON.stringify(
    {
      running: state.running,
      managedRunning: state.managedRunning,
      reachable: state.reachable,
      pidRunning: state.pidRunning,
      staleState: state.staleState,
      pid: state.pid,
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
      },
      details,
    },
    null,
    2,
  ),
);

process.exit(state.running ? 0 : 1);