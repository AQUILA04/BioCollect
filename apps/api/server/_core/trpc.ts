import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "Administrateur") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé au rôle Administrateur." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const supervisorProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const user = opts.ctx.user;
    if (!user || (user.role !== "Administrateur" && user.role !== "Superviseur")) {
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
