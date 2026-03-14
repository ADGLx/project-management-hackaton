DO $$
DECLARE
  demo_user_id UUID;
  jan_month_start DATE;
BEGIN
  SELECT id
  INTO demo_user_id
  FROM users
  WHERE lower(email) = 'test@test.com'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    RETURN;
  END IF;

  jan_month_start := make_date(EXTRACT(YEAR FROM now())::int, 1, 1);

  INSERT INTO user_monthly_budgets (user_id, month_start, budget_amount_cad)
  VALUES (demo_user_id, jan_month_start, 3200)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad;

  INSERT INTO transactions (user_id, amount_cad, type, description, transaction_date)
  VALUES (demo_user_id, 3800.00, 'Travel', 'january showcase spike', (jan_month_start + INTERVAL '18 days')::date)
  ON CONFLICT DO NOTHING;
END $$;
