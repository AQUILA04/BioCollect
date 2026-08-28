import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CountUp } from "@/components/landing/CountUp";
import { CursorGlow } from "@/components/landing/CursorGlow";
import { HeroMockup } from "@/components/landing/HeroMockup";
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/Reveal";
import { useI18n } from "@/contexts/I18nContext";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CloudOff,
  Fingerprint,
  FolderKanban,
  LockKeyhole,
  Menu,
  ScanLine,
  ShieldCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type FeatureItem = {
  icon: LucideIcon;
  titleKey: "landing.featureOfflineTitle" | "landing.featureBiometricTitle" | "landing.featureDedupTitle" | "landing.featureIsolatedTitle";
  textKey: "landing.featureOfflineText" | "landing.featureBiometricText" | "landing.featureDedupText" | "landing.featureIsolatedText";
};

type MetricItem = {
  icon: LucideIcon;
  valueKey: "landing.metricOfflineValue" | "landing.metricRolesValue" | "landing.metricWorkflowValue";
  suffixKey: "landing.metricOfflineSuffix" | "landing.metricRolesSuffix" | "landing.metricWorkflowSuffix";
  labelKey: "landing.metricOfflineLabel" | "landing.metricRolesLabel" | "landing.metricWorkflowLabel";
};

const featureItems: FeatureItem[] = [
  { icon: CloudOff, titleKey: "landing.featureOfflineTitle", textKey: "landing.featureOfflineText" },
  { icon: Fingerprint, titleKey: "landing.featureBiometricTitle", textKey: "landing.featureBiometricText" },
  { icon: ScanLine, titleKey: "landing.featureDedupTitle", textKey: "landing.featureDedupText" },
  { icon: ShieldCheck, titleKey: "landing.featureIsolatedTitle", textKey: "landing.featureIsolatedText" },
];

const metricItems: MetricItem[] = [
  { icon: CloudOff, valueKey: "landing.metricOfflineValue", suffixKey: "landing.metricOfflineSuffix", labelKey: "landing.metricOfflineLabel" },
  { icon: UsersRound, valueKey: "landing.metricRolesValue", suffixKey: "landing.metricRolesSuffix", labelKey: "landing.metricRolesLabel" },
  { icon: Activity, valueKey: "landing.metricWorkflowValue", suffixKey: "landing.metricWorkflowSuffix", labelKey: "landing.metricWorkflowLabel" },
];

const heroStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ target: pageRef, offset: ["start start", "end start"] });
  const heroParallax = useTransform(scrollY, [0, 420], [0, reduceMotion ? 0 : -36]);

  useEffect(() => {
    function onScroll() {
      setHeaderScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goToSpaces() {
    setLocation("/spaces");
  }

  function signIn() {
    if (isAuthenticated) return goToSpaces();
    if (!startLogin({ mode: "login" })) {
      toast.error(t("auth.keycloakUnavailable"));
    }
  }

  function createWorkspace() {
    if (isAuthenticated) return goToSpaces();
    if (!startLogin({ mode: "register" })) {
      toast.error(t("auth.keycloakUnavailable"));
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const trustItems = [t("landing.browserFree"), t("landing.isolatedData"), t("landing.auditedDecisions")];

  return (
    <div ref={pageRef} className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="landing-grid-drift pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_10%_12%,rgba(37,99,235,.55),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(16,185,129,.28),transparent_24%),linear-gradient(rgba(148,163,184,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.09)_1px,transparent_1px)] [background-size:auto,auto,42px_42px,42px_42px]"
      />
      <CursorGlow />

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          headerScrolled ? "border-b border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-lg shadow-slate-950/20" : "bg-transparent"
        }`}
      >
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight transition-opacity hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/25">
              <Fingerprint className="h-5 w-5" />
            </span>
            BioCollect
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#fonctionnalites" className="landing-nav-link">
              {t("landing.features")}
            </a>
            <a href="#avantages" className="landing-nav-link">
              {t("landing.benefits")}
            </a>
            <a href="#espaces" className="landing-nav-link">
              {t("landing.spaces")}
            </a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSelector />
            {isAuthenticated ? (
              <Button onClick={goToSpaces} className="group bg-white text-slate-950 hover:bg-slate-100">
                {t("landing.login")}
                <ArrowRight className="landing-cta-arrow ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={signIn} className="text-slate-200 hover:bg-white/10 hover:text-white">
                  {t("landing.signIn")}
                </Button>
                <Button onClick={createWorkspace} className="group bg-white text-slate-950 hover:bg-slate-100">
                  {t("landing.createSpace")}
                  <ArrowRight className="landing-cta-arrow ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <LanguageSelector compact />
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(value => !value)} aria-label={t("landing.openNavigation")}>
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={reduceMotion ? undefined : { height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden border-y border-white/10 md:hidden"
            >
              <div className="grid gap-4 px-6 py-4 text-sm text-slate-300">
                <a href="#fonctionnalites" onClick={closeMenu}>
                  {t("landing.features")}
                </a>
                <a href="#avantages" onClick={closeMenu}>
                  {t("landing.benefits")}
                </a>
                <a href="#espaces" onClick={closeMenu}>
                  {t("landing.spaces")}
                </a>
                {isAuthenticated ? (
                  <Button onClick={() => { closeMenu(); goToSpaces(); }} className="w-full bg-white text-slate-950">
                    {t("landing.login")}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { closeMenu(); signIn(); }} className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                      {t("landing.signIn")}
                    </Button>
                    <Button onClick={() => { closeMenu(); createWorkspace(); }} className="w-full bg-white text-slate-950">
                      {t("landing.createSpace")}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8 lg:pb-32 lg:pt-24">
          {reduceMotion ? (
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {t("landing.slogan")}
              </p>
              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                {t("landing.heroTitlePrefix")}{" "}
                <span className="text-blue-300">{t("landing.heroTitleHighlight")}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{t("landing.heroText")}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={createWorkspace} className="group bg-blue-500 shadow-lg shadow-blue-500/25 hover:bg-blue-400">
                  {t("landing.createFree")}
                  <ArrowRight className="landing-cta-arrow ml-2 h-4 w-4" />
                </Button>
                <a href="#fonctionnalites">
                  <Button size="lg" variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                    {t("landing.discover")}
                  </Button>
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {trustItems.map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <motion.div variants={heroStagger} initial="hidden" animate="visible">
              <motion.p variants={heroItem} className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                {t("landing.slogan")}
              </motion.p>
              <motion.h1 variants={heroItem} className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                {t("landing.heroTitlePrefix")}{" "}
                <span className="text-blue-300">{t("landing.heroTitleHighlight")}</span>
              </motion.h1>
              <motion.p variants={heroItem} className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                {t("landing.heroText")}
              </motion.p>
              <motion.div variants={heroItem} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={createWorkspace} className="group bg-blue-500 shadow-lg shadow-blue-500/25 hover:bg-blue-400">
                  {t("landing.createFree")}
                  <ArrowRight className="landing-cta-arrow ml-2 h-4 w-4" />
                </Button>
                <a href="#fonctionnalites">
                  <Button size="lg" variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto">
                    {t("landing.discover")}
                  </Button>
                </a>
              </motion.div>
              <motion.div variants={heroItem} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {trustItems.map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}

          <motion.div style={{ y: heroParallax }}>
            <HeroMockup />
          </motion.div>
        </section>

        <section id="fonctionnalites" className="bg-white py-24 text-slate-950">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">{t("landing.featuresEyebrow")}</p>
              <div className="mt-4 flex max-w-3xl flex-col justify-between gap-5 lg:flex-row">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.featuresTitle")}</h2>
                <p className="max-w-md text-slate-500">{t("landing.featuresDescription")}</p>
              </div>
            </Reveal>

            <RevealGroup className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featureItems.map(feature => (
                <RevealItem key={feature.titleKey}>
                  <article className="group landing-card-hover h-full rounded-2xl border border-slate-200 bg-slate-50 p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition-transform duration-300 group-hover:scale-105">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{t(feature.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t(feature.textKey)}</p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section id="avantages" className="bg-slate-100 py-24 text-slate-950">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-blue-700">{t("landing.benefitsEyebrow")}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.benefitsTitle")}</h2>
              <p className="mt-5 leading-7 text-slate-600">{t("landing.benefitsDescription")}</p>
            </Reveal>

            <RevealGroup className="grid gap-4 sm:grid-cols-3">
              {metricItems.map(metric => (
                <RevealItem key={metric.labelKey}>
                  <div className="landing-card-hover rounded-2xl bg-white p-6 shadow-sm">
                    <metric.icon className="h-5 w-5 text-blue-700" />
                    <p className="mt-8 text-3xl font-semibold">
                      <CountUp value={Number(t(metric.valueKey))} suffix={t(metric.suffixKey)} />
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{t(metric.labelKey)}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section id="espaces" className="bg-white py-24 text-slate-950">
          <Reveal className="mx-auto max-w-5xl px-6 text-center lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{t("landing.spacesTitle")}</h2>
            <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-600">{t("landing.spacesDescription")}</p>
            <Button size="lg" onClick={createWorkspace} className="group mt-8 bg-slate-950 hover:bg-slate-800">
              {t("landing.createEntitySpace")}
              <FolderKanban className="landing-cta-arrow ml-2 h-4 w-4" />
            </Button>
          </Reveal>
        </section>
      </main>

      <footer className="relative border-t border-white/10 px-6 py-8 text-center text-sm text-slate-400">{t("landing.footer")}</footer>
    </div>
  );
}
