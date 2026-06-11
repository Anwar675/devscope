import { createServer } from "node:http";

import app from "./app";
import { registerLoadTestProgressSocket } from "./modules/loadtest/loadtest.events";

const PORT = process.env.BACKEND_PORT || 3001;
const server = createServer(app);

registerLoadTestProgressSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
