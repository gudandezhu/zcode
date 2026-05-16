package model

type TaskCreate struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Stage       string `json:"stage"`
}

type TaskUpdate struct {
	Title      *string `json:"title"`
	Descriptor *string `json:"description"`
	Stage      *string `json:"stage"`
	Status     *string `json:"status"`
	Artifacts  *string `json:"artifacts"`
	AgentName  *string `json:"agent_name"`
}

type TaskResponse struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Stage          string   `json:"stage"`
	Status         string   `json:"status"`
	Artifacts      []map[string]interface{} `json:"artifacts"`
	AgentName      string   `json:"agent_name"`
	ConversationID string   `json:"conversation_id"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}

type ChatRequest struct {
	AgentName      string `json:"agent_name" binding:"required"`
	Message        string `json:"message" binding:"required"`
	ConversationID string `json:"conversation_id"`
	TaskID         string `json:"task_id"`
}

type AgentResponse struct {
	Name        string `json:"name"`
	Role        string `json:"role"`
	Stage       string `json:"stage"`
	Model       string `json:"model"`
	Description string `json:"description"`
}

type AgentConfig struct {
	Name         string
	Role         string
	Stage        string
	Model        string
	SystemPrompt string
}

type Session struct {
	ID              string                   `json:"id"`
	Type            string                   `json:"type"`
	AgentName       string                   `json:"agent_name"`
	TaskID          string                   `json:"task_id"`
	Participants    []string                 `json:"participants"`
	Status          string                   `json:"status"`
	ParentSessionID string                   `json:"parent_session_id"`
	MaxRounds       int                      `json:"max_rounds"`
	CurrentRound    int                      `json:"current_round"`
	CurrentSpeaker  string                   `json:"current_speaker"`
	Artifacts       []map[string]interface{} `json:"artifacts"`
	CreatedAt       string                   `json:"created_at"`
	UpdatedAt       string                   `json:"updated_at"`
}

type SessionCreateRequest struct {
	AgentName string `json:"agent_name"`
	TaskID    string `json:"task_id"`
	Context   string `json:"context"`
}

type DiscussionCreateRequest struct {
	Initiator       string `json:"initiator"`
	Participant     string `json:"participant"`
	TaskID          string `json:"task_id"`
	Topic           string `json:"topic"`
	MaxRounds       int    `json:"max_rounds"`
	ParentSessionID string `json:"parent_session_id"`
}

type UserInputRequest struct {
	Message string `json:"message"`
}

type SessionCallbackRequest struct {
	SessionID string                   `json:"session_id"`
	TaskID    string                   `json:"task_id"`
	AgentName string                   `json:"agent_name"`
	Status    string                   `json:"status"`
	Artifacts []map[string]interface{} `json:"artifacts"`
	Advance   bool                     `json:"advance"`
}
