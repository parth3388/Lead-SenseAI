"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../lib/config";
import { generatePropertiesForSearch } from "../../lib/propertyCatalog";

type CustomerSearch = {
  name: string;
  city: string;
  propertyType: string;
  areaSqFt: string;
  budget: string;
  requirements: string;
  urgencyScore: string;
};

type StatusState = {
  type: "" | "success" | "error";
  message: string;
};

type GeneratedProperty = {
  id: string;
  title: string;
  city: string;
  location: string;
  price: string;
  numericBudget: number;
  type: string;
  areaSqFt: number;
  summary: string;
  highlights: string[];
  facilities: string[];
};

const INITIAL_SEARCH: CustomerSearch = {
  name: "",
  city: "",
  propertyType: "Office",
  areaSqFt: "",
  budget: "",
  requirements: "",
  urgencyScore: "5",
};

export default function PropertyResultsPage() {
  return (
    <Suspense fallback={<PropertyResultsFallback />}>
      <PropertyResultsContent />
    </Suspense>
  );
}

function PropertyResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customerSearch, setCustomerSearch] = useState<CustomerSearch>(INITIAL_SEARCH);
  const [status, setStatus] = useState<StatusState>({ type: "", message: "" });
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

  useEffect(() => {
    const fromParams: CustomerSearch = {
      name: searchParams.get("name") || "",
      city: searchParams.get("city") || "",
      propertyType: searchParams.get("propertyType") || "Office",
      areaSqFt: searchParams.get("areaSqFt") || "",
      budget: searchParams.get("budget") || "",
      requirements: searchParams.get("requirements") || "",
      urgencyScore: searchParams.get("urgencyScore") || "5",
    };

    if (fromParams.name || fromParams.city || fromParams.requirements) {
      setCustomerSearch(fromParams);
      return;
    }

    const stored = window.sessionStorage.getItem("leadsense-customer-search");
    if (!stored) return;

    try {
      setCustomerSearch(JSON.parse(stored));
    } catch {
      setCustomerSearch(INITIAL_SEARCH);
    }
  }, [searchParams]);

  const matchedProperties = useMemo(() => {
    return generatePropertiesForSearch({
      city: customerSearch.city,
      propertyType: customerSearch.propertyType,
      areaSqFt: customerSearch.areaSqFt,
      budget: customerSearch.budget,
    }) as GeneratedProperty[];
  }, [customerSearch]);

  const submitLead = async (
    property: GeneratedProperty,
    customerType: "buyer" | "visitor"
  ) => {
    setActivePropertyId(property.id);
    setStatus({ type: "", message: "" });

    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
      const customerName = customerSearch.name?.trim() || "Walk-in Customer";
      const generatedInterest = customerSearch.requirements?.trim()
        ? customerSearch.requirements.trim()
        : `${customerName} is exploring a ${property.type.toLowerCase()} in ${property.city} around ${property.areaSqFt} sq ft with ${property.facilities.slice(0, 3).join(", ")}.`;

      const response = await fetch(`${getApiBaseUrl()}/api/v1/public-interest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: customerName,
          location: property.location || `${property.city} Main Location`,
          budget: property.numericBudget,
          urgencyScore: Number(customerSearch.urgencyScore) || 5,
          industry: `${property.type} - ${property.areaSqFt} sq ft`,
          interest: generatedInterest,
          customerType,
          propertyTitle: property.title,
          buyerScore: customerType === "buyer" ? 9 : undefined,
          nearbyFacilities: property.facilities,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detailMessage = Array.isArray(data.details)
          ? data.details.map((detail: { path?: string; message?: string }) => `${detail.path || "field"}: ${detail.message || "Invalid value"}`).join(", ")
          : "";
        throw new Error(
          detailMessage || data.message || "Unable to save customer action right now."
        );
      }

      setStatus({
        type: "success",
        message:
          customerType === "buyer"
            ? `${customerName} was marked as a buyer for ${property.title}. This lead is now visible on the dashboard.`
            : `${customerName} was saved as a visitor for ${property.title}. This visit is now visible on the dashboard.`,
      });
    } catch (error: unknown) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setActivePropertyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f3eee2_0%,_#fffdf8_45%,_#efe5d4_100%)] text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8">
        <header className="rounded-[2rem] border border-[#d8ccb7] bg-white/90 px-6 py-5 shadow-[0_20px_80px_rgba(95,74,46,0.10)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[#17392d] text-[#f7f4ed] shadow-lg shadow-[#17392d]/20">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight">LeadSense Property Match</p>
                <p className="text-sm text-slate-600">
                  Showing {customerSearch.propertyType || "property"} options in {customerSearch.city || "your selected city"} based on customer needs.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit Search
              </button>
              <Link
                href="/dashboard"
                className="rounded-full bg-[#17392d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271f]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-[2rem] border border-[#dfd0bb] bg-white p-6 shadow-[0_30px_90px_rgba(41,35,24,0.12)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d5c19a] bg-[#f4e4b8] px-4 py-2 text-sm font-semibold text-[#5b461f]">
              <Search className="h-4 w-4" />
              Customer requirement summary
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <SummaryRow label="Customer" value={customerSearch.name || "Not provided"} />
              <SummaryRow label="City" value={customerSearch.city || "Any city"} />
              <SummaryRow label="Property type" value={customerSearch.propertyType || "Any type"} />
              <SummaryRow label="Required area" value={customerSearch.areaSqFt ? `${customerSearch.areaSqFt} sq ft` : "Flexible"} />
              <SummaryRow label="Budget" value={customerSearch.budget ? `Rs ${Number(customerSearch.budget).toLocaleString()}` : "Flexible"} />
              <SummaryRow label="Urgency" value={`${customerSearch.urgencyScore || "5"}/10`} />
            </div>

            <div className="mt-6 rounded-[1.7rem] bg-[#f8f2e7] p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Requirement note</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {customerSearch.requirements || "The customer wants to explore matching properties before deciding to buy."}
              </p>
            </div>

            <div className="mt-6 rounded-[1.7rem] bg-[#edf5f2] p-5 text-sm text-slate-700">
              <div className="flex items-center gap-2 font-bold text-[#17392d]">
                <ShieldCheck className="h-4 w-4" />
                Action logic
              </div>
              <p className="mt-2 leading-7">
                Results are generated for the selected city only, and they are filtered to the exact property type chosen in the form.
              </p>
            </div>

            {status.message ? (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {status.type === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
                {status.message}
              </div>
            ) : null}
          </aside>

          <div className="space-y-5">
            {matchedProperties.map((property) => (
              <article
                key={property.id}
                className="rounded-[2rem] border border-[#ddd0bc] bg-white p-6 shadow-[0_24px_70px_rgba(86,69,40,0.10)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex rounded-full bg-[#eef5f1] px-3 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#17392d]">
                      {property.type}
                    </div>
                    <h2 className="mt-3 text-3xl font-black tracking-tight">{property.title}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {property.location}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        {property.areaSqFt} sq ft
                      </span>
                      <span className="inline-flex items-center gap-2 font-bold text-[#17392d]">
                        <BadgeIndianRupee className="h-4 w-4" />
                        {property.price}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{property.summary}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {property.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="rounded-full bg-[#f7f2e9] px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                        Facilities
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {property.facilities.map((facility) => (
                          <span
                            key={facility}
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
                          >
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-xs rounded-[1.7rem] bg-[linear-gradient(180deg,_#17392d,_#225240)] p-5 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#cde2d8]">
                      Match summary
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-[#cde2d8]">Requested city</span>
                        <span>{customerSearch.city || property.city}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-[#cde2d8]">Requested type</span>
                        <span>{customerSearch.propertyType || property.type}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-[#cde2d8]">Property area</span>
                        <span>{property.areaSqFt} sq ft</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => submitLead(property, "buyer")}
                      disabled={activePropertyId === property.id}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4e4b8] px-4 py-3 text-sm font-bold text-[#17392d] transition hover:bg-[#f8ebc6] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {activePropertyId === property.id ? "Saving..." : "Buy Now"}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => submitLead(property, "visitor")}
                      disabled={activePropertyId === property.id}
                      className="mt-3 w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Continue as Visitor
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function PropertyResultsFallback() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f3eee2_0%,_#fffdf8_45%,_#efe5d4_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-5 py-6 lg:px-8">
        <div className="rounded-[2rem] border border-[#dfd0bb] bg-white px-8 py-6 text-lg font-semibold shadow-[0_30px_90px_rgba(41,35,24,0.12)]">
          Loading matching properties...
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-800">{value}</span>
    </div>
  );
}
