DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS notes;

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  name VARCHAR(500) NOT NULL,
  modified TIMESTAMP DEFAULT now(),
  content TEXT NOT NULL
);
