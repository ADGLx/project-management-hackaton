DO $$
DECLARE
  demo_user_id UUID;
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
    (demo_user_id, date_trunc('month', now())::date - INTERVAL '3 months', 2800),
    (demo_user_id, date_trunc('month', now())::date - INTERVAL '2 months', 3200),
    (demo_user_id, date_trunc('month', now())::date - INTERVAL '1 month', 3400),
    (demo_user_id, date_trunc('month', now())::date, 3600)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET budget_amount_cad = EXCLUDED.budget_amount_cad;

  INSERT INTO transactions (user_id, amount_cad, type, transaction_date)
  VALUES
    (demo_user_id, 122.45, 'groceries', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '2 days')::date),
    (demo_user_id, 64.30, 'transport', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '8 days')::date),
    (demo_user_id, 210.00, 'utilities', (date_trunc('month', now())::date - INTERVAL '3 months' + INTERVAL '14 days')::date),
    (demo_user_id, 399.99, 'software tools', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '4 days')::date),
    (demo_user_id, 87.25, 'team lunch', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '9 days')::date),
    (demo_user_id, 150.50, 'equipment', (date_trunc('month', now())::date - INTERVAL '2 months' + INTERVAL '17 days')::date),
    (demo_user_id, 49.99, 'subscriptions', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '3 days')::date),
    (demo_user_id, 305.10, 'travel', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '7 days')::date),
    (demo_user_id, 96.40, 'marketing', (date_trunc('month', now())::date - INTERVAL '1 month' + INTERVAL '16 days')::date),
    (demo_user_id, 33.75, 'coffee', (date_trunc('month', now())::date + INTERVAL '1 days')::date),
    (demo_user_id, 275.20, 'cloud hosting', (date_trunc('month', now())::date + INTERVAL '5 days')::date),
    (demo_user_id, 18.99, 'domain renewal', (date_trunc('month', now())::date + INTERVAL '9 days')::date),
    (demo_user_id, 142.00, 'events', (date_trunc('month', now())::date + INTERVAL '12 days')::date)
  ON CONFLICT DO NOTHING;
END $$;
