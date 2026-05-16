package service

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"zcode/db"
	"zcode/model"
)

func CreateSession(s model.Session) (*model.Session, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	d := db.Get()
	participants, err := json.Marshal(s.Participants)
	if err != nil {
		return nil, fmt.Errorf("marshal participants: %w", err)
	}
	artifacts, err := json.Marshal(s.Artifacts)
	if err != nil {
		return nil, fmt.Errorf("marshal artifacts: %w", err)
	}
	_, err = d.Exec(
		`INSERT OR REPLACE INTO sessions (id, type, agent_name, task_id, participants, status,
			parent_session_id, max_rounds, current_round, current_speaker, artifacts, created_at, updated_at)
		VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		s.ID, s.Type, s.AgentName, s.TaskID, string(participants), s.Status,
		s.ParentSessionID, s.MaxRounds, s.CurrentRound, s.CurrentSpeaker, string(artifacts), now, now,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func GetSession(id string) (*model.Session, error) {
	d := db.Get()
	row := d.QueryRow(`SELECT id, type, agent_name, task_id, participants, status,
		parent_session_id, max_rounds, current_round, current_speaker, artifacts, created_at, updated_at
		FROM sessions WHERE id = ?`, id)
	return scanSession(row)
}

func UpdateSessionStatus(id string, status string) error {
	d := db.Get()
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := d.Exec(`UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?`, status, now, id)
	return err
}

func ListSessionsByTask(taskID string) ([]model.Session, error) {
	d := db.Get()
	rows, err := d.Query(`SELECT id, type, agent_name, task_id, participants, status,
		parent_session_id, max_rounds, current_round, current_speaker, artifacts, created_at, updated_at
		FROM sessions WHERE task_id = ? ORDER BY created_at ASC`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []model.Session
	for rows.Next() {
		var s model.Session
		var participantsJSON, artifactsJSON string
		if err := rows.Scan(&s.ID, &s.Type, &s.AgentName, &s.TaskID, &participantsJSON, &s.Status,
			&s.ParentSessionID, &s.MaxRounds, &s.CurrentRound, &s.CurrentSpeaker, &artifactsJSON, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(participantsJSON), &s.Participants); err != nil {
			return nil, fmt.Errorf("unmarshal participants for session %s: %w", s.ID, err)
		}
		if err := json.Unmarshal([]byte(artifactsJSON), &s.Artifacts); err != nil {
			return nil, fmt.Errorf("unmarshal artifacts for session %s: %w", s.ID, err)
		}
		result = append(result, s)
	}
	return result, nil
}

func GetMainSessionForTask(taskID string) (*model.Session, error) {
	d := db.Get()
	row := d.QueryRow(`SELECT id, type, agent_name, task_id, participants, status,
		parent_session_id, max_rounds, current_round, current_speaker, artifacts, created_at, updated_at
		FROM sessions WHERE task_id = ? AND type = 'main' ORDER BY created_at DESC LIMIT 1`, taskID)
	return scanSession(row)
}

func scanSession(row *sql.Row) (*model.Session, error) {
	var s model.Session
	var participantsJSON, artifactsJSON string
	err := row.Scan(&s.ID, &s.Type, &s.AgentName, &s.TaskID, &participantsJSON, &s.Status,
		&s.ParentSessionID, &s.MaxRounds, &s.CurrentRound, &s.CurrentSpeaker, &artifactsJSON, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(participantsJSON), &s.Participants); err != nil {
		return nil, fmt.Errorf("unmarshal participants: %w", err)
	}
	if err := json.Unmarshal([]byte(artifactsJSON), &s.Artifacts); err != nil {
		return nil, fmt.Errorf("unmarshal artifacts: %w", err)
	}
	return &s, nil
}
