/* eslint-disable max-lines -- page vitrine / démo, contenu long volontaire */

import Link from "next/link";

import { CheckCircle2, ClipboardList, Flame, Gauge, ShieldCheck } from "lucide-react";

const BRAND_ORANGE = "#F26A21";
const BRAND_NAVY = "#1F2C3A";
const HACCP_MAIN = "#D94B4B";
const HACCP_SECONDARY = "#F26A4B";
const HACCP_SOFT_BG = "#FDF3F3";

const FEATURES = [
  {
    icon: Gauge,
    title: "Relevés automatiques",
    description: "Températures produits",
  },
  {
    icon: ClipboardList,
    title: "Plan de contrôle digital",
    description: "Procédures et nettoyages",
  },
  {
    icon: ShieldCheck,
    title: "Traçabilité alimentaire",
    description: "Lots, produits, livraisons",
  },
  {
    icon: Flame,
    title: "Archivage réglementaire",
    description: "Historique sécurisé",
  },
  {
    icon: CheckCircle2,
    title: "Alertes & conformité",
    description: "Prêt pour contrôle DDPP",
  },
];

const STATS = [
  {
    value: "-60%",
    label: "de papiers & de stress",
  },
  {
    value: "-80%",
    label: "de temps sur relevés",
  },
  {
    value: "+Sécurité",
    label: "en cas de contrôle DDPP",
  },
  {
    value: "+Tranquillité",
    label: "réglementaire",
  },
];

export default function HaccpModulePage() {
  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,230,230,0.7),_transparent_55%),_linear-gradient(to_bottom,_#ffffff,_#f9fafb)] text-slate-900"
      style={{ color: BRAND_NAVY }}
    >
      <Header />
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pt-8 pb-20 md:px-6 md:pt-16 lg:pt-20">
        <HeroSection />
        <FeaturesSection />
        <BenefitsSection />
        <StatsSection />
        <FinalCtaSection />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ background: BRAND_ORANGE }}
          >
            <span className="text-sm font-semibold">L</span>
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: BRAND_NAVY }}>
            LOGONES
          </span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Module HACCP
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="#" className="transition hover:text-slate-900">
            Plateforme
          </Link>
          <Link href="#" className="transition hover:text-slate-900">
            Modules
          </Link>
          <Link href="#" className="transition hover:text-slate-900">
            Tarifs
          </Link>
          <Link href="#" className="transition hover:text-slate-900">
            Ressources
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <button className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 md:inline-flex">
            Se connecter
          </button>
          <button
            className="rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 md:px-5 md:text-sm"
            style={{ background: BRAND_ORANGE }}
          >
            Demander une démo
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(217,75,75,0.08)] px-3 py-1 text-xs font-medium text-[color:#D94B4B] shadow-sm ring-1 ring-[rgba(217,75,75,0.2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:#D94B4B]" />
          MODULE HACCP
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
            Automatisez vos contrôles HACCP simplement
          </h1>
          <p className="max-w-xl text-base text-slate-600 md:text-lg">
            Simplifiez le suivi hygiène alimentaire de votre restaurant en quelques clics. LOGONES digitalise vos
            relevés, plans de contrôle et preuves de conformité.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[rgba(242,106,33,0.4)] transition hover:-translate-y-px hover:shadow-lg"
            style={{ background: BRAND_ORANGE }}
          >
            Demander une démo
          </button>
          <button className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Voir toutes les fonctionnalités
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Prêt pour contrôle DDPP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:#D94B4B]" />
            <span>Pensé pour la restauration</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute -top-6 -left-6 h-32 w-32 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(217,75,75,0.25), transparent 60%)" }}
        />
        <div
          className="absolute -right-4 bottom-0 h-32 w-32 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(242,106,75,0.2), transparent 60%)" }}
        />

        <div
          className="relative mx-auto max-w-md rounded-3xl border border-[rgba(217,75,75,0.2)] bg-white/80 p-4 shadow-xl shadow-[rgba(31,44,58,0.08)] backdrop-blur"
          style={{ backgroundColor: HACCP_SOFT_BG }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Tableau de bord HACCP</p>
              <p className="text-sm font-semibold text-slate-900">Établissement - Cuisine centrale</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              Conforme
            </span>
          </div>

          <div className="grid gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
            <div className="grid grid-cols-[1.2fr_1fr] gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Relevés températures</p>
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Frigo produits frais</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      3,8°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Congélateur -20°C</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      -19,5°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Chambre froide</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      5,2°C
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Checklist hygiène</p>
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-2">
                  <ChecklistItem label="Nettoyage plan de travail" />
                  <ChecklistItem label="Désinfection frigos" />
                  <ChecklistItem label="Températures service" />
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl bg-slate-50 p-2">
              <p className="text-xs font-semibold text-slate-700">Traçabilité lots</p>
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 text-[11px] text-slate-600">
                <span className="font-medium text-slate-500">Produit</span>
                <span className="font-medium text-slate-500">Lot</span>
                <span className="font-medium text-slate-500">DLUO</span>
                <span>Saumon fumé</span>
                <span>#SF-8421</span>
                <span>18/03/2026</span>
                <span>Crème fraîche</span>
                <span>#CR-4210</span>
                <span>05/03/2026</span>
              </div>
            </div>
          </div>

          <FloatingAlert />
        </div>
      </div>
    </section>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-600">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-[10px] text-emerald-600">
        ✓
      </span>
      <span>{label}</span>
    </div>
  );
}

function FloatingAlert() {
  return (
    <div className="pointer-events-none absolute -top-4 -right-4 w-44 rounded-2xl bg-white/95 p-2.5 text-[11px] shadow-lg ring-1 shadow-[rgba(217,75,75,0.4)] ring-[rgba(217,75,75,0.25)]">
      <div className="mb-1 flex items-center justify-between">
        <span className="rounded-full bg-[rgba(217,75,75,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[color:#D94B4B]">
          ALERTE
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[color:#D94B4B]" />
      </div>
      <p className="font-semibold text-slate-900">Température frigo 4°C</p>
      <p className="mt-0.5 text-[10px] text-slate-500">Frigo préparation froide - Labo 1</p>
      <button
        className="mt-2 w-full rounded-full px-2 py-1 text-[10px] font-semibold text-white transition hover:brightness-110"
        style={{ background: HACCP_MAIN }}
      >
        Modifier le relevé
      </button>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Les piliers de votre plan HACCP</h2>
        <p className="mx-auto max-w-2xl text-sm text-slate-600">
          Centralisez tous vos contrôles dans un module unique, conçu pour les équipes de salle, de cuisine et de
          direction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 shadow-[rgba(31,44,58,0.03)] ring-slate-100"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm"
              style={{ background: HACCP_SECONDARY }}
            >
              <feature.icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-xs text-slate-600">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-center">
        <button className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Voir toutes les fonctionnalités
        </button>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="grid gap-10 rounded-3xl bg-white/80 p-6 shadow-sm ring-1 shadow-[rgba(31,44,58,0.04)] ring-slate-100 md:grid-cols-2 md:p-8">
      <div className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Gagnez du temps et évitez les mauvaises surprises
        </h2>
        <p className="text-sm text-slate-600">
          LOGONES HACCP automatise vos tâches répétitives et vous alerte en temps réel en cas de dérive. Vous gardez le
          contrôle, sans multiplier les classeurs et les tableaux.
        </p>
        <ul className="space-y-3 text-sm text-slate-700">
          {[
            "Relevés automatiques toutes les 2h",
            "Tableau de bord HACCP complet",
            "Traçabilité et archivage réglementaire",
            "Checklists d’hygiène centralisées",
            "Alertes immédiates en cas d’anomalie",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(217,75,75,0.1)] text-[10px] text-[color:#D94B4B]">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <button className="mt-2 inline-flex rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Voir toutes les fonctionnalités
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div
          className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-[rgba(217,75,75,0.06)] via-white to-[rgba(31,44,58,0.04)]"
          aria-hidden="true"
        />
        <div className="relative w-full max-w-sm rounded-[1.75rem] bg-white/90 p-4 shadow-xl ring-1 shadow-[rgba(31,44,58,0.12)] ring-slate-100">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Vue cuisine - Service du midi</p>
              <p className="text-sm font-semibold text-slate-900">Contrôles du jour</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              92% complétés
            </span>
          </div>
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Service du midi</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                12 tâches
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{
                  width: "78%",
                  background: `linear-gradient(to right, ${HACCP_SECONDARY}, ${HACCP_MAIN})`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="rounded-lg bg-white px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Checklists</p>
                <p className="text-xs font-semibold text-slate-900">8/9</p>
              </div>
              <div className="rounded-lg bg-white px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Relevés</p>
                <p className="text-xs font-semibold text-slate-900">12/14</p>
              </div>
              <div className="rounded-lg bg-white px-2 py-1.5">
                <p className="text-[10px] text-slate-500">Anomalies</p>
                <p className="text-xs font-semibold text-amber-700">2 à traiter</p>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="mb-1 text-[10px] font-medium text-slate-500">Équipe de service</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Chef de rang</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Plonge</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">OK</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="mb-1 text-[10px] font-medium text-slate-500">Prochain contrôle</p>
              <p className="text-xs font-semibold text-slate-900">Températures service soir</p>
              <p className="mt-1 text-[10px] text-slate-500">Prévu à 19h30</p>
            </div>
          </div>
        </div>

        <div className="absolute -right-4 bottom-4 hidden h-32 w-20 rounded-2xl bg-white/90 p-2 text-[10px] shadow-md ring-1 shadow-[rgba(31,44,58,0.15)] ring-slate-100 md:block">
          <p className="mb-1 text-[9px] font-medium text-slate-500">Vue mobile</p>
          <p className="text-[11px] font-semibold text-slate-900">Contrôle frigo - Labo 2</p>
          <p className="mt-1 text-[10px] text-slate-600">Dernier relevé il y a 1h</p>
          <button
            className="mt-2 w-full rounded-full px-2 py-1 text-[9px] font-semibold text-white"
            style={{ background: HACCP_SECONDARY }}
          >
            Saisir un relevé
          </button>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 shadow-[rgba(31,44,58,0.04)] ring-slate-100">
      <div className="grid gap-6 text-center text-sm text-slate-600 md:grid-cols-4 md:divide-x md:divide-slate-100">
        {STATS.map((stat, index) => (
          <div key={stat.label} className={index === 0 ? "" : "md:px-4"}>
            <p
              className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl"
              style={{ color: HACCP_MAIN }}
            >
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-600">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="mt-4">
      <div
        className="flex flex-col items-center justify-between gap-4 rounded-3xl px-6 py-6 text-white shadow-lg shadow-[rgba(217,75,75,0.35)] md:flex-row md:px-10 md:py-8"
        style={{
          background: `linear-gradient(90deg, ${HACCP_SECONDARY}, ${BRAND_ORANGE}, ${HACCP_MAIN})`,
        }}
      >
        <div className="space-y-1 text-center md:text-left">
          <p className="text-sm font-medium tracking-[0.18em] text-white/80 uppercase">LOGONES • MODULE HACCP</p>
          <h2 className="text-xl font-semibold md:text-2xl">Prêt à simplifier vos contrôles sanitaires ?</h2>
        </div>
        <button className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50">
          Demander une démo
        </button>
      </div>
    </section>
  );
}
