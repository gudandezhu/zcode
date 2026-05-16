package service

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"zcode/db"
	"zcode/model"
)

var stageOrder = []string{"requirement", "design", "development", "testing", "done"}

func stageIndex(stage string) int {
	for i, s := range stageOrder {
		if s == stage {
			return i
		}
	}
	return len(stageOrder)
}

func genID() string {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		// fallback to timestamp-based ID
		return fmt.Sprintf("%08x", time.Now().UnixNano()&0xFFFFFFFF)
	}
	return hex.EncodeToString(b)
}

func CreateTask(t model.TaskCreate) (*model.TaskResponse, error) {
	if t.Stage == "" {
		t.Stage = "requirement"
	}
	id := genID()
	now := time.Now().UTC().Format(time.RFC3339)
	d := db.Get()
	_, err := d.Exec(
		"INSERT INTO tasks (id, title, description, stage, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
		id, t.Title, t.Description, t.Stage, "pending", now, now,
	)
	if err != nil {
		return nil, err
	}
	resp := &model.TaskResponse{
		ID: id, Title: t.Title, Description: t.Description,
		Stage: t.Stage, Status: "pending", Artifacts: []map[string]interface{}{},
		AgentName: "", ConversationID: "",
		CreatedAt: now, UpdatedAt: now,
	}
	// auto-trigger agent session
	go triggerAgentForStage(id, t.Stage, t.Title+"\n"+t.Description)
	return resp, nil
}

func ListTasks(stage string) ([]model.TaskResponse, error) {
	d := db.Get()
	var rows *sql.Rows
	var err error
	if stage != "" {
		rows, err = d.Query("SELECT * FROM tasks WHERE stage = ? ORDER BY updated_at DESC", stage)
	} else {
		rows, err = d.Query("SELECT * FROM tasks ORDER BY updated_at DESC")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTasks(rows)
}

func GetTask(id string) (*model.TaskResponse, error) {
	d := db.Get()
	row := d.QueryRow("SELECT * FROM tasks WHERE id = ?", id)
	return scanTask(row)
}

func UpdateTask(id string, u model.TaskUpdate) (*model.TaskResponse, error) {
	existing, err := GetTask(id)
	if err != nil {
		return nil, err
	}
	title := existing.Title
	desc := existing.Description
	stage := existing.Stage
	status := existing.Status
	artifacts := existing.Artifacts
	agentName := existing.AgentName

	if u.Title != nil {
		title = *u.Title
	}
	if u.Descriptor != nil {
		desc = *u.Descriptor
	}
	if u.Stage != nil {
		stage = *u.Stage
	}
	if u.Status != nil {
		status = *u.Status
	}
	if u.Artifacts != nil {
		if err := json.Unmarshal([]byte(*u.Artifacts), &artifacts); err != nil {
			artifacts = []map[string]interface{}{}
		}
	}
	if u.AgentName != nil {
		agentName = *u.AgentName
	}
	now := time.Now().UTC().Format(time.RFC3339)
	artJSON, _ := json.Marshal(artifacts)
	d := db.Get()
	_, err = d.Exec(
		"UPDATE tasks SET title=?,description=?,stage=?,status=?,artifacts=?,agent_name=?,updated_at=? WHERE id=?",
		title, desc, stage, status, string(artJSON), agentName, now, id,
	)
	if err != nil {
		return nil, err
	}
	return &model.TaskResponse{
		ID: id, Title: title, Description: desc, Stage: stage, Status: status,
		Artifacts: artifacts, AgentName: agentName, ConversationID: existing.ConversationID,
		CreatedAt: existing.CreatedAt, UpdatedAt: now,
	}, nil
}

func AdvanceTask(id string) (*model.TaskResponse, error) {
	t, err := GetTask(id)
	if err != nil {
		return nil, err
	}
	idx := stageIndex(t.Stage)
	if idx >= len(stageOrder)-1 {
		return t, nil
	}
	next := stageOrder[idx+1]
	newStage := next
	resp, err := UpdateTask(id, model.TaskUpdate{Stage: &newStage})
	if err != nil {
		return nil, err
	}
	// auto-trigger next stage agent
	if next != "done" {
		context := t.Title + "\n" + t.Description
		sessions, _ := ListSessionsByTask(id)
		for _, s := range sessions {
			if s.Type == "main" && len(s.Artifacts) > 0 {
				for _, a := range s.Artifacts {
					if b, err := json.Marshal(a); err == nil {
						context += "\n\n" + string(b)
					}
				}
			}
		}
		go triggerAgentForStage(id, next, context)
	}
	return resp, nil
}

func triggerAgentForStage(taskID, stage, context string) {
	bridge := GetAgentBridge()
	_, err := bridge.CreateSession(stage, taskID, context)
	if err != nil {
		fmt.Printf("[agent_bridge] failed to create session for task %s stage %s: %v\n", taskID, stage, err)
	}
}

func DeleteTask(id string) error {
	d := db.Get()
	r, err := d.Exec("DELETE FROM tasks WHERE id = ?", id)
	if err != nil {
		return err
	}
	n, _ := r.RowsAffected()
	if n == 0 {
		return fmt.Errorf("not found")
	}
	return nil
}

func scanTasks(rows *sql.Rows) ([]model.TaskResponse, error) {
	var result []model.TaskResponse
	for rows.Next() {
		var t model.TaskResponse
		var artifactsJSON string
		err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Stage, &t.Status, &artifactsJSON, &t.AgentName, &t.ConversationID, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(artifactsJSON), &t.Artifacts); err != nil {
			t.Artifacts = []map[string]interface{}{}
		}
		result = append(result, t)
	}
	return result, nil
}

func scanTask(row *sql.Row) (*model.TaskResponse, error) {
	var t model.TaskResponse
	var artifactsJSON string
	err := row.Scan(&t.ID, &t.Title, &t.Description, &t.Stage, &t.Status, &artifactsJSON, &t.AgentName, &t.ConversationID, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("not found")
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(artifactsJSON), &t.Artifacts); err != nil {
		t.Artifacts = []map[string]interface{}{}
	}
	return &t, nil
}
