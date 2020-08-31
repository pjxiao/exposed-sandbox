VERSION = "latest"
TAG = "docker.pkg.github.com/pjxiao/exposed-sandbox/ponger"
DOCKERFILE_DIR = "."
DOCKERFILE_NAME = "Dockerfile"
DOCKERFILE_PATH = $(DOCKERFILE_DIR)/$(DOCKERFILE_NAME)

.PHONY: image
image:
	docker build -t $(TAG):$(VERSION) -f ./$(DOCKERFILE_PATH) .

.PHONY: clean
clean:
	docker rmi $(TAG):latest || true

.PHONY: push
push: clean image
	docker push $(TAG):$(VERSION)
