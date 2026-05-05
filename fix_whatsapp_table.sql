DROP TABLE IF EXISTS whatsapp_messages;
CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  message_text TEXT,
  direction VARCHAR(20) DEFAULT 'inbound',
  status VARCHAR(50) DEFAULT 'received',
  contact_name VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
DROP TABLE IF EXISTS whatsapp_messages;
CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  message_text TEXT,
  direction VARCHAR(20) DEFAULT 'inbound',
  status VARCHAR(50) DEFAULT 'received',
  contact_name VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
