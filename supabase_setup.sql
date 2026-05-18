-- ==========================================
-- PHASE 1 — Nouveau projet Supabase
-- ==========================================

-- ==========================================
-- Étape 2 — Créer le schéma de la base de données
-- ==========================================

-- 2.1 — Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_cron requires superuser, usually enabled in Supabase via dashboard. If not, uncomment:
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2.2 — Enum : statut de ticket
CREATE TYPE ticket_status AS ENUM ('en_attente', 'en_cours', 'cloture');

-- 2.3 — Enum : priorité de ticket
CREATE TYPE ticket_priority AS ENUM ('basse', 'normale', 'haute', 'urgente');

-- 2.4 — Enum : rôle utilisateur
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agent', 'expert', 'client');

-- 2.5 — Enum : type d'action sur ticket
CREATE TYPE action_type AS ENUM (
  'creation', 
  'prise_en_charge', 
  'reponse', 
  'reassignation', 
  'demande_info', 
  'info_recue', 
  'escalade', 
  'cloture', 
  'commentaire_interne'
);

-- 2.6 — Table : organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 — Table : profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'client',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    organization_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 — Table : categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.9 — Table : sla_configs
CREATE TABLE sla_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    priority ticket_priority NOT NULL,
    response_time_hours INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, priority)
);

-- 2.10 — Table : tickets
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    client_id UUID REFERENCES profiles(id) NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    category_id UUID REFERENCES categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'en_attente',
    priority ticket_priority NOT NULL DEFAULT 'normale',
    sla_deadline TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    satisfaction_comment TEXT,
    satisfaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.11 — Table : ticket_actions
CREATE TABLE ticket_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) NOT NULL,
    action_type action_type NOT NULL,
    comment TEXT,
    is_internal BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.12 — Vue : v_tickets_full
CREATE OR REPLACE VIEW v_tickets_full AS
SELECT 
    t.*,
    client.first_name || ' ' || client.last_name AS client_name,
    client.email AS client_email,
    agent.first_name || ' ' || agent.last_name AS assigned_name,
    agent.role AS assigned_role,
    org.name AS organization_name,
    cat.name AS category_name,
    COALESCE(
        (SELECT ta.comment 
         FROM ticket_actions ta 
         WHERE ta.ticket_id = t.id AND ta.comment IS NOT NULL AND ta.is_internal = false
         ORDER BY ta.created_at DESC LIMIT 1),
        t.description
    ) AS last_comment
FROM tickets t
LEFT JOIN profiles client ON t.client_id = client.id
LEFT JOIN profiles agent ON t.assigned_to = agent.id
LEFT JOIN organizations org ON t.organization_id = org.id
LEFT JOIN categories cat ON t.category_id = cat.id;

-- ==========================================
-- Étape 3 — Créer les triggers
-- ==========================================

-- 3.1 — Trigger : génération du code organisation
CREATE OR REPLACE FUNCTION generate_organization_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    is_unique BOOLEAN;
    attempts INTEGER := 0;
BEGIN
    IF NEW.code IS NULL THEN
        LOOP
            attempts := attempts + 1;
            -- Generate ORG-XXXXXX (6 random uppercase alphanumeric chars)
            new_code := 'ORG-' || upper(substring(md5(random()::text) from 1 for 6));
            
            SELECT NOT EXISTS (SELECT 1 FROM organizations WHERE code = new_code) INTO is_unique;
            
            IF is_unique THEN
                NEW.code := new_code;
                EXIT;
            END IF;
            
            IF attempts > 10 THEN
                RAISE EXCEPTION 'Impossible de générer un code organisation unique';
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_org_code
BEFORE INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION generate_organization_code();

-- 3.2 — Trigger : génération de la référence ticket
CREATE OR REPLACE FUNCTION generate_ticket_reference()
RETURNS TRIGGER AS $$
DECLARE
    new_ref TEXT;
    is_unique BOOLEAN;
BEGIN
    IF NEW.reference IS NULL THEN
        LOOP
            -- Generate TK-XXXXXX (6 random digits)
            new_ref := 'TK-' || lpad(floor(random() * 1000000)::text, 6, '0');
            
            SELECT NOT EXISTS (SELECT 1 FROM tickets WHERE reference = new_ref) INTO is_unique;
            
            IF is_unique THEN
                NEW.reference := new_ref;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_ticket_ref
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION generate_ticket_reference();

-- 3.3 — Trigger : création automatique du profil utilisateur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_code TEXT;
    org_id UUID;
BEGIN
    org_code := NEW.raw_user_meta_data->>'organization_code';
    
    IF org_code IS NOT NULL THEN
        SELECT id INTO org_id FROM organizations WHERE code = org_code AND is_active = true;
        
        IF org_id IS NULL THEN
            RAISE EXCEPTION 'Code organisation invalide';
        END IF;
        
        INSERT INTO public.profiles (id, role, first_name, last_name, email, organization_id)
        VALUES (
            NEW.id,
            'client',
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            NEW.email,
            org_id
        );
    ELSE
        INSERT INTO public.profiles (id, role, first_name, last_name, email, organization_id)
        VALUES (
            NEW.id,
            'client', -- Will be updated to admin manually
            COALESCE(NEW.raw_user_meta_data->>'first_name', 'Admin'),
            COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
            NEW.email,
            NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Need to recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3.4 — Trigger : assignation automatique à la création d'un ticket
CREATE OR REPLACE FUNCTION auto_assign_ticket()
RETURNS TRIGGER AS $$
DECLARE
    assignee_id UUID;
    sla_hours INTEGER;
BEGIN
    -- 1. Chercher l'agent actif avec le moins de tickets non clôturés
    SELECT p.id INTO assignee_id
    FROM profiles p
    LEFT JOIN tickets t ON t.assigned_to = p.id AND t.status != 'cloture'
    WHERE p.organization_id = NEW.organization_id 
      AND p.role = 'agent' 
      AND p.is_active = true
    GROUP BY p.id
    ORDER BY COUNT(t.id) ASC
    LIMIT 1;

    -- 2. Si aucun agent, chercher un expert
    IF assignee_id IS NULL THEN
        SELECT p.id INTO assignee_id
        FROM profiles p
        LEFT JOIN tickets t ON t.assigned_to = p.id AND t.status != 'cloture'
        WHERE p.organization_id = NEW.organization_id 
          AND p.role = 'expert' 
          AND p.is_active = true
        GROUP BY p.id
        ORDER BY COUNT(t.id) ASC
        LIMIT 1;
    END IF;

    NEW.assigned_to := assignee_id;

    -- 4. Calculer sla_deadline
    SELECT response_time_hours INTO sla_hours
    FROM sla_configs
    WHERE organization_id = NEW.organization_id AND priority = NEW.priority;

    IF sla_hours IS NOT NULL THEN
        NEW.sla_deadline := now() + (sla_hours || ' hours')::interval;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_assign_ticket
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION auto_assign_ticket();

-- 3.5 — Trigger : mise à jour de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Étape 4 — Configurer le job pg_cron (escalade SLA)
-- ==========================================

CREATE OR REPLACE FUNCTION escalate_breached_slas()
RETURNS void AS $$
DECLARE
    t RECORD;
    expert_id UUID;
BEGIN
    FOR t IN 
        SELECT id, organization_id FROM tickets 
        WHERE status IN ('en_attente', 'en_cours') 
          AND sla_breached = false 
          AND sla_deadline < now()
    LOOP
        -- a. Marquer sla_breached = true
        UPDATE tickets SET sla_breached = true WHERE id = t.id;
        
        -- b. Trouver l'expert actif le moins chargé
        SELECT p.id INTO expert_id
        FROM profiles p
        LEFT JOIN tickets t2 ON t2.assigned_to = p.id AND t2.status != 'cloture'
        WHERE p.organization_id = t.organization_id 
          AND p.role = 'expert' 
          AND p.is_active = true
        GROUP BY p.id
        ORDER BY COUNT(t2.id) ASC
        LIMIT 1;

        -- c. Si un expert est trouvé
        IF expert_id IS NOT NULL THEN
            UPDATE tickets SET assigned_to = expert_id, status = 'en_cours', updated_at = now() WHERE id = t.id;
            
            -- d. Insérer action
            INSERT INTO ticket_actions (ticket_id, actor_id, action_type, comment, is_internal)
            VALUES (t.id, expert_id, 'escalade', 'SLA dépassé — ticket automatiquement transféré à un expert', true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- To schedule this with pg_cron (requires pg_cron extension):
-- SELECT cron.schedule('hourly-sla-check', '0 * * * *', 'SELECT escalate_breached_slas()');

-- ==========================================
-- Étape 5 — Configurer Row Level Security (RLS)
-- ==========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- organizations
CREATE POLICY "admin_all_organizations" ON organizations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- profiles
CREATE POLICY "select_own_or_same_org" ON profiles FOR SELECT USING (
    id = auth.uid() OR 
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) OR
    is_admin()
);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Protect last admin
CREATE OR REPLACE FUNCTION check_last_admin() RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.is_active = false OR NEW.role != 'admin') THEN
        SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin' AND is_active = true;
        IF admin_count <= 1 THEN
            RAISE EXCEPTION 'Impossible de supprimer ou désactiver le dernier administrateur actif.';
        END IF;
    END IF;
    RETURN IF(TG_OP = 'DELETE', OLD, NEW);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_last_admin
BEFORE DELETE OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION check_last_admin();

-- tickets
CREATE POLICY "client_select_own" ON tickets FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "agent_expert_select_org" ON tickets FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'expert'))
);
CREATE POLICY "client_insert" ON tickets FOR INSERT WITH CHECK (
    client_id = auth.uid() AND 
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND 
    status = 'en_attente'
);
CREATE POLICY "agent_update" ON tickets FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'agent')
);
CREATE POLICY "expert_update" ON tickets FOR UPDATE USING (
    assigned_to = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'expert')
);
CREATE POLICY "client_update_satisfaction" ON tickets FOR UPDATE USING (client_id = auth.uid()) WITH CHECK (
    client_id = auth.uid() AND status = 'cloture'
    -- Note: RLS cannot easily enforce column-level granularity, ideally handled by API/function 
    -- or separate satisfaction table. This policy allows updating own ticket.
);

-- ticket_actions
CREATE POLICY "client_select_actions" ON ticket_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND client_id = auth.uid()) AND is_internal = false
);
CREATE POLICY "agent_expert_select_actions" ON ticket_actions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tickets t 
        JOIN profiles p ON p.organization_id = t.organization_id
        WHERE t.id = ticket_id AND p.id = auth.uid() AND p.role IN ('agent', 'expert')
    )
);
CREATE POLICY "client_insert_actions" ON ticket_actions FOR INSERT WITH CHECK (
    action_type = 'reponse' AND 
    is_internal = false AND 
    actor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND client_id = auth.uid() AND status != 'cloture')
);
CREATE POLICY "agent_expert_insert_actions" ON ticket_actions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM tickets t 
        JOIN profiles p ON p.organization_id = t.organization_id
        WHERE t.id = ticket_id AND p.id = auth.uid() AND p.role IN ('agent', 'expert')
    )
);

-- categories and sla_configs
CREATE POLICY "select_categories" ON categories FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "admin_all_categories" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "select_sla_configs" ON sla_configs FOR SELECT USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "admin_all_sla_configs" ON sla_configs FOR ALL USING (is_admin()) WITH CHECK (is_admin());
