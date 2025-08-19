-- Moukawalati Database Bootstrap Schema

-- Create databases for each service (if using separate DBs)
-- Note: This approach uses shared DB with service-specific schemas

-- Create schemas for each service
CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS invoices_service;
CREATE SCHEMA IF NOT EXISTS crm_service;
CREATE SCHEMA IF NOT EXISTS project_service;
CREATE SCHEMA IF NOT EXISTS accounting_service;
CREATE SCHEMA IF NOT EXISTS supply_chain_service;
CREATE SCHEMA IF NOT EXISTS inventory_service;
CREATE SCHEMA IF NOT EXISTS warehouse_service;
CREATE SCHEMA IF NOT EXISTS tms_service;
CREATE SCHEMA IF NOT EXISTS lms_service;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Common types and functions
CREATE TYPE status_enum AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');

-- Auth Service Tables
CREATE TABLE auth_service.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    status status_enum DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_service.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_service.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM Service Tables
CREATE TABLE crm_service.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    status status_enum DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crm_service.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES crm_service.companies(id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    position VARCHAR(100),
    status status_enum DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Service Tables
CREATE TABLE invoices_service.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID NOT NULL, -- References crm_service.companies
    contact_id UUID, -- References crm_service.contacts
    status VARCHAR(50) DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices_service.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices_service.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Service Tables
CREATE TABLE project_service.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    company_id UUID, -- References crm_service.companies
    status VARCHAR(50) DEFAULT 'planning',
    priority priority_enum DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    created_by UUID, -- References auth_service.users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_service.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES project_service.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority priority_enum DEFAULT 'medium',
    assigned_to UUID, -- References auth_service.users
    due_date DATE,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Service Tables
CREATE TABLE inventory_service.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES inventory_service.categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_service.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES inventory_service.categories(id),
    unit_price DECIMAL(15,2),
    cost_price DECIMAL(15,2),
    quantity_on_hand INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    status status_enum DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouse Service Tables
CREATE TABLE warehouse_service.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    address TEXT,
    manager_id UUID, -- References auth_service.users
    status status_enum DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_service.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID REFERENCES warehouse_service.warehouses(id),
    product_id UUID NOT NULL, -- References inventory_service.products
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER NOT NULL,
    reference_id UUID, -- Reference to order, transfer, etc.
    notes TEXT,
    created_by UUID, -- References auth_service.users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON auth_service.users(email);
CREATE INDEX idx_users_username ON auth_service.users(username);
CREATE INDEX idx_sessions_user_id ON auth_service.sessions(user_id);
CREATE INDEX idx_invoices_company_id ON invoices_service.invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices_service.invoices(status);
CREATE INDEX idx_projects_company_id ON project_service.projects(company_id);
CREATE INDEX idx_tasks_project_id ON project_service.tasks(project_id);
CREATE INDEX idx_products_sku ON inventory_service.products(sku);
CREATE INDEX idx_products_category_id ON inventory_service.products(category_id);
CREATE INDEX idx_stock_movements_warehouse_id ON warehouse_service.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_product_id ON warehouse_service.stock_movements(product_id);

-- Insert sample data for development
INSERT INTO auth_service.users (username, email, password_hash, first_name, last_name, role) VALUES
('admin', 'admin@moukawalati.com', crypt('password123', gen_salt('bf')), 'System', 'Administrator', 'admin'),
('manager', 'manager@moukawalati.com', crypt('password123', gen_salt('bf')), 'John', 'Manager', 'manager'),
('user', 'user@moukawalati.com', crypt('password123', gen_salt('bf')), 'Jane', 'User', 'user');

INSERT INTO crm_service.companies (name, industry, email, phone) VALUES
('Tech Solutions Inc', 'Technology', 'contact@techsolutions.com', '+1-555-0123'),
('Manufacturing Corp', 'Manufacturing', 'info@manufcorp.com', '+1-555-0124'),
('Retail Partners', 'Retail', 'hello@retailpartners.com', '+1-555-0125');

INSERT INTO inventory_service.categories (name, description) VALUES
('Electronics', 'Electronic devices and components'),
('Office Supplies', 'General office supplies and equipment'),
('Raw Materials', 'Manufacturing raw materials');

INSERT INTO warehouse_service.warehouses (name, code, address) VALUES
('Main Warehouse', 'MW01', '123 Industrial Blvd, Business City'),
('Secondary Warehouse', 'SW01', '456 Storage Lane, Commerce Town');