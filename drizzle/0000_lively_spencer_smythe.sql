CREATE TABLE "guestbook_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "guestbook_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"role" varchar(500) NOT NULL,
	"dream" text NOT NULL,
	"location" varchar(500) NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"isHidden" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
