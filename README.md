# Amazon UK Fresh Produce Clone

A front-end demo of Amazon.co.uk focused **only on fresh produce** — fruit, vegetables, salad, berries, and more.

## Agricultural categories (20)

Products use the `category` text field (slug id) in Supabase. Canonical definitions live in `src/data/categories.ts` and `server/data/categories.js` (ready for a future `categories` table).

- Fresh Fruits · Fresh Vegetables · Roots and Tubers · Cereals and Grains
- Legumes and Pulses · Oilseeds and Nuts · Herbs and Spices · Coffee, Tea and Cocoa
- Livestock Products · Poultry Products · Fish and Aquaculture · Dairy Products
- Processed Agricultural Products · Animal Feeds and Fodder · Seeds and Planting Materials
- Export Fresh Produce
- Agro-Industrial Raw Materials

**Migrate existing products** after pulling: `cd server && npm run migrate:categories`

**Category banner images** (homepage “Shop by Category”): run `server/supabase/categories.sql` in Supabase SQL Editor, then `cd server && npm run seed:categories`. If the table already exists, also run `server/supabase/categories-active.sql` for delete support. Edit or **delete** categories in Admin → **Category banners**.

**Homepage hero carousel** (images + text): run `server/supabase/hero-slides.sql`, then `cd server && npm run seed:hero`. Edit slides in Admin → **Homepage hero** (upload WebP, change titles, buttons, links). Subtitle may use `{{price}}` and `{{amount}}` for live currency formatting on the shop.

**Image uploads (auto WebP):** In Admin, use **Upload → WebP** on products or category banners. Files are resized and converted with Sharp. Prefer Supabase Storage: create public bucket `images` (see `server/supabase/storage.sql`); otherwise files are saved under `server/uploads/` and served at `/uploads/…`.

**Browse & filter:** `/products` (catalogue + filter), `/category/:id`, homepage “Shop by Category”, header nav.

## Languages

The site includes a translation module with four languages:

| Language | Code | Notes |
|----------|------|-------|
| English | `en` | Default |
| French | `fr` | Français |
| Congolese | `ln` | Lingála (Democratic Republic of Congo) |
| Rwandan | `rw` | Ikinyarwanda |

Use the language switcher in the header. Your choice is saved in `localStorage`.

Built with [i18next](https://www.i18next.com/) and [react-i18next](https://react.i18next.com/).

## Currencies

Live forex conversion from **GBP** (product base currency) via [Exchange Rate API](https://www.exchangerate-api.com/):

| Code | Currency |
|------|----------|
| GBP | UK Pound |
| USD | US Dollar |
| UGX | Ugandan Shilling |
| KES | Kenyan Shilling |
| CDF | Congolese Franc |
| RWF | Rwandan Franc |

Use the currency dropdown in the header. Rates refresh hourly (cached in `localStorage`). Checkout logic still uses GBP thresholds internally.

## Stock backend & admin

Products and stock are stored in **Supabase** (PostgreSQL) and served by an Express API. The storefront loads the catalogue on page load; reload the browser to pick up admin changes.

| Service | URL |
|---------|-----|
| Shop (Vite) | http://localhost:5173 |
| Stock API | http://localhost:3001/api |
| Admin panel | http://localhost:3001/admin |

**First-time setup:**

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the script in `server/supabase/schema.sql`.
3. In **Project Settings → API**, copy the project URL and **service role** key (keep secret).
4. Configure the server:

```bash
cd server
cp .env.example .env
# Edit .env with your Supabase URL and service role key
npm install
npm run check:env   # confirms SUPABASE_* vars are set (no secrets printed)
npm run seed
```

Optional storefront env (root `.env`, copied from `.env.example`): set `VITE_API_URL` when the API is not proxied (e.g. production hosting).

**Run both shop and API:**

```bash
# Terminal 1 — API + admin
npm run dev:server

# Terminal 2 — storefront (proxies /api → :3001)
npm run dev
```

Or from the project root: `npm run dev:all` (starts API in background, then Vite).

**Admin:** create products with title, price, image URL, category, description, and stock quantity. Set stock to `0` to hide an item from the shop.

## Features

- UK branding (amazon.co.uk, £ GBP, British spelling)
- **Stock API + admin** — manage products and inventory; shop reads live data
- Multi-language UI and product copy (EN, FR, Lingala, Kinyarwanda)
- Live currency converter (GBP, USD, UGX, KES, CDF, RWF)
- Homepage with all 8 produce categories, seasonal offers, and full catalogue
- Product pages with per-pack/kg pricing
- Shopping basket with free delivery over £25
- Category browsing, “All Categories” page, and search
- Responsive layout

## Getting started

```bash
cd amazon-uk-clone
npm install
cd server && cp .env.example .env && npm install && npm run seed && cd ..
# (edit server/.env with Supabase credentials first)
npm run dev:server   # in one terminal
npm run dev          # in another
```

Open [http://localhost:5173](http://localhost:5173) for the shop and [http://localhost:3001/admin](http://localhost:3001/admin) to manage stock.

## Build for production

```bash
npm run build
npm run preview
```

## Note

This is an educational clone for learning purposes. It is not affiliated with Amazon.
