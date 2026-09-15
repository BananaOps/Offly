package mcp

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

// connect spins up the real streamable HTTP handler and returns a connected
// MCP client session, exercising the same path a remote agent would take.
func connect(t *testing.T) *mcpsdk.ClientSession {
	t.Helper()

	srv := httptest.NewServer(Handler(newTestStore(t), "test"))
	t.Cleanup(srv.Close)

	client := mcpsdk.NewClient(&mcpsdk.Implementation{Name: "test-client", Version: "v0"}, nil)
	session, err := client.Connect(context.Background(), &mcpsdk.StreamableClientTransport{
		Endpoint: srv.URL,
	}, nil)
	if err != nil {
		t.Fatalf("connect to MCP endpoint: %v", err)
	}
	t.Cleanup(func() { _ = session.Close() })
	return session
}

func TestEndpointListsTools(t *testing.T) {
	session := connect(t)

	res, err := session.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatalf("tools/list: %v", err)
	}

	got := map[string]bool{}
	for _, tool := range res.Tools {
		got[tool.Name] = true
		if tool.InputSchema == nil {
			t.Errorf("tool %q has no input schema", tool.Name)
		}
	}
	for _, want := range []string{"list_users", "list_teams", "list_absences", "list_holidays", "team_presence"} {
		if !got[want] {
			t.Errorf("tool %q missing from tools/list", want)
		}
	}
}

func TestEndpointCallsTeamPresence(t *testing.T) {
	session := connect(t)

	res, err := session.CallTool(context.Background(), &mcpsdk.CallToolParams{
		Name:      "team_presence",
		Arguments: map[string]any{"date": "2026-07-10", "teamId": "team-be"},
	})
	if err != nil {
		t.Fatalf("tools/call: %v", err)
	}
	if res.IsError {
		t.Fatalf("tool returned an error result: %+v", res.Content)
	}

	// The SDK fills StructuredContent from the handler's typed output.
	raw, err := json.Marshal(res.StructuredContent)
	if err != nil {
		t.Fatalf("marshal structured content: %v", err)
	}
	var out TeamPresenceOutput
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode structured content: %v", err)
	}
	if out.TeamName != "Backend" {
		t.Errorf("expected team Backend, got %q", out.TeamName)
	}
	if out.TotalMembers != 2 || out.PresentCount != 1 {
		t.Errorf("expected 1 of 2 present, got %d of %d", out.PresentCount, out.TotalMembers)
	}
}

// Invalid arguments must surface as a tool error, not a transport failure.
func TestEndpointReportsBadArguments(t *testing.T) {
	session := connect(t)

	res, err := session.CallTool(context.Background(), &mcpsdk.CallToolParams{
		Name:      "list_absences",
		Arguments: map[string]any{"startDate": "nope", "endDate": "2026-07-31"},
	})
	if err != nil {
		t.Fatalf("tools/call returned a protocol error: %v", err)
	}
	if !res.IsError {
		t.Error("expected IsError for a malformed startDate")
	}
}
