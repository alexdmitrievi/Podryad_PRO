-- Migration 002: Add worker profile fields for PWA onboarding
-- Добавляет поля city и about для профиля воркера через PWA.

ALTER TABLE workers ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS about TEXT NOT NULL DEFAULT '';
