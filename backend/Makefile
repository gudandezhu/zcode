.PHONY: build run dev clean

build:
	go build -o zcode-server .

run: build
	AGENT_CONFIG_PATH=../agents/CLAUDE.md DATABASE_PATH=../zcode.db ./zcode-server

clean:
	rm -f zcode-server zcode.db
