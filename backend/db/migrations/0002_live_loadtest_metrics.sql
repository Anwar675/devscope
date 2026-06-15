ALTER TABLE "load_test_run" ADD COLUMN "requests_per_second" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "load_test_run" ADD COLUMN "error_rate" double precision DEFAULT 0 NOT NULL;
