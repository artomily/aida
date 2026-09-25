CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"upstream_calls" integer DEFAULT 0 NOT NULL,
	"message" text
);
