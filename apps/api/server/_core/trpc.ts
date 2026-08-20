import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  if (!opts.ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentification requise." });
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = opts.ctx.user;
    if (!user || (user.role !== "Administrateur" && user.role !== "Superadmin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé au rôle Administrateur." });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);

export const superadminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = opts.ctx.user;
    if (!user || user.role !== "Superadmin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé au rôle Superadmin." });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);

export const supervisorProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = opts.ctx.user;
    if (!user || !["Superadmin", "Administrateur", "Superviseur"].includes(user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux rôles Administrateur et Superviseur." });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);

export const investigatorProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = opts.ctx.user;
    if (!user || user.role !== "Enquêteur") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé au rôle Enquêteur." });
    }
    return opts.next({ ctx: { ...opts.ctx, user } });
  }),
);
