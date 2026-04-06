// ═══════════════════════════════════════════════════════════════
// PARFUMIX BRANCH DEFINITIONS
// Complete hierarchy: Country → City → Branch
// ═══════════════════════════════════════════════════════════════

export interface BranchDef {
  name: string;
  slug: string;
  city: string;
  country: string;
  flag: string;
  currency: string;
  sortOrder: number;
}

export interface CountryDef {
  name: string;
  flag: string;
  currency: string;
  cities: {
    name: string;
    branches: BranchDef[];
  }[];
}

export const BRANCHES: BranchDef[] = [
  // ─── UAE ─── DUBAI ──────────────────────────────────────────
  { name: 'Parfumix Deira', slug: 'deira', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 1 },
  { name: 'Parfumix Deira II', slug: 'deira-ii', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 2 },
  { name: 'Parfumix Century Mall', slug: 'century-mall', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 3 },
  { name: 'Parfumix Al Ghurair Mall', slug: 'al-ghurair', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 4 },
  { name: 'Parfumix BurJuman (UW Mall)', slug: 'burjuman', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 5 },
  { name: 'Parfumix ADCB (Karama)', slug: 'adcb', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 6 },
  { name: 'Parfumix Al Barsha Mall', slug: 'al-barsha', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 7 },
  { name: 'Parfumix Silicon Central (Souq Extra)', slug: 'silicon-central', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 8 },
  { name: 'Parfumix Silicon Oasis', slug: 'silicon-oasis', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 9 },
  { name: 'Parfumix Aswaaq Al Warqa', slug: 'aswaaq-warqa', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 10 },
  { name: 'Parfumix Etihad Mall', slug: 'etihad-mall', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 11 },
  { name: 'Parfumix Maison Rouge (Deira)', slug: 'maison-rouge', city: 'Dubai', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 12 },
  // ─── UAE ─── ABU DHABI ─────────────────────────────────────
  { name: 'Parfumix Al Wahda Mall', slug: 'al-wahda', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 13 },
  { name: 'Parfumix Khalidiyah Mall', slug: 'khalidiyah', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 14 },
  { name: 'Parfumix Dalma Mall', slug: 'dalma', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 15 },
  { name: 'Parfumix Bawabat Al Sharq', slug: 'bawabat', city: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', currency: 'AED', sortOrder: 16 },
  // ─── OMAN ─── MUSCAT ───────────────────────────────────────
  { name: 'Parfumix Mall of Oman', slug: 'mall-of-oman', city: 'Muscat', country: 'Oman', flag: '🇴🇲', currency: 'OMR', sortOrder: 17 },
  // ─── BAHRAIN ─── MANAMA ────────────────────────────────────
  { name: 'Parfumix Manama', slug: 'manama', city: 'Manama', country: 'Bahrain', flag: '🇧🇭', currency: 'BHD', sortOrder: 18 },
  { name: 'Parfumix Manama Souq', slug: 'manama-souq', city: 'Manama', country: 'Bahrain', flag: '🇧🇭', currency: 'BHD', sortOrder: 19 },
  // ─── BAHRAIN ─── BUSAITEEN ─────────────────────────────────
  { name: 'Parfumix Busaiteen', slug: 'busaiteen', city: 'Busaiteen', country: 'Bahrain', flag: '🇧🇭', currency: 'BHD', sortOrder: 20 },
];

// Build hierarchical view
export const COUNTRIES: CountryDef[] = [
  { name: 'UAE', flag: '🇦🇪', currency: 'AED', cities: [] },
  { name: 'Oman', flag: '🇴🇲', currency: 'OMR', cities: [] },
  { name: 'Bahrain', flag: '🇧🇭', currency: 'BHD', cities: [] },
];

// Populate cities from branches
for (const branch of BRANCHES) {
  const country = COUNTRIES.find(c => c.name === branch.country);
  if (!country) continue;
  let city = country.cities.find(c => c.name === branch.city);
  if (!city) {
    city = { name: branch.city, branches: [] };
    country.cities.push(city);
  }
  city.branches.push(branch);
}

// Sort cities and branches
for (const country of COUNTRIES) {
  country.cities.sort((a, b) => a.name.localeCompare(b.name));
  for (const city of country.cities) {
    city.branches.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

// Helper: get branch by slug
export function getBranchBySlug(slug: string): BranchDef | undefined {
  return BRANCHES.find(b => b.slug === slug);
}

// Helper: get branches by country
export function getBranchesByCountry(country: string): BranchDef[] {
  return BRANCHES.filter(b => b.country === country);
}

// Helper: get branches by city
export function getBranchesByCity(city: string): BranchDef[] {
  return BRANCHES.filter(b => b.city === city);
}

// The default/primary branch with real data
export const DEFAULT_BRANCH_SLUG = 'adcb';
