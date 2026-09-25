CREATE TABLE "beta_estimates" (
	"sector_slug" text NOT NULL,
	"as_of" date NOT NULL,
	"result" jsonb NOT NULL,
	"beta" double precision,
	"p_value" double precision,
	"p_adjusted" double precision,
	"stability" double precision,
	"r2" double precision,
	CONSTRAINT "beta_estimates_sector_slug_as_of_pk" PRIMARY KEY("sector_slug","as_of")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"symbol" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"market" text NOT NULL,
	"sector_slug" text,
	"market_cap" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controls_daily" (
	"date" date PRIMARY KEY NOT NULL,
	"spx_fut" double precision,
	"usdidr" double precision,
	"hsi" double precision,
	"coal" double precision,
	"cpo" double precision
);
--> statement-breakpoint
CREATE TABLE "daily_snapshot" (
	"date" date PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_events" (
	"id" text PRIMARY KEY NOT NULL,
	"news_id" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"sgx_entity" text NOT NULL,
	"sector_slug" text NOT NULL,
	"event_type" text NOT NULL,
	"direction" integer NOT NULL,
	"materiality" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_raw" (
	"id" text PRIMARY KEY NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"symbols" jsonb NOT NULL,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "ownership_tx" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"symbol" text NOT NULL,
	"sector_slug" text,
	"holder_name" text NOT NULL,
	"holder_type" text,
	"tx_type" text NOT NULL,
	"value" double precision,
	"pct_change" double precision,
	"tags" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices_daily" (
	"date" date NOT NULL,
	"symbol" text NOT NULL,
	"market" text NOT NULL,
	"close" double precision NOT NULL,
	"return" double precision,
	CONSTRAINT "prices_daily_date_symbol_pk" PRIMARY KEY("date","symbol")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"sgx_entity" text NOT NULL,
	"idx_symbol" text,
	"sector_slug" text NOT NULL,
	"relation_type" text NOT NULL,
	"weight" double precision NOT NULL,
	"via" text,
	"source" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sector_index" (
	"date" date NOT NULL,
	"sector_slug" text NOT NULL,
	"market" text NOT NULL,
	"return" double precision NOT NULL,
	CONSTRAINT "sector_index_date_sector_slug_market_pk" PRIMARY KEY("date","sector_slug","market")
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"gics_mapping" text,
	"exposure_score" double precision
);
