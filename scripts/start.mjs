// Hostinger injects $PORT; local dev defaults to 3000.
// Next.js standalone server reads PORT and HOSTNAME from the environment.
process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

import("./.next/standalone/server.js");
