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
    INSERT INTO users (email, password_hash, name)
    VALUES (
      'test@test.com',
      '$2b$12$QbFjPsyfsOlkPNtGTHyoiuaBg62Z57hkETevz8q7IqvaVrPoZzwsW',
      'Demo Account'
    )
    RETURNING id INTO demo_user_id;
  ELSE
    UPDATE users
    SET
      password_hash = '$2b$12$QbFjPsyfsOlkPNtGTHyoiuaBg62Z57hkETevz8q7IqvaVrPoZzwsW',
      name = 'Demo Account'
    WHERE id = demo_user_id;
  END IF;

  INSERT INTO user_monthly_budgets (user_id, month_start, budget_amount_cad)
  VALUES
    (demo_user_id, (date_trunc('month', now())::date - INTERVAL '3 months')::date, 2800),
    (demo_user_id, (date_trunc('month', now())::date - INTERVAL '2 months')::date, 3200),
    (demo_user_id, (date_trunc('month', now())::date - INTERVAL '1 month')::date, 3400),
    (demo_user_id, date_trunc('month', now())::date, 3600)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad;

  jan_month_start := make_date(EXTRACT(YEAR FROM now())::int, 1, 1);

  INSERT INTO user_monthly_budgets (user_id, month_start, budget_amount_cad)
  VALUES (demo_user_id, jan_month_start, 3200)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad;

  INSERT INTO transactions (user_id, amount_cad, type, description, transaction_date)
  VALUES
    (demo_user_id, 122.45, 'Food', 'weekly grocery run', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '2 days')::date),
    (demo_user_id, 64.30, 'Transport', 'ride shares and transit', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '8 days')::date),
    (demo_user_id, 210.00, 'Utilities', 'internet and power bills', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '14 days')::date),
    (demo_user_id, 399.99, 'Education', 'online course subscription', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '4 days')::date),
    (demo_user_id, 87.25, 'Food', 'team lunch', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '9 days')::date),
    (demo_user_id, 150.50, 'Shopping', 'equipment accessories', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '17 days')::date),
    (demo_user_id, 49.99, 'Entertainment', 'streaming subscriptions', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '3 days')::date),
    (demo_user_id, 305.10, 'Travel', 'regional travel expense', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '7 days')::date),
    (demo_user_id, 96.40, 'Shopping', 'marketing materials', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '16 days')::date),
    (demo_user_id, 33.75, 'Food', 'coffee and snacks', (date_trunc('month', now())::date + INTERVAL '1 days')::date),
    (demo_user_id, 275.20, 'Housing', 'workspace hosting cost', (date_trunc('month', now())::date + INTERVAL '5 days')::date),
    (demo_user_id, 18.99, 'Utilities', 'domain renewal', (date_trunc('month', now())::date + INTERVAL '9 days')::date),
    (demo_user_id, 142.00, 'Entertainment', 'community event tickets', (date_trunc('month', now())::date + INTERVAL '12 days')::date),
    (demo_user_id, 3800.00, 'Travel', 'january showcase spike', (jan_month_start + INTERVAL '18 days')::date)
  ON CONFLICT DO NOTHING;
END $$;
