# chrome-ext

Simple template of chrome-extention


* Run FastAPI-server:
```bash
uvicorn main:app --reload --port 3400
```

Requirements:
```bash
python-dotenv
mysql-connector-python
requests
fastapi
uvicorn
python-jose[cryptography]
authlib
pyjwt
itsdangerous
google-auth
```

`pip install "python-jose[cryptography]"`

Create `.env` file
```bash
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
SECRET_KEY=<your-secret-key>
REDIRECT_URL=<your-redirect-url>
JWT_SECRET_KEY=<your-secret-key>
FRONTEND_URL=<your-frontend-url>
```


## References:

* Work with https://github.com/diixo/Google-OAuth-Integration-with-FastAPI

