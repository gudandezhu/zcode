package db

import (
	"database/sql"
	"fmt"
	"sync"

	_ "github.com/mattn/go-sqlite3"
	"zcode/config"
)

var (
	instance *sql.DB
	once     sync.Once
)

func Get() *sql.DB {
	once.Do(func() {
		var err error
		instance, err = sql.Open("sqlite3", config.DatabasePath+"?_journal_mode=WAL")
		if err != nil {
			panic(fmt.Sprintf("open db: %v", err))
		}
		instance.SetMaxOpenConns(1)
		if err := migrate(instance); err != nil {
			panic(fmt.Sprintf("migrate: %v", err))
		}
	})
	return instance
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			stage TEXT NOT NULL DEFAULT 'requirement',
			status TEXT NOT NULL DEFAULT 'pending',
			artifacts TEXT NOT NULL DEFAULT '[]',
			agent_name TEXT NOT NULL DEFAULT '',
			conversation_id TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT (datetime('now')),
			updated_at DATETIME DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS conversations (
			id TEXT PRIMARY KEY,
			agent_name TEXT NOT NULL,
			task_id TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT (datetime('now'))
		);
		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			conversation_id TEXT NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT (datetime('now')),
			FOREIGN KEY (conversation_id) REFERENCES conversations(id)
			);
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL DEFAULT 'main',
				agent_name TEXT NOT NULL DEFAULT '',
				task_id TEXT NOT NULL DEFAULT '',
				participants TEXT NOT NULL DEFAULT '[]',
				status TEXT NOT NULL DEFAULT 'running',
				parent_session_id TEXT NOT NULL DEFAULT '',
				max_rounds INTEGER NOT NULL DEFAULT 50,
				current_round INTEGER NOT NULL DEFAULT 0,
				current_speaker TEXT NOT NULL DEFAULT '',
				artifacts TEXT NOT NULL DEFAULT '[]',
				created_at DATETIME DEFAULT (datetime('now')),
				updated_at DATETIME DEFAULT (datetime('now'))
			);
		`)
		return err
}

func Close() {
	if instance != nil {
		instance.Close()
	}
}
