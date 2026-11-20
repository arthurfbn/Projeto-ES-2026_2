-- Referência histórica: modelo da disciplina de Banco de Dados (2026/2). NÃO executar.
-- O modelo atual vive nas migrations em apps/api/prisma. Diferenças: ver docs/referencias/README.md e ADRs 0011–0014, 0017–0019.

-- ============================================================
--  Sistema de Gestão e Agendamento de Barbearias
--  DDL - PostgreSQL
-- ============================================================

DROP TABLE IF EXISTS reviews, commission_entries, payments, appointments,
  commission_rules, barber_services, services, barber_availability,
  barber_memberships, barbershop_admins, barbershops, users CASCADE;
DROP TYPE IF EXISTS user_role, permission_level, appointment_status,
  commission_type, commission_scope, payment_method, payment_status CASCADE;

-- -------- Tipos enumerados --------
CREATE TYPE user_role          AS ENUM ('admin', 'barber', 'client');
CREATE TYPE permission_level   AS ENUM ('owner', 'manager', 'receptionist');
CREATE TYPE appointment_status AS ENUM ('pending','confirmed','in_progress','completed','cancelled','no_show');
CREATE TYPE commission_type    AS ENUM ('percentage', 'fixed', 'tiered');
CREATE TYPE commission_scope   AS ENUM ('all_services', 'specific_service');
CREATE TYPE payment_method     AS ENUM ('cash', 'card', 'pix');
CREATE TYPE payment_status     AS ENUM ('pending', 'paid', 'refunded');

-- -------- Usuários --------
CREATE TABLE users (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(120) NOT NULL,
  email         varchar(255) UNIQUE NOT NULL,
  phone         varchar(20),
  password_hash varchar(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'client',
  avatar_url    varchar(500),
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamp    NOT NULL DEFAULT now(),
  updated_at    timestamp    NOT NULL DEFAULT now()
);

-- -------- Barbearias --------
CREATE TABLE barbershops (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(120) NOT NULL,
  slug       varchar(80)  UNIQUE NOT NULL,
  address    varchar(255),
  city       varchar(80),
  phone      varchar(20),
  logo_url   varchar(500),
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamp    NOT NULL DEFAULT now()
);

-- -------- Administradores da barbearia (N:N) --------
CREATE TABLE barbershop_admins (
  user_id          uuid             NOT NULL REFERENCES users(id),
  barbershop_id    uuid             NOT NULL REFERENCES barbershops(id),
  permission_level permission_level NOT NULL DEFAULT 'manager',
  added_by         uuid             REFERENCES users(id),
  added_at         timestamp        NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, barbershop_id)
);

-- -------- Vínculo barbeiro <-> barbearia (N:N) --------
CREATE TABLE barber_memberships (
  user_id       uuid      NOT NULL REFERENCES users(id),
  barbershop_id uuid      NOT NULL REFERENCES barbershops(id),
  is_exclusive  boolean   NOT NULL DEFAULT false,
  allowed_shift varchar(20),
  is_accepting  boolean   NOT NULL DEFAULT true,
  is_active     boolean   NOT NULL DEFAULT true,
  bio           text,
  hired_at      date,
  approved_by   uuid      REFERENCES users(id),
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, barbershop_id)
);

-- -------- Disponibilidade do barbeiro --------
CREATE TABLE barber_availability (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id),
  barbershop_id uuid NOT NULL REFERENCES barbershops(id),
  weekday       int  NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  valid_from    date,
  valid_until   date
);

-- -------- Serviços --------
CREATE TABLE services (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid          NOT NULL REFERENCES barbershops(id),
  name          varchar(120)  NOT NULL,
  description   text,
  price         decimal(10,2) NOT NULL,
  duration_min  int           NOT NULL,
  is_active     boolean       NOT NULL DEFAULT true
);

-- -------- Serviços realizados por cada barbeiro (N:N) --------
CREATE TABLE barber_services (
  user_id       uuid          NOT NULL REFERENCES users(id),
  service_id    uuid          NOT NULL REFERENCES services(id),
  barbershop_id uuid          NOT NULL REFERENCES barbershops(id),
  custom_price  decimal(10,2),
  PRIMARY KEY (user_id, service_id, barbershop_id)
);

-- -------- Regras de comissão --------
CREATE TABLE commission_rules (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid             NOT NULL REFERENCES users(id),
  barbershop_id  uuid             NOT NULL REFERENCES barbershops(id),
  service_id     uuid             REFERENCES services(id),
  scope          commission_scope NOT NULL DEFAULT 'all_services',
  type           commission_type  NOT NULL,
  value          decimal(10,2)    NOT NULL,
  tier_threshold decimal(10,2),
  valid_from     date             NOT NULL DEFAULT now(),
  valid_until    date,
  created_by     uuid             REFERENCES users(id),
  created_at     timestamp        NOT NULL DEFAULT now()
);

-- -------- Agendamentos --------
CREATE TABLE appointments (
  id             uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid               NOT NULL REFERENCES users(id),
  barber_user_id uuid               NOT NULL REFERENCES users(id),
  barbershop_id  uuid               NOT NULL REFERENCES barbershops(id),
  service_id     uuid               NOT NULL REFERENCES services(id),
  starts_at      timestamp          NOT NULL,
  ends_at        timestamp          NOT NULL,
  status         appointment_status NOT NULL DEFAULT 'pending',
  price_snapshot decimal(10,2)      NOT NULL,
  notes          text,
  created_at     timestamp          NOT NULL DEFAULT now()
);

-- -------- Pagamentos --------
CREATE TABLE payments (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid           NOT NULL REFERENCES appointments(id),
  method         payment_method NOT NULL,
  amount         decimal(10,2)  NOT NULL,
  tip            decimal(10,2)  NOT NULL DEFAULT 0,
  status         payment_status NOT NULL DEFAULT 'paid',
  paid_at        timestamp,
  created_at     timestamp      NOT NULL DEFAULT now()
);

-- -------- Lançamentos de comissão (apuração) --------
CREATE TABLE commission_entries (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid          NOT NULL REFERENCES appointments(id),
  user_id          uuid          NOT NULL REFERENCES users(id),
  rule_id          uuid          REFERENCES commission_rules(id),
  base_amount      decimal(10,2) NOT NULL,
  commission_value decimal(10,2) NOT NULL,
  created_at       timestamp     NOT NULL DEFAULT now()
);

-- -------- Avaliações --------
CREATE TABLE reviews (
  id             uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid      NOT NULL UNIQUE REFERENCES appointments(id),
  client_id      uuid      NOT NULL REFERENCES users(id),
  barber_user_id uuid      NOT NULL REFERENCES users(id),
  rating         int       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  created_at     timestamp NOT NULL DEFAULT now()
);
