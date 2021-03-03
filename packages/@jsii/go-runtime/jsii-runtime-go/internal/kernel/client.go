package kernel

import (
	"fmt"
	"reflect"
	"runtime"
	"sync"

	"github.com/aws/jsii-runtime-go/internal/api"
	"github.com/aws/jsii-runtime-go/internal/kernel/process"
	"github.com/aws/jsii-runtime-go/internal/objectstore"
	"github.com/aws/jsii-runtime-go/internal/typeregistry"
)

var (
	clientInstance      *Client
	clientInstanceMutex sync.Mutex
	clientOnce          sync.Once
)

// The Client struct owns the jsii child process and its io interfaces. It also
// owns a map (objects) that tracks all object references by ID. This is used
// to call methods and access properties on objects passed by the runtime
// process by reference.
type Client struct {
	process *process.Process
	types   *typeregistry.TypeRegistry
	objects *objectstore.ObjectStore
}

// GetClient returns a singleton Client instance, initializing one the first
// time it is called.
func GetClient() *Client {
	clientOnce.Do(func() {
		// Locking early to be safe with a concurrent Close execution
		clientInstanceMutex.Lock()
		defer clientInstanceMutex.Unlock()

		client, err := newClient()
		if err != nil {
			panic(err)
		}

		clientInstance = client
	})

	return clientInstance
}

// CloseClient finalizes the runtime process, signalling the end of the
// execution to the jsii kernel process, and waiting for graceful termination.
//
// If a jsii Client is used *after* CloseClient was called, a new jsii kernel
// process will be initialized, and CloseClient should be called again to
// correctly finalize that, too.
func CloseClient() {
	// Locking early to be safe with a concurrent getClient execution
	clientInstanceMutex.Lock()
	defer clientInstanceMutex.Unlock()

	// Reset the "once" so a new Client would get initialized next time around
	clientOnce = sync.Once{}

	if clientInstance != nil {
		// Close the Client & reset it
		clientInstance.close()
		clientInstance = nil
	}
}

// newClient starts the kernel child process and verifies the "hello" message
// was correct.
func newClient() (*Client, error) {
	if process, err := process.NewProcess(fmt.Sprintf("^%s", version)); err != nil {
		return nil, err
	} else {
		result := &Client{
			process: process,
			objects: objectstore.New(),
			types:   typeregistry.New(),
		}

		// Register a finalizer to call Close()
		runtime.SetFinalizer(result, func(c *Client) {
			c.close()
		})

		return result, nil
	}
}

func (c *Client) Types() *typeregistry.TypeRegistry {
	return c.types
}

func (c *Client) RegisterInstance(instance reflect.Value, instanceID string) error {
	return c.objects.Register(instance, instanceID)
}

func (c *Client) request(req kernelRequester, res kernelResponder) error {
	return c.process.Request(req, res)
}

func (c *Client) FindObjectRef(obj reflect.Value) (string, bool) {
	switch obj.Kind() {
	case reflect.Struct:
		// Structs can be checked only if they are addressable, meaning
		// they are obtained from fields of an addressable struct.
		if !obj.CanAddr() {
			return "", false
		}
		obj = obj.Addr()
		fallthrough
	case reflect.Interface, reflect.Ptr:
		return c.objects.InstanceID(obj)
	default:
		// Other types cannot possibly be object references!
		return "", false
	}
}

func (c *Client) GetObject(objref api.ObjectRef) interface{} {
	if obj, ok := c.objects.GetObject(objref.InstanceID); ok {
		return obj.Interface()
	}
	panic(fmt.Errorf("no object found for ObjectRef %v", objref))
}

func (c *Client) close() {
	c.process.Close()

	// We no longer need a finalizer to run
	runtime.SetFinalizer(c, nil)
}