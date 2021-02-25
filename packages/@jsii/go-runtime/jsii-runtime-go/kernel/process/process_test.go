package process

import (
	_ "embed"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"testing"
)

//go:embed jsii-mock-runtime.js
var mockRuntimeSource []byte
var mockRuntime string

func TestMain(m *testing.M) {
	file, _ := ioutil.TempFile("", "jsii-mock-runtime.*.js")
	if _, err := file.Write(mockRuntimeSource); err != nil {
		panic(err)
	}
	file.Close()
	mockRuntime = file.Name()

	status := m.Run()

	// Clean up temporary file
	os.Remove(mockRuntime)

	os.Exit(status)
}

// TestVersionCheck ensures the version check logic works correctly. As a side
// benefit, it validates we are correctly launching custom JSII_RUNTIME processes
// as this relies on a mock implementation.
func TestVersionCheck(t *testing.T) {
	acceptedVersions := []string{"4.3.2", "4.3.1337", "4.1337.42"}

	for _, mockVersion := range acceptedVersions {
		t.Run(fmt.Sprintf("accepts version %s", mockVersion), func(t *testing.T) {
			oldJsiiRuntime := os.Getenv(JSII_RUNTIME)
			os.Setenv(JSII_RUNTIME, makeCustomRuntime(mockVersion))
			defer os.Setenv(JSII_RUNTIME, oldJsiiRuntime)

			process, err := NewProcess(fmt.Sprintf("^4.3.2"))
			if err != nil {
				t.Error(err)
				return
			}
			defer process.Close()

			var (
				request  = EchoRequest{Message: "Oh, hi!"}
				response EchoResponse
			)
			if err := process.Request(request, &response); err != nil {
				t.Error(err)
			}
			if response.Message != request.Message {
				t.Errorf("Expected %s, received %s", request.Message, response.Message)
			}
		})
	}

	rejectedVersions := []string{"3.1337.42", "5.0.0-0", "4.3.2-pre.0", "4.3.3-pre.0"}

	for _, mockVersion := range rejectedVersions {
		t.Run(fmt.Sprintf("rejects version %s", mockVersion), func(t *testing.T) {
			oldJsiiRuntime := os.Getenv(JSII_RUNTIME)
			os.Setenv(JSII_RUNTIME, makeCustomRuntime(mockVersion))
			defer os.Setenv(JSII_RUNTIME, oldJsiiRuntime)

			process, err := NewProcess(fmt.Sprintf("^4.3.2"))
			if err != nil {
				t.Error(err)
				return
			}
			defer process.Close()

			var (
				request  = EchoRequest{Message: "Oh, hi!"}
				response EchoResponse
			)
			if err := process.Request(request, &response); err == nil {
				t.Errorf("expected an error, but no error received")
			} else if !strings.Contains(err.Error(), "incompatible runtime version") {
				t.Errorf("expected incompatible runtime version error, got %s", err.Error())
			}
		})
	}
}

type EchoRequest struct {
	Message string `json:"message"`
}

type EchoResponse struct {
	Message string `json:"message"`
}

func makeCustomRuntime(mockVersion string) string {
	return fmt.Sprintf("node %s \"%s\"", mockRuntime, mockVersion)
}
