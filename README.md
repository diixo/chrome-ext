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

## Refs

* https://blog.futuresmart.ai/integrating-google-authentication-with-fastapi-a-step-by-step-guide


## Что делать, если хотите на сервере узнать, кто вы (через Google)
Для этого используют OAuth 2.0 с Google:

Принцип работы:

* Регистрируем Console Google Cloud расширение как WebApplication, получаем CLIENT_ID и т.д. (SECRET_KEY...) + downloaded json

* Вы на клиенте (расширение или сайт) открываете страницу авторизации Google.

* Google спрашивает разрешение и отдаёт авторизационный код.

* Вы отправляете этот код на ваш сервер.

* Сервер обменивает код на access_token и id_token (в котором есть email, имя и т.п.).

* Сервер сохраняет JWT (или сессию) и кладёт в cookie (token).
