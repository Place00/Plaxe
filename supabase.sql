-- ============================================================
-- MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA
-- SUPABASE DATABASE / SECURITY / FUNCTIONS
-- Version 1.0
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type public.app_role as enum ('ADMIN','TEACHER','CASHIER','STUDENT');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('ACTIVE','SUSPENDED','INACTIVE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('PRESENT','ABSENT','LATE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('PAID','UNPAID','PARTIAL','CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('PENDING','APPROVED','REJECTED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_target as enum (
    'ALL',
    'STUDENTS',
    'TEACHERS',
    'CASHIERS',
    'ADMINS',
    'CLASS',
    'INDIVIDUAL',
    'ROLE'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- HELPER FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- One account = one profile
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  role public.app_role not null default 'STUDENT',
  account_status public.account_status not null default 'ACTIVE',

  must_change_password boolean not null default false,

  avatar_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
on public.profiles(role);

create index if not exists profiles_phone_idx
on public.profiles(phone);

-- ============================================================
-- CUSTOM ROLES
-- Admin can create future roles without changing code
-- ============================================================

create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,

  active boolean not null default true,

  permissions jsonb not null default '{}'::jsonb,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROLE MEMBERSHIP
-- Allows future custom roles
-- ============================================================

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.custom_roles(id) on delete cascade,

  created_at timestamptz not null default now(),

  primary key(profile_id, role_id)
);

-- ============================================================
-- CLASSES
-- ============================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),

  class_number integer not null unique
    check (class_number between 1 and 5),

  name text not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.classes(class_number,name)
values
  (1,'Class 1'),
  (2,'Class 2'),
  (3,'Class 3'),
  (4,'Class 4'),
  (5,'Class 5')
on conflict (class_number) do nothing;

-- ============================================================
-- TEACHERS
-- ============================================================

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid unique references public.profiles(id) on delete cascade,

  full_name text not null,
  phone text,
  email text,

  assigned_class_id uuid references public.classes(id) on delete set null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_class_idx
on public.teachers(assigned_class_id);

-- ============================================================
-- STUDENTS
-- ============================================================

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid unique references public.profiles(id) on delete set null,

  student_id text not null unique,

  full_name text not null,
  father_name text,
  mother_name text,

  gender text,
  date_of_birth date,

  phone text,
  guardian_phone text,

  address text,
  previous_school text,
  educational_background text,

  current_class_id uuid references public.classes(id) on delete set null,

  registration_session text,

  photo_path text,

  registration_status text not null default 'PENDING',

  account_status public.account_status not null default 'ACTIVE',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_class_idx
on public.students(current_class_id);

create index if not exists students_name_idx
on public.students(full_name);

-- ============================================================
-- STUDENT CLASS HISTORY
-- Never destroy historical class information
-- ============================================================

create table if not exists public.student_class_history (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  class_id uuid not null references public.classes(id) on delete restrict,

  action text not null,
  reason text,

  changed_by uuid references public.profiles(id) on delete set null,

  started_at timestamptz not null default now(),
  ended_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists student_class_history_student_idx
on public.student_class_history(student_id);

-- ============================================================
-- REGISTRATIONS
-- ============================================================

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),

  registration_reference text not null unique,

  student_id uuid references public.students(id) on delete set null,

  full_name text not null,
  father_name text,
  mother_name text,

  gender text,
  date_of_birth date,

  phone text,
  guardian_phone text,

  address text,
  previous_school text,
  educational_background text,

  selected_class_id uuid references public.classes(id) on delete set null,

  registration_session text,

  photo_path text,

  rules_agreed boolean not null default false,
  information_confirmed boolean not null default false,

  confirmation_verified boolean not null default false,

  status text not null default 'PENDING',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_status_idx
on public.registrations(status);

-- ============================================================
-- CONFIRMATION CODES
-- ============================================================

create table if not exists public.confirmation_codes (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  class_id uuid not null references public.classes(id) on delete restrict,

  used boolean not null default false,

  used_by_student_id uuid references public.students(id) on delete set null,

  registration_id uuid references public.registrations(id) on delete set null,

  expires_at timestamptz,

  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),

  used_at timestamptz
);

create index if not exists confirmation_codes_class_idx
on public.confirmation_codes(class_id);

create index if not exists confirmation_codes_used_idx
on public.confirmation_codes(used);

-- ============================================================
-- ATTENDANCE
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  class_id uuid not null references public.classes(id) on delete restrict,

  attendance_date date not null default current_date,

  status public.attendance_status not null,

  marked_by uuid references public.profiles(id) on delete set null,

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(student_id, attendance_date)
);

create index if not exists attendance_student_idx
on public.attendance(student_id);

create index if not exists attendance_class_date_idx
on public.attendance(class_id, attendance_date);

-- ============================================================
-- FEE TYPES
-- Admin can create:
-- School Fees
-- Exam Fees
-- Maulid Fees
-- Registration Fees
-- etc.
-- ============================================================

create table if not exists public.fee_types (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,

  description text,

  amount numeric(12,2) not null default 0
    check(amount >= 0),

  active boolean not null default true,

  required boolean not null default false,

  created_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fee_types(name,description,amount,required)
values
  ('Registration Fee','Initial student registration fee',1000,true),
  ('Monthly Fee','Monthly school fee',500,true)
on conflict(name) do nothing;

-- ============================================================
-- PAYMENTS
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  fee_type_id uuid not null references public.fee_types(id) on delete restrict,

  amount numeric(12,2) not null
    check(amount >= 0),

  status public.payment_status not null default 'PAID',

  payment_date timestamptz not null default now(),

  payment_reference text not null unique,

  payment_method text default 'MANUAL',

  note text,

  recorded_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_student_idx
on public.payments(student_id);

create index if not exists payments_fee_idx
on public.payments(fee_type_id);

-- ============================================================
-- NOTIFICATIONS
-- Works for students, teachers, cashiers, admins and future roles
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  message text not null,

  target_type public.notification_target not null,

  target_class_id uuid references public.classes(id) on delete set null,

  target_profile_id uuid references public.profiles(id) on delete cascade,

  target_role text,

  sender_profile_id uuid references public.profiles(id) on delete set null,

  sender_label text,

  created_at timestamptz not null default now()
);

create index if not exists notifications_target_profile_idx
on public.notifications(target_profile_id);

create index if not exists notifications_class_idx
on public.notifications(target_class_id);

-- ============================================================
-- NOTIFICATION READ STATUS
-- ============================================================

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,

  profile_id uuid not null references public.profiles(id) on delete cascade,

  read_at timestamptz not null default now(),

  primary key(notification_id, profile_id)
);

-- ============================================================
-- PROFILE CHANGE REQUESTS
-- ============================================================

create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  field_name text not null,

  current_value text,
  requested_value text,

  reason text,

  status public.request_status not null default 'PENDING',

  reviewed_by uuid references public.profiles(id) on delete set null,

  reviewed_at timestamptz,

  admin_note text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- PROMOTION / DEMOTION REQUESTS
-- ============================================================

create table if not exists public.class_change_requests (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  from_class_id uuid references public.classes(id) on delete set null,

  to_class_id uuid not null references public.classes(id) on delete restrict,

  action text not null check(action in ('PROMOTION','DEMOTION','TRANSFER')),

  reason text,

  requested_by uuid references public.profiles(id) on delete set null,

  status public.request_status not null default 'PENDING',

  reviewed_by uuid references public.profiles(id) on delete set null,

  reviewed_at timestamptz,

  admin_note text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- SUSPENSIONS
-- ============================================================

create table if not exists public.suspensions (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,

  reason text not null,

  starts_at timestamptz not null default now(),

  ends_at timestamptz,

  active boolean not null default true,

  suspended_by uuid references public.profiles(id) on delete set null,

  unsuspended_by uuid references public.profiles(id) on delete set null,

  unsuspended_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists suspensions_student_idx
on public.suspensions(student_id);

-- ============================================================
-- SCHOOL RULES
-- ============================================================

create table if not exists public.school_rules (
  id uuid primary key default gen_random_uuid(),

  rule_number integer not null unique
    check(rule_number between 1 and 15),

  rule_text text not null,

  active boolean not null default true,

  updated_by uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.school_rules(rule_number,rule_text)
values
(1,'Dole ne kowane ɗalibi ya mutunta Allah, malamai, shugabanni da sauran ɗalibai.'),
(2,'Dole ne ɗalibi ya kasance mai gaskiya, amana, ladabi da kyawawan ɗabi’u a makaranta da wajen makaranta.'),
(3,'Ba a yarda da zagi, cin mutunci, faɗa, barazana ko duk wani hali da zai cutar da wani ɗalibi ba.'),
(4,'Dole ne ɗalibi ya halarci makaranta a kan lokaci kuma ya guji yawan zuwa a makare.'),
(5,'Dole ne ɗalibi ya halarci darussa akai-akai, kuma rashin zuwa makaranta ba tare da ingantaccen dalili ba ba zai zama abin yarda ba.'),
(6,'Dole ne ɗalibi ya kiyaye tsaftar jikinsa, tufafinsa da muhallin makaranta.'),
(7,'Ba a yarda ɗalibi ya lalata, sata ko amfani da kayan makaranta ba tare da izini ba.'),
(8,'Dole ne ɗalibi ya kasance cikin sutura mai kyau, ta kamala kuma wadda ta dace da koyarwar Musulunci.'),
(9,'Ba a yarda da amfani da waya ko wani abu da zai raba hankalin ɗalibi da karatu ba sai da izinin malami ko shugabanci.'),
(10,'Dole ne ɗalibi ya girmama tsarin aji, umarnin malami da sauran dokokin makaranta.'),
(11,'Ba a yarda ɗalibi ya shiga jarabawa ko wani aiki na makaranta da yaudara ko rashin gaskiya ba.'),
(12,'Dole ne ɗalibi ya biya dukkan kuɗaɗen makaranta a kan lokaci kamar yadda tsarin makaranta ya tanada.'),
(13,'Ba a yarda ɗalibi ya yi amfani da account na wani ɗalibi ko ya ba wani damar amfani da account ɗinsa ba.'),
(14,'Idan ɗalibi yana da wata matsala, koke ko buƙatar gyaran bayanansa, dole ne ya bi tsarin request da makaranta ta tanada.'),
(15,'Duk ɗalibin da ya karya dokokin makaranta zai iya fuskantar matakin ladabtarwa da ya dace da girman laifin, bisa shawarar shugabancin makaranta.')
on conflict(rule_number) do nothing;

-- ============================================================
-- SCHOOL SETTINGS
-- Key/value system allows admin to add settings later
-- ============================================================

create table if not exists public.school_settings (
  key text primary key,

  value jsonb not null default '{}'::jsonb,

  is_secret boolean not null default false,

  updated_by uuid references public.profiles(id) on delete set null,

  updated_at timestamptz not null default now()
);

insert into public.school_settings(key,value)
values
(
  'school_name_arabic',
  '"مدرسة مفتاح العلم والدراسات الإسلامية"'::jsonb
),
(
  'school_name_english',
  '"MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA"'::jsonb
),
(
  'school_location',
  '"HOTORO, KANO, NIGERIA"'::jsonb
),
(
  'school_name_hausa',
  '"Makarantar Miftahul Ilmi da Nazarin Ilimin Addinin Musulunci"'::jsonb
),
(
  'about_us',
  '"Makarantar dare ce ta Musulunci da ke mayar da hankali wajen koyar da ilimin addini, tarbiyya, ladabi da kyawawan ɗabi’u."'::jsonb
),
(
  'general_information',
  '"Barka da zuwa MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA."'::jsonb
),
(
  'contact_phone',
  '"07056845435"'::jsonb
),
(
  'contact_whatsapp',
  '"+2347056845435"'::jsonb
),
(
  'admin_access_pin',
  '""'::jsonb
),
(
  'teacher_access_pin',
  '""'::jsonb
),
(
  'student_chat_limit',
  '10'::jsonb
),
(
  'teacher_chat_limit',
  '10'::jsonb
),
(
  'cashier_chat_limit',
  '10'::jsonb
),
(
  'admin_chat_limit',
  '0'::jsonb
),
(
  'bot_iframe',
  '""'::jsonb
)
on conflict(key) do nothing;

-- ============================================================
-- BOT CHAT USAGE
-- 10 messages per user / 24 hours
-- ============================================================

create table if not exists public.bot_chat_usage (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null references public.profiles(id) on delete cascade,

  usage_date date not null default current_date,

  message_count integer not null default 0
    check(message_count >= 0),

  last_message_at timestamptz,

  unique(profile_id,usage_date)
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_id uuid references public.profiles(id) on delete set null,

  actor_role text,

  action text not null,

  entity_type text,
  entity_id text,

  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx
on public.audit_logs(actor_id);

create index if not exists audit_logs_created_idx
on public.audit_logs(created_at desc);

-- ============================================================
-- LOGIN / SECURITY EVENTS
-- ============================================================

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid references public.profiles(id) on delete set null,

  event_type text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- ============================================================
-- TEACHER ANNOUNCEMENT REQUESTS
-- ============================================================

create table if not exists public.teacher_class_requests (
  id uuid primary key default gen_random_uuid(),

  teacher_id uuid not null references public.teachers(id) on delete cascade,

  student_id uuid references public.students(id) on delete cascade,

  request_type text not null
    check(request_type in ('PROMOTION','DEMOTION','TRANSFER')),

  reason text,

  status public.request_status not null default 'PENDING',

  created_at timestamptz not null default now()
);

-- ============================================================
-- BOT SETTINGS
-- ============================================================

create table if not exists public.bot_settings (
  id boolean primary key default true,

  iframe_code text not null default '',

  enabled boolean not null default false,

  updated_by uuid references public.profiles(id) on delete set null,

  updated_at timestamptz not null default now()
);

insert into public.bot_settings(id)
values(true)
on conflict(id) do nothing;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists custom_roles_updated_at on public.custom_roles;
create trigger custom_roles_updated_at
before update on public.custom_roles
for each row execute function public.set_updated_at();

drop trigger if exists classes_updated_at on public.classes;
create trigger classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists teachers_updated_at on public.teachers;
create trigger teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists registrations_updated_at on public.registrations;
create trigger registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

drop trigger if exists attendance_updated_at on public.attendance;
create trigger attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists fee_types_updated_at on public.fee_types;
create trigger fee_types_updated_at
before update on public.fee_types
for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists school_rules_updated_at on public.school_rules;
create trigger school_rules_updated_at
before update on public.school_rules
for each row execute function public.set_updated_at();

-- ============================================================
-- SECURITY FUNCTIONS
-- ============================================================

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
      and account_status = 'ACTIVE'
  )
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'TEACHER'
      and account_status = 'ACTIVE'
  )
$$;

create or replace function public.is_cashier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'CASHIER'
      and account_status = 'ACTIVE'
  )
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'STUDENT'
      and account_status = 'ACTIVE'
  )
$$;

-- ============================================================
-- TEACHER ASSIGNED CLASS
-- ============================================================

create or replace function public.teacher_class_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select assigned_class_id
  from public.teachers
  where profile_id = auth.uid()
    and active = true
  limit 1
$$;

-- ============================================================
-- STUDENT ID GENERATOR
-- Example: Mif673yk001
-- Random middle + internal sequence
-- ============================================================

create sequence if not exists public.student_internal_seq
start 1
increment 1;

create or replace function public.generate_student_id()
returns text
language plpgsql
as $$
declare
  random_part text;
  serial_part text;
  result text;
begin

  random_part :=
    substr(
      encode(gen_random_bytes(4),'hex'),
      1,
      4
    );

  serial_part :=
    lpad(
      nextval('public.student_internal_seq')::text,
      3,
      '0'
    );

  result :=
    'Mif'
    || substr(random_part,1,2)
    || substr(random_part,3,2)
    || serial_part;

  return result;
end;
$$;

-- ============================================================
-- GENERIC REFERENCE GENERATOR
-- ============================================================

create or replace function public.generate_reference(prefix text)
returns text
language plpgsql
as $$
begin
  return upper(prefix)
    || '-'
    || upper(substr(encode(gen_random_bytes(5),'hex'),1,10));
end;
$$;

-- ============================================================
-- CONFIRMATION CODE GENERATOR
-- ============================================================

create or replace function public.generate_confirmation_code(
  p_class_number integer
)
returns text
language plpgsql
as $$
begin

  return
    'CLS'
    || p_class_number::text
    || upper(substr(encode(gen_random_bytes(5),'hex'),1,8));

end;
$$;

-- ============================================================
-- CONFIRMATION CODE VALIDATION
-- Atomic operation prevents double-use
-- ============================================================

create or replace function public.verify_confirmation_code(
  p_code text,
  p_class_id uuid,
  p_registration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.confirmation_codes%rowtype;
begin

  select *
  into v_code
  from public.confirmation_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object(
      'success',false,
      'message','Confirmation Code ba daidai ba.'
    );
  end if;

  if v_code.used then
    return jsonb_build_object(
      'success',false,
      'message','Confirmation Code ba daidai ba.'
    );
  end if;

  if v_code.class_id <> p_class_id then
    return jsonb_build_object(
      'success',false,
      'message','Confirmation Code ba daidai ba.'
    );
  end if;

  if v_code.expires_at is not null
     and v_code.expires_at < now() then
    return jsonb_build_object(
      'success',false,
      'message','Confirmation Code ba daidai ba.'
    );
  end if;

  update public.confirmation_codes
  set
    used = true,
    registration_id = p_registration_id,
    used_at = now()
  where id = v_code.id;

  update public.registrations
  set
    confirmation_verified = true,
    status = 'VERIFIED'
  where id = p_registration_id;

  return jsonb_build_object(
    'success',true,
    'message','Verification successful.'
  );

end;
$$;

-- ============================================================
-- BOT LIMIT CHECK
-- ============================================================

create or replace function public.can_use_bot(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_limit integer;
  v_count integer;
begin

  select role
  into v_role
  from public.profiles
  where id = p_profile_id;

  if v_role is null then
    return jsonb_build_object(
      'allowed',false,
      'remaining',0
    );
  end if;

  if v_role = 'ADMIN' then
    return jsonb_build_object(
      'allowed',true,
      'remaining',999999
    );
  end if;

  select
    case v_role
      when 'STUDENT' then
        coalesce(
          (select (value #>> '{}')::integer
           from public.school_settings
           where key='student_chat_limit'),
          10
        )

      when 'TEACHER' then
        coalesce(
          (select (value #>> '{}')::integer
           from public.school_settings
           where key='teacher_chat_limit'),
          10
        )

      when 'CASHIER' then
        coalesce(
          (select (value #>> '{}')::integer
           from public.school_settings
           where key='cashier_chat_limit'),
          10
        )

      else 10
    end
  into v_limit;

  select message_count
  into v_count
  from public.bot_chat_usage
  where profile_id = p_profile_id
    and usage_date = current_date;

  v_count := coalesce(v_count,0);

  return jsonb_build_object(
    'allowed', v_count < v_limit,
    'remaining', greatest(v_limit - v_count,0),
    'limit',v_limit,
    'used',v_count
  );

end;
$$;

-- ============================================================
-- RECORD BOT MESSAGE
-- ============================================================

create or replace function public.record_bot_message(
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_limit integer;
  v_count integer;
begin

  select role
  into v_role
  from public.profiles
  where id = p_profile_id;

  if v_role = 'ADMIN' then
    return jsonb_build_object(
      'allowed',true,
      'remaining',999999
    );
  end if;

  select
    case v_role
      when 'STUDENT' then
        coalesce((select (value #>> '{}')::integer
          from public.school_settings
          where key='student_chat_limit'),10)

      when 'TEACHER' then
        coalesce((select (value #>> '{}')::integer
          from public.school_settings
          where key='teacher_chat_limit'),10)

      when 'CASHIER' then
        coalesce((select (value #>> '{}')::integer
          from public.school_settings
          where key='cashier_chat_limit'),10)

      else 10
    end
  into v_limit;

  insert into public.bot_chat_usage(
    profile_id,
    usage_date,
    message_count,
    last_message_at
  )
  values(
    p_profile_id,
    current_date,
    1,
    now()
  )
  on conflict(profile_id,usage_date)
  do update set
    message_count =
      public.bot_chat_usage.message_count + 1,
    last_message_at = now();

  select message_count
  into v_count
  from public.bot_chat_usage
  where profile_id = p_profile_id
    and usage_date = current_date;

  return jsonb_build_object(
    'allowed',v_count <= v_limit,
    'remaining',greatest(v_limit-v_count,0),
    'limit',v_limit,
    'used',v_count
  );

end;
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.custom_roles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.classes enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_class_history enable row level security;
alter table public.registrations enable row level security;
alter table public.confirmation_codes enable row level security;
alter table public.attendance enable row level security;
alter table public.fee_types enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.profile_change_requests enable row level security;
alter table public.class_change_requests enable row level security;
alter table public.suspensions enable row level security;
alter table public.school_rules enable row level security;
alter table public.school_settings enable row level security;
alter table public.bot_chat_usage enable row level security;
alter table public.audit_logs enable row level security;
alter table public.security_events enable row level security;
alter table public.teacher_class_requests enable row level security;
alter table public.bot_settings enable row level security;

-- ============================================================
-- PUBLIC READ POLICIES
-- Only non-sensitive website information
-- ============================================================

create policy "public read classes"
on public.classes
for select
using (active = true);

create policy "public read rules"
on public.school_rules
for select
using (active = true);

create policy "public read public settings"
on public.school_settings
for select
using (
  is_secret = false
);

-- ============================================================
-- PROFILE POLICIES
-- ============================================================

create policy "users read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "admin read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "admin update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- ADMIN POLICIES
-- ============================================================

create policy "admin all students"
on public.students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all teachers"
on public.teachers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all registrations"
on public.registrations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all confirmation codes"
on public.confirmation_codes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all attendance"
on public.attendance
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all payments"
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all fee types"
on public.fee_types
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all settings"
on public.school_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all rules"
on public.school_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all custom roles"
on public.custom_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all profile roles"
on public.profile_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all suspensions"
on public.suspensions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

create policy "admin all profile requests"
on public.profile_change_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all class requests"
on public.class_change_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all notifications"
on public.notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin all bot settings"
on public.bot_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- STUDENT POLICIES
-- ============================================================

create policy "student read own student record"
on public.students
for select
to authenticated
using (profile_id = auth.uid());

create policy "student read own attendance"
on public.attendance
for select
to authenticated
using (
  student_id in (
    select id
    from public.students
    where profile_id = auth.uid()
  )
);

create policy "student read own payments"
on public.payments
for select
to authenticated
using (
  student_id in (
    select id
    from public.students
    where profile_id = auth.uid()
  )
);

create policy "student create profile request"
on public.profile_change_requests
for insert
to authenticated
with check (
  student_id in (
    select id
    from public.students
    where profile_id = auth.uid()
  )
);

create policy "student read own requests"
on public.profile_change_requests
for select
to authenticated
using (
  student_id in (
    select id
    from public.students
    where profile_id = auth.uid()
  )
);

create policy "student read own notifications"
on public.notifications
for select
to authenticated
using (
  target_profile_id = auth.uid()
  or target_type = 'ALL'
  or (
    target_type = 'STUDENTS'
    and public.is_student()
  )
  or (
    target_type = 'CLASS'
    and target_class_id = (
      select current_class_id
      from public.students
      where profile_id = auth.uid()
      limit 1
    )
  )
);

create policy "student notification reads"
on public.notification_reads
for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- ============================================================
-- TEACHER POLICIES
-- ============================================================

create policy "teacher read assigned students"
on public.students
for select
to authenticated
using (
  public.is_teacher()
  and current_class_id = public.teacher_class_id()
);

create policy "teacher read assigned attendance"
on public.attendance
for select
to authenticated
using (
  public.is_teacher()
  and class_id = public.teacher_class_id()
);

create policy "teacher mark attendance"
on public.attendance
for insert
to authenticated
with check (
  public.is_teacher()
  and class_id = public.teacher_class_id()
);

create policy "teacher update attendance"
on public.attendance
for update
to authenticated
using (
  public.is_teacher()
  and class_id = public.teacher_class_id()
)
with check (
  public.is_teacher()
  and class_id = public.teacher_class_id()
);

create policy "teacher read own teacher record"
on public.teachers
for select
to authenticated
using (
  profile_id = auth.uid()
);

create policy "teacher read assigned class"
on public.classes
for select
to authenticated
using (
  id = public.teacher_class_id()
  or active = true
);

create policy "teacher create class requests"
on public.class_change_requests
for insert
to authenticated
with check (
  public.is_teacher()
  and requested_by = auth.uid()
  and from_class_id = public.teacher_class_id()
);

-- ============================================================
-- CASHIER POLICIES
-- Cashier can see students/classes and manage payments
-- ============================================================

create policy "cashier read students"
on public.students
for select
to authenticated
using (public.is_cashier());

create policy "cashier read teachers"
on public.teachers
for select
to authenticated
using (public.is_cashier());

create policy "cashier read classes"
on public.classes
for select
to authenticated
using (public.is_cashier());

create policy "cashier read fee types"
on public.fee_types
for select
to authenticated
using (
  public.is_cashier()
  or public.is_admin()
);

create policy "cashier read payments"
on public.payments
for select
to authenticated
using (
  public.is_cashier()
  or public.is_admin()
);

create policy "cashier create payments"
on public.payments
for insert
to authenticated
with check (
  public.is_cashier()
  and recorded_by = auth.uid()
);

create policy "cashier update payments"
on public.payments
for update
to authenticated
using (public.is_cashier())
with check (public.is_cashier());

-- ============================================================
-- BOT USAGE
-- ============================================================

create policy "user own bot usage"
on public.bot_chat_usage
for select
to authenticated
using (profile_id = auth.uid());

-- ============================================================
-- NOTIFICATION SENDING
-- Admin full access.
-- Teachers can create notifications for their class.
-- Cashier permissions can later be controlled through role permissions.
-- ============================================================

create policy "teacher send class notifications"
on public.notifications
for insert
to authenticated
with check (
  public.is_teacher()
  and sender_profile_id = auth.uid()
  and target_type in ('CLASS','INDIVIDUAL')
  and target_class_id = public.teacher_class_id()
);

create policy "cashier send allowed notifications"
on public.notifications
for insert
to authenticated
with check (
  public.is_cashier()
  and sender_profile_id = auth.uid()
  and target_type in ('INDIVIDUAL','CLASS')
);

-- ============================================================
-- STORAGE
-- ============================================================

insert into storage.buckets
  (id,name,public)
values
  ('student-photos','student-photos',false),
  ('school-assets','school-assets',false)
on conflict(id) do nothing;

-- Student photos:
-- Admin can access all.
-- Student can access own path.
-- Teacher can access students in assigned class.
-- Cashier should not need photos by default.

create policy "authenticated upload student photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-photos'
);

create policy "admin read student photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-photos'
  and public.is_admin()
);

create policy "student read own photo"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-photos'
  and name like auth.uid()::text || '/%'
);

create policy "admin delete student photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-photos'
  and public.is_admin()
);

-- ============================================================
-- INITIAL SECURITY NOTE
-- ============================================================

-- DO NOT PUT REAL ADMIN PASSWORDS IN THIS FILE.
-- DO NOT PUT SUPABASE SERVICE_ROLE KEY IN FRONTEND.
--
-- Admin PIN and Teacher PIN will be configured by the application
-- after initial setup.
--
-- The frontend will NEVER receive service_role credentials.
--
-- The anon/public Supabase key is the only key that belongs in
-- config.js/config.example.js.
--
-- ============================================================
-- END OF SUPABASE SCHEMA
-- ============================================================
