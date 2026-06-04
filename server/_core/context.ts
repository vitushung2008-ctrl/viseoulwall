import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyAdminFromRequest } from "./admin-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  isAdmin: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let isAdmin = false;

  try {
    isAdmin = await verifyAdminFromRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures
    isAdmin = false;
  }

  return {
    req: opts.req,
    res: opts.res,
    isAdmin,
  };
}
