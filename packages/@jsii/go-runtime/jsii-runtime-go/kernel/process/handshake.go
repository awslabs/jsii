package process

import (
	"fmt"
	"github.com/Masterminds/semver/v3"
	"regexp"
)

type handshakeResponse struct {
	Hello string `json:"hello"`
}

func (h *handshakeResponse) runtimeVersion() (*semver.Version, error) {
	re := regexp.MustCompile("@")
	parts := re.Split(h.Hello, 3)
	switch len(parts) {
	case 2:
		return semver.NewVersion(parts[1])
	case 3:
		return semver.NewVersion(parts[2])
	default:
		return nil, fmt.Errorf("invalid handshake payload: %s", h.Hello)
	}
}
