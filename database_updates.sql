-- ==============================================================================
-- Crash Store — Comprehensive Database Updates (نظام المرتجعات وتحديث التقارير)
-- File: database_updates.sql
-- Instructions: Run this script directly in Supabase SQL Editor.
-- ==============================================================================

-- ==============================================================================
-- 1. TABLES & COLUMNS
-- ==============================================================================

-- 1.1 Add return tracking columns to sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS return_amount numeric NOT NULL DEFAULT 0 CHECK (return_amount >= 0),
  ADD COLUMN IF NOT EXISTS is_fully_returned boolean NOT NULL DEFAULT false;

-- 1.2 Create returns table (Header for each return operation)
CREATE TABLE IF NOT EXISTS public.returns (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number  text        UNIQUE NOT NULL,
  sale_id        uuid        NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  return_type    text        NOT NULL DEFAULT 'partial'
                             CHECK (return_type IN ('partial', 'full')),
  total_returned numeric     NOT NULL DEFAULT 0 CHECK (total_returned >= 0),
  reason         text,
  processed_by   uuid        REFERENCES public.profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 1.3 Create return_items table (Item-level return details)
CREATE TABLE IF NOT EXISTS public.return_items (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id    uuid    NOT NULL REFERENCES public.returns(id)    ON DELETE CASCADE,
  sale_item_id uuid    NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
  product_id   uuid    NOT NULL REFERENCES public.products(id)   ON DELETE RESTRICT,
  quantity     integer NOT NULL CHECK (quantity > 0),
  unit_price   numeric NOT NULL CHECK (unit_price >= 0)
);

-- ==============================================================================
-- 2. PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_returns_sale_id        ON public.returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at     ON public.returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_processed_by   ON public.returns(processed_by);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_prod_id   ON public.return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_sale_item ON public.return_items(sale_item_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- 3.1 returns table policies
DROP POLICY IF EXISTS returns_select ON public.returns;
CREATE POLICY returns_select ON public.returns
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS returns_insert ON public.returns;
CREATE POLICY returns_insert ON public.returns
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS returns_update ON public.returns;
CREATE POLICY returns_update ON public.returns
  FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS returns_delete ON public.returns;
CREATE POLICY returns_delete ON public.returns
  FOR DELETE USING (public.is_admin(auth.uid()));

-- 3.2 return_items table policies
DROP POLICY IF EXISTS return_items_select ON public.return_items;
CREATE POLICY return_items_select ON public.return_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS return_items_insert ON public.return_items;
CREATE POLICY return_items_insert ON public.return_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS return_items_update ON public.return_items;
CREATE POLICY return_items_update ON public.return_items
  FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS return_items_delete ON public.return_items;
CREATE POLICY return_items_delete ON public.return_items
  FOR DELETE USING (public.is_admin(auth.uid()));

-- ==============================================================================
-- 4. ATOMIC RPC FUNCTION: process_return
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_return(
  p_sale_id     uuid,
  p_return_type text,   -- 'partial' | 'full'
  p_items       jsonb,  -- [{sale_item_id, product_id, quantity, unit_price}]
  p_reason      text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_return_id       uuid;
  v_return_number   text;
  v_item            jsonb;
  v_total           numeric := 0;
  v_already_ret     integer;
  v_sold_qty        integer;
  v_req_qty         integer;
  v_return_seq      integer;
  v_sale            public.sales%ROWTYPE;
  v_orig_subtotal   numeric := 0;
  v_discount_factor numeric := 1.0;
  v_item_price      numeric := 0;
  v_deduct_debt     numeric := 0;
  v_refund_cash     numeric := 0;
  v_new_remaining   numeric := 0;
  v_new_paid        numeric := 0;
  v_is_full         boolean := false;
BEGIN
  -- ─── Authentication guard (Admin & Cashier can process returns) ────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يرجى تسجيل الدخول أولاً لإجراء عملية الاسترجاع.';
  END IF;

  -- ─── Validate sale exists and not already fully returned ───
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفاتورة المحددة غير موجودة';
  END IF;

  IF v_sale.is_fully_returned = true THEN
    RAISE EXCEPTION 'هذه الفاتورة تم استرجاعها بالكامل مسبقاً';
  END IF;

  -- ─── Validate each item ────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_qty := (v_item->>'quantity')::integer;

    -- Get originally sold qty and unit_price for this sale_item (must belong to the sale)
    SELECT quantity, unit_price INTO v_sold_qty, v_item_price
    FROM public.sale_items
    WHERE id = (v_item->>'sale_item_id')::uuid
      AND sale_id = p_sale_id;

    IF v_sold_qty IS NULL THEN
      RAISE EXCEPTION 'صنف غير موجود في هذه الفاتورة: %', (v_item->>'sale_item_id');
    END IF;

    -- Get already-returned qty for this sale_item across all previous returns
    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_already_ret
    FROM public.return_items ri
    JOIN public.returns r ON r.id = ri.return_id
    WHERE ri.sale_item_id = (v_item->>'sale_item_id')::uuid;

    IF (v_already_ret + v_req_qty) > v_sold_qty THEN
      RAISE EXCEPTION
        'الكمية المطلوب استرجاعها (%) تتجاوز الكمية المتاحة للاسترجاع (%). المباع: %، تم استرجاعه: %',
        v_req_qty,
        (v_sold_qty - v_already_ret),
        v_sold_qty,
        v_already_ret;
    END IF;

    -- Accumulate raw total returned amount from true sold unit_price
    v_total := v_total + (v_req_qty * v_item_price);
  END LOOP;

  -- ─── Account for invoice-level discount on returns ─────────────
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO v_orig_subtotal
  FROM public.sale_items
  WHERE sale_id = p_sale_id;

  IF COALESCE(v_sale.discount, 0) > 0 AND v_orig_subtotal > 0 THEN
    v_discount_factor := LEAST(1.0, GREATEST(0.0, v_sale.total_amount / v_orig_subtotal));
  ELSE
    v_discount_factor := 1.0;
  END IF;

  -- Calculate accurate return total (never exceed remaining invoice total)
  IF p_return_type = 'full' THEN
    -- In full return, refund the exact remaining net capacity of the invoice
    v_total := GREATEST(0, v_sale.total_amount - v_sale.return_amount);
  ELSE
    -- In partial return, apply the invoice discount factor proportionally
    v_total := round(v_total * v_discount_factor, 2);
    -- Total return cannot exceed remaining invoice capacity
    v_total := LEAST(v_total, GREATEST(0, v_sale.total_amount - v_sale.return_amount));
  END IF;

  -- ─── Generate unique return number ─────────────────────
  SELECT COUNT(*) + 1 INTO v_return_seq FROM public.returns;
  v_return_number := 'RTN-' || LPAD(v_return_seq::text, 6, '0');

  -- ─── Insert return header ──────────────────────────────
  INSERT INTO public.returns (
    return_number,
    sale_id,
    return_type,
    total_returned,
    reason,
    processed_by
  )
  VALUES (
    v_return_number,
    p_sale_id,
    p_return_type,
    v_total,
    p_reason,
    auth.uid()
  )
  RETURNING id INTO v_return_id;

  -- ─── Insert return items and restore stock ─────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT unit_price INTO v_item_price
    FROM public.sale_items
    WHERE id = (v_item->>'sale_item_id')::uuid;

    v_item_price := round(COALESCE(v_item_price, (v_item->>'unit_price')::numeric) * v_discount_factor, 2);

    INSERT INTO public.return_items (
      return_id,
      sale_item_id,
      product_id,
      quantity,
      unit_price
    )
    VALUES (
      v_return_id,
      (v_item->>'sale_item_id')::uuid,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      v_item_price
    );

    -- Restore stock to product
    UPDATE public.products
    SET quantity   = quantity + (v_item->>'quantity')::integer,
        updated_at = now()
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  -- ─── Calculate updated remaining_amount & amount_paid ───
  IF p_return_type = 'full' OR (v_sale.return_amount + v_total) >= v_sale.total_amount THEN
    v_is_full := true;
    v_new_remaining := 0;
    v_new_paid := 0;
  ELSE
    v_is_full := false;
    v_deduct_debt := LEAST(COALESCE(v_sale.remaining_amount, 0), v_total);
    v_new_remaining := GREATEST(0, COALESCE(v_sale.remaining_amount, 0) - v_deduct_debt);
    v_refund_cash := v_total - v_deduct_debt;
    v_new_paid := GREATEST(0, COALESCE(v_sale.amount_paid, v_sale.total_amount) - v_refund_cash);
  END IF;

  -- ─── Update original sale ──────────────────────────────
  UPDATE public.sales
  SET return_amount     = return_amount + v_total,
      remaining_amount  = v_new_remaining,
      amount_paid       = v_new_paid,
      is_fully_returned = v_is_full
  WHERE id = p_sale_id;

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_return(uuid, text, jsonb, text) TO authenticated;

-- ==============================================================================
-- 5. UPDATE POS DAILY SUMMARY (Deducts returns from daily sales)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_pos_daily_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm boolean;
  v_gross_sales numeric;
  v_returns numeric;
  v_net_sales numeric;
  v_cost numeric;
  v_returned_cost numeric;
  v_net_cost numeric;
  v_expenses numeric;
  v_net_profit numeric;
BEGIN
  v_is_adm := public.is_admin(auth.uid());

  -- Gross sales today
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_gross_sales
  FROM public.sales
  WHERE created_at >= CURRENT_DATE;

  -- Returns processed today
  SELECT COALESCE(SUM(total_returned), 0)
  INTO v_returns
  FROM public.returns
  WHERE created_at >= CURRENT_DATE;

  v_net_sales := GREATEST(0, v_gross_sales - v_returns);

  IF v_is_adm THEN
    -- Purchase cost of sold items today
    SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0)
    INTO v_cost
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    JOIN public.products p ON p.id = si.product_id
    WHERE s.created_at >= CURRENT_DATE;

    -- Cost of returned items today (to restore profit accurately)
    SELECT COALESCE(SUM(ri.quantity * p.purchase_price), 0)
    INTO v_returned_cost
    FROM public.return_items ri
    JOIN public.returns r ON r.id = ri.return_id
    JOIN public.products p ON p.id = ri.product_id
    WHERE r.created_at >= CURRENT_DATE;

    v_net_cost := GREATEST(0, v_cost - v_returned_cost);

    -- Operating expenses today
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expenses
    FROM public.expenses
    WHERE created_at >= CURRENT_DATE;

    v_net_profit := v_net_sales - v_net_cost - v_expenses;

    RETURN json_build_object(
      'total_sales', v_net_sales,
      'total_cost', v_net_cost,
      'total_expenses', v_expenses,
      'net_profit', v_net_profit,
      'is_admin', true
    );
  ELSE
    -- Cashier sees net sales for today
    RETURN json_build_object(
      'total_sales', v_net_sales,
      'total_cost', 0,
      'total_expenses', 0,
      'net_profit', 0,
      'is_admin', false
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pos_daily_summary() TO authenticated;

-- ==============================================================================
-- 6. UPDATE FINANCIAL REPORT (Accounts for returns in revenue & profit)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_financial_report(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_cashier_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm boolean;
  v_gross_sales numeric := 0;
  v_period_returns numeric := 0;
  v_executed_returns numeric := 0;
  v_executed_returns_count int := 0;
  v_net_sales numeric := 0;
  v_total_paid numeric := 0;
  v_total_remaining numeric := 0;
  v_total_discounts numeric := 0;
  v_invoices_total int := 0;
  v_invoices_active int := 0;
  v_invoices_returned int := 0;
  v_cogs numeric := 0;
  v_returned_cogs numeric := 0;
  v_net_cogs numeric := 0;
  v_expenses numeric := 0;
  v_purchases numeric := 0;
  v_gross_profit numeric := 0;
  v_net_profit numeric := 0;
  v_payment_methods json := '[]'::json;
  v_cashiers_summary json := '[]'::json;
  v_categories_summary json := '[]'::json;
  v_daily_timeline json := '[]'::json;
BEGIN
  -- Security check: admin role required when called by authenticated user
  -- Allows direct execution in Supabase SQL Editor (postgres role or null auth)
  IF current_user != 'postgres' AND auth.uid() IS NOT NULL THEN
    v_is_adm := EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    );
    IF NOT v_is_adm THEN
      RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
  END IF;

  -- 1. Sales & Invoices aggregated for the period
  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COALESCE(SUM(s.return_amount), 0),
    COALESCE(SUM(s.amount_paid), 0),
    COALESCE(SUM(s.remaining_amount), 0),
    COALESCE(SUM(s.discount), 0),
    COUNT(*),
    COALESCE(COUNT(CASE WHEN s.is_fully_returned = false THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN s.is_fully_returned = true THEN 1 END), 0)
  INTO
    v_gross_sales,
    v_period_returns,
    v_total_paid,
    v_total_remaining,
    v_total_discounts,
    v_invoices_total,
    v_invoices_active,
    v_invoices_returned
  FROM public.sales s
  WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  -- Net Sales: strictly (Gross Sales - Returns on period sales) == (Paid + Remaining)
  v_net_sales := GREATEST(0, v_gross_sales - v_period_returns);

  -- 2. Executed returns during the period (from returns table)
  SELECT
    COALESCE(SUM(r.total_returned), 0),
    COUNT(*)
  INTO
    v_executed_returns,
    v_executed_returns_count
  FROM public.returns r
  JOIN public.sales s ON s.id = r.sale_id
  WHERE (p_start_date IS NULL OR r.created_at >= p_start_date)
    AND (p_end_date IS NULL OR r.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  -- 3. COGS for sales in this period
  SELECT
    COALESCE(SUM(si.quantity * p.purchase_price), 0)
  INTO v_cogs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  JOIN public.products p ON p.id = si.product_id
  WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  -- Returned COGS for sales in this period
  SELECT
    COALESCE(SUM(ri.quantity * p.purchase_price), 0)
  INTO v_returned_cogs
  FROM public.return_items ri
  JOIN public.returns r ON r.id = ri.return_id
  JOIN public.sales s ON s.id = r.sale_id
  JOIN public.products p ON p.id = ri.product_id
  WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  v_net_cogs := GREATEST(0, v_cogs - v_returned_cogs);

  -- 4. Operating Expenses
  SELECT
    COALESCE(SUM(e.amount), 0)
  INTO v_expenses
  FROM public.expenses e
  WHERE (p_start_date IS NULL OR e.created_at >= p_start_date)
    AND (p_end_date IS NULL OR e.created_at <= p_end_date);

  -- 5. Restocking Purchases
  SELECT
    COALESCE(SUM(pur.total_amount), 0)
  INTO v_purchases
  FROM public.purchases pur
  WHERE (p_start_date IS NULL OR pur.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pur.created_at <= p_end_date);

  -- 6. Profits
  v_gross_profit := v_net_sales - v_net_cogs;
  v_net_profit := v_net_sales - v_net_cogs - v_expenses;

  -- 7. Payment Methods Breakdown
  SELECT COALESCE(json_agg(pm_row), '[]'::json)
  INTO v_payment_methods
  FROM (
    SELECT
      s.payment_method,
      COUNT(*) AS count,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = false THEN 1 END), 0) AS active_count,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = true THEN 1 END), 0) AS returned_count,
      COALESCE(SUM(s.total_amount), 0) AS gross_total,
      COALESCE(SUM(s.return_amount), 0) AS returns_total,
      COALESCE(SUM(s.total_amount - s.return_amount), 0) AS total,
      COALESCE(SUM(s.amount_paid), 0) AS paid,
      COALESCE(SUM(s.remaining_amount), 0) AS remaining
    FROM public.sales s
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY s.payment_method
    ORDER BY total DESC
  ) pm_row;

  -- 8. Cashiers Summary Breakdown
  SELECT COALESCE(json_agg(c_row), '[]'::json)
  INTO v_cashiers_summary
  FROM (
    SELECT
      s.cashier_id,
      COALESCE(pr.full_name, 'كاشير غير مسجل') AS cashier_name,
      COALESCE(pr.role, 'cashier') AS role,
      COUNT(*) AS invoices_count,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = false THEN 1 END), 0) AS active_invoices_count,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = true THEN 1 END), 0) AS returned_invoices_count,
      COALESCE(SUM(s.total_amount), 0) AS gross_sales,
      COALESCE(SUM(s.return_amount), 0) AS returns_amount,
      COALESCE(SUM(s.total_amount - s.return_amount), 0) AS total_sales,
      COALESCE(SUM(s.amount_paid), 0) AS total_paid,
      COALESCE(SUM(s.remaining_amount), 0) AS total_remaining,
      COALESCE(SUM(s.discount), 0) AS total_discounts
    FROM public.sales s
    LEFT JOIN public.profiles pr ON pr.id = s.cashier_id
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY s.cashier_id, pr.full_name, pr.role
    ORDER BY total_sales DESC
  ) c_row;

  -- 9. Categories Summary Breakdown (deducting returns)
  SELECT COALESCE(json_agg(cat_row), '[]'::json)
  INTO v_categories_summary
  FROM (
    WITH sold_cat AS (
      SELECT
        COALESCE(c.name, 'بدون قسم') AS category_name,
        COALESCE(SUM(si.quantity), 0) AS sold_qty,
        COALESCE(SUM(si.quantity * si.unit_price), 0) AS sold_rev,
        COALESCE(SUM(si.quantity * p.purchase_price), 0) AS sold_cost
      FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      JOIN public.products p ON p.id = si.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
        AND (p_end_date IS NULL OR s.created_at <= p_end_date)
        AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
      GROUP BY c.name
    ),
    ret_cat AS (
      SELECT
        COALESCE(c.name, 'بدون قسم') AS category_name,
        COALESCE(SUM(ri.quantity), 0) AS ret_qty,
        COALESCE(SUM(ri.quantity * ri.unit_price), 0) AS ret_rev,
        COALESCE(SUM(ri.quantity * p.purchase_price), 0) AS ret_cost
      FROM public.return_items ri
      JOIN public.returns r ON r.id = ri.return_id
      JOIN public.sales s ON s.id = r.sale_id
      JOIN public.products p ON p.id = ri.product_id
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
        AND (p_end_date IS NULL OR s.created_at <= p_end_date)
        AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
      GROUP BY c.name
    )
    SELECT
      COALESCE(s_c.category_name, r_c.category_name) AS category_name,
      GREATEST(0, COALESCE(s_c.sold_qty, 0) - COALESCE(r_c.ret_qty, 0)) AS total_units,
      COALESCE(s_c.sold_qty, 0) AS sold_qty,
      COALESCE(r_c.ret_qty, 0) AS returned_units,
      GREATEST(0, COALESCE(s_c.sold_rev, 0) - COALESCE(r_c.ret_rev, 0)) AS total_revenue,
      GREATEST(0, COALESCE(s_c.sold_cost, 0) - COALESCE(r_c.ret_cost, 0)) AS total_cogs,
      GREATEST(0, (COALESCE(s_c.sold_rev, 0) - COALESCE(r_c.ret_rev, 0)) - (COALESCE(s_c.sold_cost, 0) - COALESCE(r_c.ret_cost, 0))) AS total_profit
    FROM sold_cat s_c
    FULL OUTER JOIN ret_cat r_c ON r_c.category_name = s_c.category_name
    WHERE COALESCE(s_c.sold_qty, 0) > 0 OR COALESCE(r_c.ret_qty, 0) > 0
    ORDER BY total_revenue DESC
  ) cat_row;

  -- 10. Daily Timeline
  SELECT COALESCE(json_agg(day_row), '[]'::json)
  INTO v_daily_timeline
  FROM (
    SELECT
      date_trunc('day', s.created_at)::date AS day,
      COUNT(*) AS invoices,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = false THEN 1 END), 0) AS active_invoices,
      COALESCE(COUNT(CASE WHEN s.is_fully_returned = true THEN 1 END), 0) AS returned_invoices,
      COALESCE(SUM(s.total_amount), 0) AS gross_sales,
      COALESCE(SUM(s.return_amount), 0) AS returns_amount,
      COALESCE(SUM(s.total_amount - s.return_amount), 0) AS sales_amount,
      COALESCE(SUM(s.amount_paid), 0) AS paid_amount,
      COALESCE(SUM(s.remaining_amount), 0) AS remaining_amount
    FROM public.sales s
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY date_trunc('day', s.created_at)::date
    ORDER BY day ASC
  ) day_row;

  RETURN json_build_object(
    'summary', json_build_object(
      'total_sales', v_net_sales,
      'gross_sales', v_gross_sales,
      'total_returns', v_period_returns,
      'executed_returns', v_executed_returns,
      'returns_count', v_executed_returns_count,
      'total_paid', v_total_paid,
      'total_remaining', v_total_remaining,
      'total_discounts', v_total_discounts,
      'invoices_count', v_invoices_total,
      'active_invoices_count', v_invoices_active,
      'returned_invoices_count', v_invoices_returned,
      'cogs', v_net_cogs,
      'gross_cogs', v_cogs,
      'returned_cogs', v_returned_cogs,
      'expenses', v_expenses,
      'purchases', v_purchases,
      'gross_profit', v_gross_profit,
      'net_profit', v_net_profit,
      'profit_margin', CASE WHEN v_net_sales > 0 THEN ROUND((v_net_profit / v_net_sales) * 100, 2) ELSE 0 END
    ),
    'payment_methods', COALESCE(v_payment_methods, '[]'::json),
    'cashiers', COALESCE(v_cashiers_summary, '[]'::json),
    'categories', COALESCE(v_categories_summary, '[]'::json),
    'timeline', COALESCE(v_daily_timeline, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_report(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_report(timestamptz, timestamptz, uuid) TO anon;

-- ==============================================================================
-- 7. UPDATE ADMIN DASHBOARD METRICS (Accounts for returns)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_adm boolean;
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', v_now);
  v_week_start timestamptz := date_trunc('week', v_now);
  v_month_start timestamptz := date_trunc('month', v_now);

  -- Gross Sales
  v_gross_today numeric;
  v_gross_week numeric;
  v_gross_month numeric;
  v_gross_all numeric;

  -- Invoices counts
  v_inv_total_today int;
  v_inv_total_month int;
  v_inv_active_today int;
  v_inv_active_month int;
  v_inv_ret_today int;
  v_inv_ret_month int;

  -- Returns on sales created in the period
  v_ret_today numeric;
  v_ret_week numeric;
  v_ret_month numeric;
  v_ret_all numeric;

  -- Total returns executed in public.returns during each period (includes returns on older sales)
  v_exec_ret_today numeric;
  v_exec_ret_week numeric;
  v_exec_ret_month numeric;
  v_exec_ret_all numeric;

  -- Sales (Net after returns = Paid + Credit)
  v_sales_today numeric;
  v_sales_week numeric;
  v_sales_month numeric;
  v_sales_all numeric;

  -- Paid / Collected (Net cash/card received)
  v_paid_today numeric;
  v_paid_week numeric;
  v_paid_month numeric;
  v_paid_all numeric;

  -- Credit / Remaining debts for period sales
  v_credit_today numeric;
  v_credit_week numeric;
  v_credit_month numeric;
  v_credit_all numeric;

  -- Cost of goods sold (Gross & Returned)
  v_cogs_today numeric;
  v_cogs_week numeric;
  v_cogs_month numeric;
  v_cogs_all numeric;

  v_ret_cogs_today numeric;
  v_ret_cogs_week numeric;
  v_ret_cogs_month numeric;
  v_ret_cogs_all numeric;

  -- Expenses
  v_exp_today numeric;
  v_exp_week numeric;
  v_exp_month numeric;
  v_exp_all numeric;

  -- Purchases
  v_pur_today numeric;
  v_pur_week numeric;
  v_pur_month numeric;
  v_pur_all numeric;

  -- Products & Inventory
  v_total_prods int;
  v_active_prods int;
  v_low_stock int;
  v_out_of_stock int;
  v_total_units int;
  v_inventory_cost numeric;
  v_inventory_retail numeric;

  -- Customer Debts (Total outstanding debts)
  v_total_debts numeric;
BEGIN
  v_is_adm := public.is_admin(auth.uid());
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Gross Sales, Returns on period sales, Paid, Credit & Invoices counts
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(total_amount), 0),

    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN return_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN return_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN return_amount ELSE 0 END), 0),
    COALESCE(SUM(return_amount), 0),

    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN amount_paid ELSE 0 END), 0),
    COALESCE(SUM(amount_paid), 0),

    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(remaining_amount), 0),

    COALESCE(COUNT(CASE WHEN created_at >= v_today_start AND is_fully_returned = false THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_today_start AND is_fully_returned = true THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_today_start THEN 1 END), 0),

    COALESCE(COUNT(CASE WHEN created_at >= v_month_start AND is_fully_returned = false THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_month_start AND is_fully_returned = true THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_month_start THEN 1 END), 0),

    COALESCE(SUM(remaining_amount), 0)
  INTO
    v_gross_today,
    v_gross_week,
    v_gross_month,
    v_gross_all,
    v_ret_today,
    v_ret_week,
    v_ret_month,
    v_ret_all,
    v_paid_today,
    v_paid_week,
    v_paid_month,
    v_paid_all,
    v_credit_today,
    v_credit_week,
    v_credit_month,
    v_credit_all,
    v_inv_active_today,
    v_inv_ret_today,
    v_inv_total_today,
    v_inv_active_month,
    v_inv_ret_month,
    v_inv_total_month,
    v_total_debts
  FROM public.sales;

  -- Total returns executed in public.returns during each period (includes returns on older sales)
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(total_returned), 0)
  INTO
    v_exec_ret_today,
    v_exec_ret_week,
    v_exec_ret_month,
    v_exec_ret_all
  FROM public.returns;

  -- Net Sales: exactly equals (Gross - Returns on period sales) and strictly equals (Paid + Credit)
  v_sales_today := GREATEST(0, v_gross_today - v_ret_today);
  v_sales_week  := GREATEST(0, v_gross_week - v_ret_week);
  v_sales_month := GREATEST(0, v_gross_month - v_ret_month);
  v_sales_all   := GREATEST(0, v_gross_all - v_ret_all);

  -- COGS (Gross)
  SELECT
    COALESCE(SUM(CASE WHEN s.created_at >= v_today_start THEN si.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.created_at >= v_week_start THEN si.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.created_at >= v_month_start THEN si.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(si.quantity * p.purchase_price), 0)
  INTO
    v_cogs_today,
    v_cogs_week,
    v_cogs_month,
    v_cogs_all
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  JOIN public.products p ON p.id = si.product_id;

  -- Returned COGS for sales of each period (matches original sale's period)
  SELECT
    COALESCE(SUM(CASE WHEN s.created_at >= v_today_start THEN ri.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.created_at >= v_week_start THEN ri.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.created_at >= v_month_start THEN ri.quantity * p.purchase_price ELSE 0 END), 0),
    COALESCE(SUM(ri.quantity * p.purchase_price), 0)
  INTO
    v_ret_cogs_today,
    v_ret_cogs_week,
    v_ret_cogs_month,
    v_ret_cogs_all
  FROM public.return_items ri
  JOIN public.returns r ON r.id = ri.return_id
  JOIN public.sales s ON s.id = r.sale_id
  JOIN public.products p ON p.id = ri.product_id;

  v_cogs_today := GREATEST(0, v_cogs_today - v_ret_cogs_today);
  v_cogs_week  := GREATEST(0, v_cogs_week - v_ret_cogs_week);
  v_cogs_month := GREATEST(0, v_cogs_month - v_ret_cogs_month);
  v_cogs_all   := GREATEST(0, v_cogs_all - v_ret_cogs_all);

  -- Operating expenses
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN amount ELSE 0 END), 0),
    COALESCE(SUM(amount), 0)
  INTO
    v_exp_today,
    v_exp_week,
    v_exp_month,
    v_exp_all
  FROM public.expenses;

  -- Purchases / Restocking
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(total_amount), 0)
  INTO
    v_pur_today,
    v_pur_week,
    v_pur_month,
    v_pur_all
  FROM public.purchases;

  -- Products & Inventory stats
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(COUNT(CASE WHEN is_active = true THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN is_active = true AND quantity > 0 AND quantity <= min_quantity_alert THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN is_active = true AND quantity <= 0 THEN 1 END), 0),
    COALESCE(SUM(CASE WHEN is_active = true THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_active = true THEN quantity * purchase_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_active = true THEN quantity * sale_price ELSE 0 END), 0)
  INTO
    v_total_prods,
    v_active_prods,
    v_low_stock,
    v_out_of_stock,
    v_total_units,
    v_inventory_cost,
    v_inventory_retail
  FROM public.products;

  RETURN json_build_object(
    'sales', json_build_object(
      'today', v_sales_today,
      'week', v_sales_week,
      'month', v_sales_month,
      'all_time', v_sales_all,
      'invoices_today', v_inv_total_today,
      'invoices_month', v_inv_total_month,
      'invoices_active_today', v_inv_active_today,
      'invoices_active_month', v_inv_active_month,
      'invoices_returned_today', v_inv_ret_today,
      'invoices_returned_month', v_inv_ret_month
    ),
    'paid', json_build_object(
      'today', v_paid_today,
      'week', v_paid_week,
      'month', v_paid_month,
      'all_time', v_paid_all
    ),
    'credit', json_build_object(
      'today', v_credit_today,
      'week', v_credit_week,
      'month', v_credit_month,
      'all_time', v_credit_all
    ),
    'returns', json_build_object(
      'today', v_ret_today,
      'week', v_ret_week,
      'month', v_ret_month,
      'all_time', v_ret_all,
      'executed_today', v_exec_ret_today,
      'executed_week', v_exec_ret_week,
      'executed_month', v_exec_ret_month,
      'executed_all', v_exec_ret_all
    ),
    'gross_sales', json_build_object(
      'today', v_gross_today,
      'week', v_gross_week,
      'month', v_gross_month,
      'all_time', v_gross_all
    ),
    'cogs', json_build_object(
      'today', v_cogs_today,
      'week', v_cogs_week,
      'month', v_cogs_month,
      'all_time', v_cogs_all
    ),
    'expenses', json_build_object(
      'today', v_exp_today,
      'week', v_exp_week,
      'month', v_exp_month,
      'all_time', v_exp_all
    ),
    'purchases', json_build_object(
      'today', v_pur_today,
      'week', v_pur_week,
      'month', v_pur_month,
      'all_time', v_pur_all
    ),
    'net_profit', json_build_object(
      'today', v_sales_today - v_cogs_today - v_exp_today,
      'week', v_sales_week - v_cogs_week - v_exp_week,
      'month', v_sales_month - v_cogs_month - v_exp_month,
      'all_time', v_sales_all - v_cogs_all - v_exp_all
    ),
    'inventory', json_build_object(
      'total_products', v_total_prods,
      'active_products', v_active_prods,
      'low_stock_count', v_low_stock,
      'out_of_stock_count', v_out_of_stock,
      'total_stock_units', v_total_units,
      'total_cost_value', v_inventory_cost,
      'total_retail_value', v_inventory_retail
    ),
    'debts', json_build_object(
      'total_customer_debts', v_total_debts
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_metrics() TO authenticated;

-- ==============================================================================
-- 8. DATA REPAIR (Safe & Idempotent execution for existing sales with returns)
-- ==============================================================================

-- 8.1 Fix past return records where total_returned exceeded the net sale amount (due to pre-discount calculation)
UPDATE public.returns r
SET total_returned = s.total_amount
FROM public.sales s
WHERE r.sale_id = s.id
  AND r.total_returned > s.total_amount;

-- 8.2 Fix past sales where return_amount exceeded total_amount
UPDATE public.sales s
SET return_amount = LEAST(return_amount, total_amount)
WHERE return_amount > total_amount;

-- 8.3 Fix past sales where return_amount was recorded but remaining_amount and amount_paid were not adjusted
UPDATE public.sales s
SET
  remaining_amount = CASE
    WHEN s.is_fully_returned OR s.return_amount >= s.total_amount THEN 0
    ELSE GREATEST(0, s.remaining_amount - LEAST(s.remaining_amount, (COALESCE(s.amount_paid, 0) + COALESCE(s.remaining_amount, 0)) - (s.total_amount - s.return_amount)))
  END,
  amount_paid = CASE
    WHEN s.is_fully_returned OR s.return_amount >= s.total_amount THEN 0
    ELSE GREATEST(0, s.amount_paid - GREATEST(0, ((COALESCE(s.amount_paid, 0) + COALESCE(s.remaining_amount, 0)) - (s.total_amount - s.return_amount)) - s.remaining_amount))
  END
WHERE s.return_amount > 0
  AND (COALESCE(s.amount_paid, 0) + COALESCE(s.remaining_amount, 0)) > (s.total_amount - s.return_amount);

-- ==============================================================================
-- END OF SCRIPT: database_updates.sql
-- ==============================================================================

