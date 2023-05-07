build: 
	docker build -t albert_gpt-bot .
run:
	docker run -d -p 3000:3000 --name albert_gpt-bot --rm albert_gpt-bot