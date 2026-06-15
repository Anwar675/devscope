ALTER TABLE "load_test_run" ADD COLUMN "realtime_series" jsonb DEFAULT '[]'::jsonb NOT NULL;
