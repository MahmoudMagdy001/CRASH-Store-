# Strict Execution Prompt — "Crash Store" Management System

> Use this prompt in full with any AI coding tool (Claude Code, Cursor, etc.). Execute the Phases **in order**. Do not move to the next Phase until the current Phase's Acceptance Criteria is fully met. Do not assume any requirement not stated here — ask, or follow this document literally.

## Mandatory: Use Local Skills
Before starting **any** Phase, and before writing any code for that Phase, check the skills folder at:

```
C:\Users\MAGDY\.agents\skills
```

- List the available skills in that folder first.
- For every Phase below, scan that folder for any skill relevant to the task at hand (e.g. React/Vite conventions, Supabase/Postgres patterns, TypeScript style rules, testing conventions, printing/PDF handling, barcode generation, project structure standards, git/commit conventions, etc.) and read it before writing code.
- If a relevant skill exists, its instructions **override the generic defaults** in this prompt for style/conventions (but never override the functional/business requirements below — those are fixed).
- If no relevant skill exists for a given task, proceed using the best practices defined in this document.
- Do this check again at the start of every new Phase — do not rely only on the first check, since different Phases may need different skills (e.g. a printing skill only matters at Phase 6/7).

---

## Project Overview
- **Project name:** Crash Store — a management system for a shop that repairs and sells PlayStation consoles, controllers, and PlayStation accessories.
- **Stack:** React + Vite + TypeScript + Supabase (Postgres + Auth + RLS, plus Storage if needed).
- **Roles:**
  - **Admin:** Full access to every screen in the system (products, categories, purchases/expenses, sales, reports, settings, user management).
  - **Cashier (regular user):** Access to the POS (point-of-sale) screen only, for making sales, plus the ability to see the **total sales figure only** (no expenses, no reports, no product management).
- **Strict rule:** Every role's permissions must be enforced at **two levels together**:
  1. **Frontend:** hide/block routes and components not allowed for that role.
  2. **Backend (Supabase RLS):** never rely on the frontend alone. Every table must be protected with RLS policies that prevent the Cashier from reading/writing/updating anything not explicitly allowed, even via a direct API call.

---

## Phase 0 — Project & Infrastructure Setup
**Goal:** A clean, scalable starting environment.

**Required tasks:**
1. Create a Vite project using the `react-ts` template.
2. Install and configure:
   - `@supabase/supabase-js`
   - `react-router-dom` (routing + Protected Routes)
   - A lightweight state/data layer — use `tanstack-query` specifically for managing Supabase data.
   - `react-hook-form` + `zod` for forms and validation.
   - One UI library, and stick to it across all screens (`shadcn/ui` or `Mantine`).
   - `react-to-print` for invoice printing.
   - A barcode generation library (`jsbarcode` or `react-barcode`) plus a way to print it.
3. Mandatory folder structure:
   ```
   src/
     components/
     features/
       auth/
       pos/
       products/
       categories/
       purchases/
       sales/
       reports/
       settings/
     lib/
       supabaseClient.ts
     hooks/
     routes/
     types/
   ```
4. A `.env` file containing only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. **Never put a Service Role key in the frontend.**
5. Set up `supabaseClient.ts` as a single client instance used across the whole project.

**Phase 0 Acceptance Criteria:** The project builds and runs with no errors (`npm run dev`), and the folder structure exactly matches the above.

---

## Phase 1 — Database Design (Supabase)
**Goal:** Build a strict, tightly-constrained schema before writing any UI code.

### Required Tables:

1. **`profiles`** (linked to `auth.users`)
   - `id` (uuid, PK, = auth.users.id)
   - `full_name` text
   - `role` text — only two allowed values via a CHECK constraint: `'admin'` or `'cashier'`
   - `created_at` timestamptz default now()

2. **`categories`**
   - `id` uuid PK default gen_random_uuid()
   - `name` text not null unique
   - `created_at` timestamptz

3. **`products`**
   - `id` uuid PK
   - `name` text not null
   - `category_id` uuid references categories
   - `barcode` text unique (auto-generated if left empty, or entered manually)
   - `purchase_price` numeric not null default 0
   - `sale_price` numeric not null default 0
   - `quantity` integer not null default 0
   - `min_quantity_alert` integer default 0 (low-stock alert threshold)
   - `is_active` boolean default true
   - `created_at` / `updated_at`

4. **`purchases`** (supply/restocking invoices)
   - `id` uuid PK
   - `supplier_name` text
   - `total_amount` numeric not null
   - `created_by` uuid references profiles
   - `created_at` timestamptz

5. **`purchase_items`**
   - `id` uuid PK
   - `purchase_id` uuid references purchases on delete cascade
   - `product_id` uuid references products
   - `quantity` integer not null
   - `unit_cost` numeric not null

6. **`expenses`** (operating expenses, separate from purchases: electricity, rent, maintenance, etc.)
   - `id` uuid PK
   - `title` text not null
   - `amount` numeric not null
   - `notes` text
   - `created_by` uuid references profiles
   - `created_at` timestamptz

7. **`sales`** (sales invoices)
   - `id` uuid PK
   - `invoice_number` text unique not null (sequential)
   - `total_amount` numeric not null
   - `discount` numeric default 0
   - `payment_method` text (cash/card/etc.)
   - `cashier_id` uuid references profiles
   - `created_at` timestamptz

8. **`sale_items`**
   - `id` uuid PK
   - `sale_id` uuid references sales on delete cascade
   - `product_id` uuid references products
   - `quantity` integer not null
   - `unit_price` numeric not null (the sale price at the time of the transaction — never rely on the product's current price)

9. **`settings`**
   - `id` uuid PK (effectively a single row)
   - `store_name` text default 'Crash Store'
   - `phone` text
   - `address` text
   - `logo_url` text
   - `invoice_footer_note` text
   - `currency` text default 'EGP'

### Mandatory Schema-Level Rules:
- Use **Foreign Keys** for every relationship, and never allow deleting a product that has associated sales (`ON DELETE RESTRICT`), while `sale_items`/`purchase_items` cascade-delete only with their parent invoice.
- Use **Triggers or Database Functions** to automatically update `quantity` in `products`:
  - When `purchase_items` are added → increase quantity.
  - When `sale_items` are added → decrease quantity (and block the sale if the requested quantity exceeds availability, via `RAISE EXCEPTION`).
- **Enable RLS on every single table, with no exceptions.**

### RLS Policies (mandatory, not optional):
- **`profiles`:** each user can read only their own row; Admin can read/update all rows.
- **`categories`, `products`, `purchases`, `purchase_items`, `expenses`, `settings`:**
  - `SELECT`: Admin only (except for `products`, which the Cashier needs to read on the POS screen for making sales — grant `SELECT` on `products` and `categories` to the Cashier exclusively for that purpose, with no `INSERT/UPDATE/DELETE`).
  - `INSERT/UPDATE/DELETE`: Admin only.
- **`sales`, `sale_items`:**
  - `INSERT`: both Admin and Cashier (both can make sales).
  - `SELECT`: Admin sees everything. The Cashier sees **only the total figure** (implement this via a separate View or an RPC function that returns only the sum, never grant the Cashier direct SELECT on other users' `sales` rows/details).
  - `UPDATE/DELETE`: Admin only.
- Centralize the role check in a SQL helper function `is_admin(uid)` that returns a boolean by reading `profiles.role`, and use it inside every policy instead of repeating the subquery.

**Phase 1 Acceptance Criteria:** All migrations run successfully, and a manual test confirms: logging in as a Cashier and trying to read/update the `expenses` table directly via the Supabase client is rejected.

---

## Phase 2 — Login & Authentication System
**Goal:** A single login screen with automatic role-based redirection.

**Required tasks:**
1. Use Supabase Auth (Email/Password) — do not build a custom auth system.
2. When a new user is created via Supabase Auth, use a trigger on `auth.users` to automatically create a matching row in `profiles` with a default role of `cashier`. **Only a pre-existing Admin can later change that role from the settings/users screen.**
3. A simple Login screen: email + password, with clear error handling.
4. After login:
   - Fetch `role` from `profiles`.
   - **Admin** → redirected to the main Dashboard with all menus visible.
   - **Cashier** → redirected directly to the POS screen only, with no links to any other screen shown in the navigation.
5. Build a `ProtectedRoute` component that checks:
   - A valid session exists.
   - The role required to access this route (e.g. `allowedRoles: ['admin']`).
   - If the condition fails → redirect to an "unauthorized" page or straight to POS.
6. A clear Logout button on every screen.

**Phase 2 Acceptance Criteria:** A Cashier account cannot reach any admin route even by typing the URL manually (immediately redirected).

---

## Phase 3 — Products & Categories Management (Admin only)
**Required tasks:**
1. **Categories screen:** full CRUD (add/edit/delete/list) — prevent deleting a category that has products linked to it (clear warning message).
2. **Products screen:** full CRUD:
   - Form fields: name, category (dropdown), purchase price, sale price, quantity, alert threshold, barcode (auto-generated if left blank).
   - Displayed as a table with search and filtering by category, and sorting.
   - Visual alert (badge/different color) for products whose quantity is ≤ `min_quantity_alert`.
   - Strict `zod` validation: no negative prices or quantities allowed, name is required.

**Phase 3 Acceptance Criteria:** No role other than Admin can access these screens (verified at both the frontend and RLS level).

---

## Phase 4 — Purchases & Expenses (Admin only)
**Required tasks:**
1. **Purchases screen:** create a purchase invoice containing multiple products/quantities/supply costs, automatically updating stock on save (via the trigger from Phase 1 — do not duplicate that logic in the frontend).
2. **Expenses screen:** add/view/delete operating expenses (completely separate from purchases) — title, amount, notes, date.
3. Display total purchases and total expenses as a daily/monthly summary at the top of the screen.

---

## Phase 5 — POS (Point of Sale) Screen — available to both Admin and Cashier
**Required tasks (this is the most important screen in the system):**
1. A fast product search by name or **barcode scan** (an input that accepts scanner input as if it were keyboard typing).
2. A sales cart showing added products, quantity, price, total, with the ability to edit quantity or remove an item.
3. Automatic total calculation with support for a discount (fixed amount or percentage).
4. Payment method selection (cash/card).
5. The "Complete Sale" button must:
   - Insert a row into `sales` plus rows into `sale_items` (a single atomic transaction — use an RPC/Postgres function that performs the whole operation inside `BEGIN/COMMIT` to guarantee no product is sold without being recorded, or vice versa).
   - Automatically decrease quantity (trigger from Phase 1).
   - Reject the operation with a clear message if the requested quantity exceeds what's available.
6. After completing a sale → immediately offer a "Print Invoice" option (links to Phase 6).
7. **A "Total Sales" section visible to all roles:**
   - Cashier: sees only their own/today's total sales number (no expense or profit details) — implement this via a dedicated RPC function that returns a number only.
   - Admin: sees the same number plus the ability to navigate to full detailed reports (Phase 8).

**Phase 5 Acceptance Criteria:** A sale cannot be completed that exceeds available stock, and a sale can never be partially recorded (a product sold without an invoice, or an invoice without its items).

---

## Phase 6 — Invoice Printing
**Required tasks:**
1. Design an invoice template containing: store name and logo (from `settings`), invoice number, date, cashier name, an items table (name/quantity/price/total), grand total, discount, payment method, a footer note (from `settings`).
2. Use `react-to-print` to print the invoice directly from the same page, without manually opening a new tab.
3. The print template must be formatted for an 80mm thermal receipt printer by default, while remaining extensible to an A4 layout later.

---

## Phase 7 — Barcode Generation & Printing
**Required tasks:**
1. When a product is created without a manual barcode, generate a unique one automatically (e.g. a sequential number or a shortened UUID).
2. A "Print Barcode" screen/button for each product:
   - Display the barcode along with the product name and price below it (a design suitable for small labels).
   - Allow printing multiple copies of the same product (an input for the number of copies) — useful when restocking.
   - Allow printing barcodes for multiple products at once from the products screen (multi-select).
3. Use `jsbarcode` or an equivalent to generate the image, and `react-to-print` to print it at a suitable label size.

---

## Phase 8 — Reports & Dashboard (Admin only)
**Required tasks:**
1. A main dashboard showing: total sales (daily/weekly/monthly), total purchases, total expenses, approximate net profit (sales − cost of goods sold − expenses), best-selling products, low-stock alerts.
2. A detailed reports screen with filtering by date range and by cashier (to track each user's performance).
3. All of this data must be fetched via RPC functions or Views protected by RLS for Admin access only.

---

## Phase 9 — Settings & User Management (Admin only)
**Required tasks:**
1. A general settings screen: store name, logo, contact info, invoice footer note, currency (edits the `settings` table).
2. A user management screen: list all users and their role, ability to change a role (admin/cashier), enable/disable an account.
3. **Never allow creating new users from the frontend using the Service Role key.** User creation must only happen via the Supabase Auth Admin API from a secure Edge Function that first verifies the requesting user is an Admin, or directly from the Supabase dashboard.

---

## Phase 10 — Final Testing & Delivery
**Mandatory checklist before considering the project complete:**
- [ ] Admin login → successfully accesses every screen.
- [ ] Cashier login → can only access the POS screen + sees total sales only; any direct access attempt (URL or API) to any other table/screen is rejected.
- [ ] A full sale correctly decreases stock and never allows selling beyond what's available.
- [ ] Invoice printing works and correctly shows store data from `settings`.
- [ ] Barcode printing works for a single product and for a batch of products.
- [ ] Every table is protected by RLS, with no table left without a policy.
- [ ] No Service Role key is exposed anywhere in the frontend code.

---

### General Mandatory Execution Instructions
- Check the `C:\Users\MAGDY\.agents\skills` folder for relevant skills at the start of every Phase, as described at the top of this document, and follow any relevant skill's conventions.
- Follow the table and column names exactly as given, unless the user explicitly asks to change them.
- Never put stock-update logic in the frontend — it must live in the database (triggers/RPC) to guarantee consistency even with a future client (e.g. mobile).
- All user-facing text in the UI must be in Arabic (this is a business requirement — the shop and its staff operate in Arabic — even though this prompt itself is in English).
- Do not move to the next Phase until the Acceptance Criteria listed at the end of the current Phase is met.