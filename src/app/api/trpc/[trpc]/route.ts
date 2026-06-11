import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import {
  describeDatabaseConfig,
  describeDatabaseError,
  logDatabaseQueryError,
} from "~/server/db-diagnostics";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      const route = path ?? "<no-path>";
      const cause = error.cause ?? error;
      const dbError = describeDatabaseError(cause);

      if (dbError) {
        logDatabaseQueryError(route, cause);
      }

      console.error(`[TRPC] ${route} failed`, {
        code: error.code,
        message: error.message,
        ...(env.NODE_ENV === "production"
          ? { database: describeDatabaseConfig() }
          : {}),
        ...(dbError ? { databaseError: dbError } : {}),
      });
    },
  });

export { handler as GET, handler as POST };
