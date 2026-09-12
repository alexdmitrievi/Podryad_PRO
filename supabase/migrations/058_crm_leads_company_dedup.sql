-- 058_crm_leads_company_dedup.sql
-- Дедупликация CRM-воронки на уровне БД: одна компания — один лид.
-- CrmBridge (Parser, leads/outreach.py) дедуплицирует на уровне приложения,
-- но гонка двух прогонов (или ручной insert) может создать дубли.
-- Идемпотентно: IF NOT EXISTS + предварительная чистка возможных дублей.

-- На случай, если дубли уже есть: оставляем самый ранний лид по каждой компании.
DELETE FROM crm_leads a
USING crm_leads b
WHERE a.company_id = b.company_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_company_id
    ON crm_leads (company_id);
