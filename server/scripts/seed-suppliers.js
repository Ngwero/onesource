import { requireSupabase } from "../lib/supabase.js";
import { createSupplier } from "../lib/suppliersService.js";

const SAMPLE_SUPPLIERS = [
  {
    id: "mukono-fresh-farms",
    businessName: "Mukono Fresh Farms",
    contactName: "Sarah Nakiwala",
    email: "sarah@mukonofresh.ug",
    phone: "+256 700 123 456",
    location: "Mukono, Central Region",
    description: "Family-run farm specialising in leafy greens, tomatoes, and seasonal vegetables.",
    status: "approved",
    commissionRate: 12,
  },
  {
    id: "lake-victoria-fish-co",
    businessName: "Lake Victoria Fish Co-op",
    contactName: "James Okello",
    email: "orders@lvfish.ug",
    phone: "+256 701 987 654",
    location: "Entebbe, Uganda",
    description: "Fisherfolk cooperative — fresh tilapia, Nile perch, and smoked fish.",
    status: "approved",
    commissionRate: 15,
  },
  {
    id: "kabale-highland-growers",
    businessName: "Kabale Highland Growers",
    contactName: "Grace Tumusiime",
    email: "grace@kabalegrowers.ug",
    location: "Kabale, Western Region",
    description: "High-altitude potatoes, passion fruit, and organic berries.",
    status: "pending",
    commissionRate: 15,
  },
];

async function main() {
  const db = requireSupabase();
  let created = 0;
  let skipped = 0;

  for (const supplier of SAMPLE_SUPPLIERS) {
    const { data: existing } = await db
      .from("suppliers")
      .select("id")
      .eq("id", supplier.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    await createSupplier(db, supplier);
    created++;
    console.log(`Created supplier: ${supplier.businessName}`);
  }

  console.log(`Done — ${created} created, ${skipped} already existed.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
