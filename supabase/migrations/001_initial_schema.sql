-- ============================================================
-- Crash Store — Initial Database Schema
-- Phase 1: Tables, Triggers, RLS Policies, RPC Functions
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1.1 profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text DEFAULT '',
  role       text NOT NULL DEFAULT 'cashier'
             CHECK (role IN ('admin', 'cashier')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2 categories
CREATE TABLE public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.3 products
CREATE TABLE public.products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  category_id        uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  barcode            text UNIQUE,
  purchase_price     numeric NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  sale_price         numeric NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  quantity           integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity_alert integer NOT NULL DEFAULT 0 CHECK (min_quantity_alert >= 0),
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 1.4 purchases (supply/restocking invoices)
CREATE TABLE public.purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  created_by   uuid REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 1.5 purchase_items
CREATE TABLE public.purchase_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_cost   numeric NOT NULL CHECK (unit_cost >= 0)
);

-- 1.6 expenses (operating expenses, separate from purchases)
CREATE TABLE public.expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  amount     numeric NOT NULL CHECK (amount >= 0),
  notes      text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.7 sales (sales invoices)
CREATE TABLE public.sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  total_amount   numeric NOT NULL CHECK (total_amount >= 0),
  discount       numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  payment_method text,
  cashier_id     uuid REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 1.8 sale_items
CREATE TABLE public.sale_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id    uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity   integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0)
);

-- 1.9 settings (single row)
CREATE TABLE public.settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name          text NOT NULL DEFAULT 'Crash Store',
  phone               text,
  address             text,
  logo_url            text,
  invoice_footer_note text,
  currency            text NOT NULL DEFAULT 'EGP'
);

-- Insert the default settings row
INSERT INTO public.settings (store_name, currency) VALUES ('Crash Store', 'EGP');

-- ============================================================
-- 2. TRIGGERS & FUNCTIONS
-- ============================================================

-- 2.1 Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'cashier'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2.2 Auto-update updated_at on products
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2.3 Increase stock when purchase_items are added
CREATE OR REPLACE FUNCTION public.increase_stock()
RETURNS trigger AS $$
BEGIN
  UPDATE public.products
  SET quantity = quantity + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_purchase_item_insert
  AFTER INSERT ON public.purchase_items
  FOR EACH ROW
  EXECUTE FUNCTION public.increase_stock();

-- 2.4 Decrease stock when sale_items are added (with availability check)
CREATE OR REPLACE FUNCTION public.decrease_stock()
RETURNS trigger AS $$
DECLARE
  available integer;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT quantity INTO available
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF available IS NULL THEN
    RAISE EXCEPTION 'Product % not found', NEW.product_id;
  END IF;

  IF available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
      NEW.product_id, available, NEW.quantity;
  END IF;

  UPDATE public.products
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_sale_item_insert
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock();

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings       ENABLE ROW LEVEL SECURITY;

-- Helper: Centralized admin check used in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -------------------------------------------------------
-- 3.1 profiles
-- -------------------------------------------------------
-- Users can read their own row; Admin can read all
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

-- Users can update their own row; Admin can update all
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

-- Only admin can insert profiles (signup trigger handles initial creation)
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid()) OR auth.uid() = id
  );

-- -------------------------------------------------------
-- 3.2 categories
-- -------------------------------------------------------
-- Both admin and cashier can read (cashier needs for POS dropdown)
CREATE POLICY categories_select ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can modify
CREATE POLICY categories_insert ON public.categories
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY categories_update ON public.categories
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY categories_delete ON public.categories
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.3 products
-- -------------------------------------------------------
-- Both admin and cashier can read (cashier needs for POS)
CREATE POLICY products_select ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can modify
CREATE POLICY products_insert ON public.products
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY products_update ON public.products
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY products_delete ON public.products
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.4 purchases (admin only for everything)
-- -------------------------------------------------------
CREATE POLICY purchases_select ON public.purchases
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY purchases_insert ON public.purchases
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY purchases_update ON public.purchases
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY purchases_delete ON public.purchases
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.5 purchase_items (admin only for everything)
-- -------------------------------------------------------
CREATE POLICY purchase_items_select ON public.purchase_items
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY purchase_items_insert ON public.purchase_items
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY purchase_items_update ON public.purchase_items
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY purchase_items_delete ON public.purchase_items
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.6 expenses (admin only for everything)
-- -------------------------------------------------------
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY expenses_delete ON public.expenses
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.7 sales
-- -------------------------------------------------------
-- Admin sees all sales
CREATE POLICY sales_select_admin ON public.sales
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Cashier can ONLY see their own sales (needed for the create_sale RPC return)
CREATE POLICY sales_select_own ON public.sales
  FOR SELECT USING (cashier_id = auth.uid());

-- Both admin and cashier can insert (make sales)
CREATE POLICY sales_insert ON public.sales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admin can update/delete
CREATE POLICY sales_update ON public.sales
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY sales_delete ON public.sales
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.8 sale_items
-- -------------------------------------------------------
-- Admin sees all
CREATE POLICY sale_items_select_admin ON public.sale_items
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Cashier can see items for their own sales
CREATE POLICY sale_items_select_own ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
        AND sales.cashier_id = auth.uid()
    )
  );

-- Both admin and cashier can insert
CREATE POLICY sale_items_insert ON public.sale_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admin can update/delete
CREATE POLICY sale_items_update ON public.sale_items
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY sale_items_delete ON public.sale_items
  FOR DELETE USING (public.is_admin(auth.uid()));

-- -------------------------------------------------------
-- 3.9 settings
-- -------------------------------------------------------
-- Everyone can read (needed for invoices)
CREATE POLICY settings_select ON public.settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can modify
CREATE POLICY settings_insert ON public.settings
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY settings_update ON public.settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY settings_delete ON public.settings
  FOR DELETE USING (public.is_admin(auth.uid()));

-- ============================================================
-- 4. RPC FUNCTIONS
-- ============================================================

-- 4.1 Cashier total sales today (returns only a number, never rows)
CREATE OR REPLACE FUNCTION public.get_cashier_today_sales_total()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(total_amount), 0)
  FROM public.sales
  WHERE cashier_id = auth.uid()
    AND created_at >= CURRENT_DATE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4.2 Atomic sale creation (single transaction for sale + items)
CREATE OR REPLACE FUNCTION public.create_sale(
  p_invoice_number text,
  p_total_amount   numeric,
  p_discount       numeric,
  p_payment_method text,
  p_items          jsonb  -- array of {product_id, quantity, unit_price}
)
RETURNS uuid AS $$
DECLARE
  v_sale_id uuid;
  v_item    jsonb;
BEGIN
  -- Create the sale header
  INSERT INTO public.sales (invoice_number, total_amount, discount, payment_method, cashier_id)
  VALUES (p_invoice_number, p_total_amount, p_discount, p_payment_method, auth.uid())
  RETURNING id INTO v_sale_id;

  -- Create each sale item (decrease_stock trigger fires per row)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (
      v_sale_id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric
    );
  END LOOP;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
