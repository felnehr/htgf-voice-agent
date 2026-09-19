import { websiteHost } from "~/lib/types";

export function firstName(fullName: string): string {
  const [first] = fullName.trim().split(/\s+/);
  return first || fullName.trim();
}

export function listenKeyterms(caller: {
  name: string;
  company: string;
  website?: string;
}): string[] {
  const first = firstName(caller.name);
  const last = caller.name.trim().split(/\s+/).slice(1).join(" ");
  const terms = [
    "HTGF",
    "High-Tech Gründerfonds",
    "Pre-Seed",
    "Pre Seed",
    "Preseed",
    "Seed",
    "Series A",
    "MVP",
    "ARR",
    "MRR",
    "LMS",
    "LXP",
    caller.company,
    caller.name,
    first,
    last,
    caller.website ? websiteHost(caller.website) : "",
  ];
  return [...new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0))];
}
