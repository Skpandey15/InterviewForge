-- One Postgres instance, one database per service (schema-per-module inside).
CREATE DATABASE auth_db OWNER aip;
CREATE DATABASE interview_db OWNER aip;

\connect interview_db
CREATE EXTENSION IF NOT EXISTS vector;
