export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Sin Supabase configurado, el sitio funciona en modo demostración (solo lectura). */
export const isDemo = !supabaseUrl || !supabaseAnonKey;

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export const brand = {
  name: "Prep Diplomacia Uy",
  email: "cursos@prepdiplomacia.com",
  contactEmail: "contacto@prepdiplomacia.com",
  instagram: "@prepdiplomaciauy",
  instagramUrl: "https://www.instagram.com/prepdiplomaciauy",
  web: "www.prepdiplomacia.com",
};
