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
  v_return_id     uuid;
  v_return_number text;
  v_item          jsonb;
  v_total         numeric := 0;
  v_already_ret   integer;
  v_sold_qty      integer;
  v_req_qty       integer;
  v_return_seq    integer;
BEGIN
  -- ─── Authentication guard (Admin & Cashier can process returns) ────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يرجى تسجيل الدخول أولاً لإجراء عملية الاسترجاع.';
  END IF;

  -- ─── Validate sale exists and not already fully returned ───
  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'الفاتورة المحددة غير موجودة';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sales WHERE id = p_sale_id AND is_fully_returned = true
  ) THEN
    RAISE EXCEPTION 'هذه الفاتورة تم استرجاعها بالكامل مسبقاً';
  END IF;

  -- ─── Validate each item ────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_qty := (v_item->>'quantity')::integer;

    -- Get originally sold qty for this sale_item (must belong to the sale)
    SELECT quantity INTO v_sold_qty
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

    -- Accumulate total returned amount
    v_total := v_total
      + ((v_item->>'quantity')::integer * (v_item->>'unit_price')::numeric);
  END LOOP;

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
      (v_item->>'unit_price')::numeric
    );

    -- Restore stock to product
    UPDATE public.products
    SET quantity   = quantity + (v_item->>'quantity')::integer,
        updated_at = now()
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  -- ─── Update original sale ──────────────────────────────
  UPDATE public.sales
  SET return_amount     = return_amount + v_total,
      is_fully_returned = (p_return_type = 'full')
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
  v_total_sales numeric;
  v_total_returns numeric;
  v_net_sales numeric;
  v_total_paid numeric;
  v_total_remaining numeric;
  v_total_discounts numeric;
  v_invoices_count int;
  v_returns_count int;
  v_cogs numeric;
  v_returned_cogs numeric;
  v_net_cogs numeric;
  v_expenses numeric;
  v_purchases numeric;
  v_payment_methods json;
  v_cashiers_summary json;
  v_categories_summary json;
  v_daily_timeline json;
BEGIN
  v_is_adm := public.is_admin(auth.uid());
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Gross Sales for the period
  SELECT
    COALESCE(SUM(s.total_amount), 0),
    COALESCE(SUM(COALESCE(s.amount_paid, s.total_amount)), 0),
    COALESCE(SUM(COALESCE(s.remaining_amount, 0)), 0),
    COALESCE(SUM(COALESCE(s.discount, 0)), 0),
    COUNT(*)
  INTO
    v_total_sales,
    v_total_paid,
    v_total_remaining,
    v_total_discounts,
    v_invoices_count
  FROM public.sales s
  WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  -- Returns for the period
  SELECT
    COALESCE(SUM(r.total_returned), 0),
    COUNT(*)
  INTO
    v_total_returns,
    v_returns_count
  FROM public.returns r
  JOIN public.sales s ON s.id = r.sale_id
  WHERE (p_start_date IS NULL OR r.created_at >= p_start_date)
    AND (p_end_date IS NULL OR r.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  v_net_sales := GREATEST(0, v_total_sales - v_total_returns);

  -- COGS for the period
  SELECT
    COALESCE(SUM(si.quantity * p.purchase_price), 0)
  INTO v_cogs
  FROM public.sale_items si
  JOIN public.sales s ON s.id = si.sale_id
  JOIN public.products p ON p.id = si.product_id
  WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  -- Returned COGS
  SELECT
    COALESCE(SUM(ri.quantity * p.purchase_price), 0)
  INTO v_returned_cogs
  FROM public.return_items ri
  JOIN public.returns r ON r.id = ri.return_id
  JOIN public.sales s ON s.id = r.sale_id
  JOIN public.products p ON p.id = ri.product_id
  WHERE (p_start_date IS NULL OR r.created_at >= p_start_date)
    AND (p_end_date IS NULL OR r.created_at <= p_end_date)
    AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id);

  v_net_cogs := GREATEST(0, v_cogs - v_returned_cogs);

  -- Expenses
  SELECT
    COALESCE(SUM(e.amount), 0)
  INTO v_expenses
  FROM public.expenses e
  WHERE (p_start_date IS NULL OR e.created_at >= p_start_date)
    AND (p_end_date IS NULL OR e.created_at <= p_end_date);

  -- Purchases
  SELECT
    COALESCE(SUM(pur.total_amount), 0)
  INTO v_purchases
  FROM public.purchases pur
  WHERE (p_start_date IS NULL OR pur.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pur.created_at <= p_end_date);

  -- Payment methods breakdown
  SELECT json_agg(pm_row)
  INTO v_payment_methods
  FROM (
    SELECT
      s.payment_method,
      COUNT(*) AS count,
      SUM(s.total_amount) AS total,
      SUM(COALESCE(s.amount_paid, s.total_amount)) AS paid,
      SUM(COALESCE(s.remaining_amount, 0)) AS remaining
    FROM public.sales s
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY s.payment_method
  ) pm_row;

  -- Cashiers summary
  SELECT json_agg(c_row)
  INTO v_cashiers_summary
  FROM (
    SELECT
      s.cashier_id,
      COALESCE(pr.full_name, 'كاشير غير مسجل') AS cashier_name,
      pr.role,
      COUNT(*) AS invoices_count,
      SUM(s.total_amount) AS total_sales,
      SUM(COALESCE(s.amount_paid, s.total_amount)) AS total_paid,
      SUM(COALESCE(s.remaining_amount, 0)) AS total_remaining,
      SUM(COALESCE(s.discount, 0)) AS total_discounts
    FROM public.sales s
    LEFT JOIN public.profiles pr ON pr.id = s.cashier_id
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY s.cashier_id, pr.full_name, pr.role
    ORDER BY total_sales DESC
  ) c_row;

  -- Categories summary
  SELECT json_agg(cat_row)
  INTO v_categories_summary
  FROM (
    SELECT
      COALESCE(c.name, 'بدون قسم') AS category_name,
      SUM(si.quantity) AS total_units,
      SUM(si.quantity * si.unit_price) AS total_revenue,
      SUM(si.quantity * (si.unit_price - p.purchase_price)) AS total_profit
    FROM public.sale_items si
    JOIN public.sales s ON s.id = si.sale_id
    JOIN public.products p ON p.id = si.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    WHERE (p_start_date IS NULL OR s.created_at >= p_start_date)
      AND (p_end_date IS NULL OR s.created_at <= p_end_date)
      AND (p_cashier_id IS NULL OR s.cashier_id = p_cashier_id)
    GROUP BY c.name
    ORDER BY total_revenue DESC
  ) cat_row;

  -- Timeline
  SELECT json_agg(day_row)
  INTO v_daily_timeline
  FROM (
    SELECT
      date_trunc('day', s.created_at)::date AS day,
      COUNT(*) AS invoices,
      SUM(s.total_amount) AS sales_amount,
      SUM(COALESCE(s.amount_paid, s.total_amount)) AS paid_amount
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
      'gross_sales', v_total_sales,
      'total_returns', v_total_returns,
      'returns_count', v_returns_count,
      'total_paid', v_total_paid,
      'total_remaining', v_total_remaining,
      'total_discounts', v_total_discounts,
      'invoices_count', v_invoices_count,
      'cogs', v_net_cogs,
      'expenses', v_expenses,
      'purchases', v_purchases,
      'gross_profit', v_net_sales - v_net_cogs,
      'net_profit', v_net_sales - v_net_cogs - v_expenses
    ),
    'payment_methods', COALESCE(v_payment_methods, '[]'::json),
    'cashiers', COALESCE(v_cashiers_summary, '[]'::json),
    'categories', COALESCE(v_categories_summary, '[]'::json),
    'timeline', COALESCE(v_daily_timeline, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_report(timestamptz, timestamptz, uuid) TO authenticated;

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

  -- Sales (Net after returns)
  v_sales_today numeric;
  v_sales_week numeric;
  v_sales_month numeric;
  v_sales_all numeric;
  v_inv_today int;
  v_inv_month int;

  -- Returns
  v_ret_today numeric;
  v_ret_week numeric;
  v_ret_month numeric;
  v_ret_all numeric;

  -- Cost of goods sold (Net)
  v_cogs_today numeric;
  v_cogs_week numeric;
  v_cogs_month numeric;
  v_cogs_all numeric;

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

  -- Customer Debts
  v_total_debts numeric;
BEGIN
  v_is_adm := public.is_admin(auth.uid());
  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Gross Sales
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(total_amount), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_today_start THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN created_at >= v_month_start THEN 1 END), 0),
    COALESCE(SUM(remaining_amount), 0)
  INTO
    v_sales_today,
    v_sales_week,
    v_sales_month,
    v_sales_all,
    v_inv_today,
    v_inv_month,
    v_total_debts
  FROM public.sales;

  -- Returns
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_returned ELSE 0 END), 0),
    COALESCE(SUM(total_returned), 0)
  INTO
    v_ret_today,
    v_ret_week,
    v_ret_month,
    v_ret_all
  FROM public.returns;

  -- Subtract returns from sales
  v_sales_today := GREATEST(0, v_sales_today - v_ret_today);
  v_sales_week  := GREATEST(0, v_sales_week - v_ret_week);
  v_sales_month := GREATEST(0, v_sales_month - v_ret_month);
  v_sales_all   := GREATEST(0, v_sales_all - v_ret_all);

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
      'invoices_today', v_inv_today,
      'invoices_month', v_inv_month
    ),
    'returns', json_build_object(
      'today', v_ret_today,
      'week', v_ret_week,
      'month', v_ret_month,
      'all_time', v_ret_all
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
-- END OF SCRIPT: database_updates.sql
-- ==============================================================================
