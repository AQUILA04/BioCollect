import { useI18n } from "@/contexts/I18nContext";
import { motion, useReducedMotion } from "framer-motion";

const kpis = [
  { label: "VALIDATED", value: "1 284", color: "text-emerald-300" },
  { label: "SUSPECTED_DUPLICATE", value: "12", color: "text-amber-300" },
  { label: "SYNCED", value: "398", color: "text-blue-300" },
] as const;

export function HeroMockup() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="landing-orb-pulse absolute -inset-8 rounded-[2.5rem] bg-blue-500/20 blur-3xl" />
      <motion.div
        className="relative rounded-3xl border border-white/15 bg-slate-900/80 p-4 shadow-2xl backdrop-blur"
        initial={reduceMotion ? false : { opacity: 0, y: 32, scale: 0.96 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
          transition={reduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </div>
            <span className="text-xs text-slate-400">{t("landing.supervisionCenter")}</span>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-3">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.45 + index * 0.1 }}
              >
                <p className={`text-[10px] font-semibold ${kpi.color}`}>{kpi.label}</p>
                <p className="mt-3 text-2xl font-semibold">{kpi.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-emerald-400/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">{t("landing.recordVerification")}</p>
                <p className="mt-1 font-semibold">{t("landing.biometricMatch")}</p>
              </div>
              <span className="rounded-xl bg-amber-300/15 px-3 py-2 text-sm font-semibold text-amber-200">92%</span>
            </div>
            <div className="relative mt-5 h-20 overflow-hidden rounded-xl border border-dashed border-white/15 bg-slate-950/40">
              <div className="absolute inset-0 [background-image:linear-gradient(90deg,transparent_0%,rgba(96,165,250,.18)_45%,transparent_100%)]" />
              {!reduceMotion ? <div className="landing-scan-line absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" /> : null}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
