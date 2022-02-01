build: build-frontend build-backend

build-frontend:
	cd frontend && npm i && npx parcel build

build-backend:
	cd backend

run-frontend:
	cd frontend && npx parcel --https

