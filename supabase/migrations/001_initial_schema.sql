-- Migration 001: Initial Schema
-- Создание всех таблиц с нуля.
-- Содержит полную копию schema.sql на момент создания.
-- Применять: psql -f 001_initial_schema.sql или через Supabase SQL Editor

-- Для идемпотентности: используем IF NOT EXISTS

-- Запустите schema.sql целиком — он уже содержит все CREATE TABLE IF NOT EXISTS.
-- Эта миграция является маркером для системы версионирования.

\i ../schema.sql
