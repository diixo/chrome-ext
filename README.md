# chrome-ext

Simple template of chrome-extention

Frontend of [Google-OAuth2-integration-with-FastAPI](https://github.com/diixo/Google-OAuth2-integration-with-FastAPI)


Switch between local/remote server into `popup.js`:
```javascript
const originUrl = 'https://viix.co'
//const originUrl = 'http://127.0.0.1:8001';
```


## Installing extention:

From Google Chrome: `Manage extensions` by `Load unpacked`(**developer**-mode): to select `extention`-directory of current repository.


## Настройка chrome-extension:ID

Если хочешь, чтобы ID расширения был постоянным — добавь приватный ключ в `manifest.json` с ключём "key".
Публичный ключ не используется, поэтому не нужен в явном виде.

* Поле key - это закодированный в base64 приватный ключ (RSA), из которого автоматически генерируется публичный ключ.

* Из публичного ключа формируется ID расширения.

* Если в `manifest.json` указать поле "key", Chrome использует именно этот ключ для генерации ID.

* Если поле "key" не указано — при каждой загрузке unpacked-расширения (в режиме разработки) Chrome генерирует новый ключ и, соответственно, новый ID.


## Генерация приватного ключа для подписи

* Установи Win64OpenSSL.

* Сгенерируй RSA ключ: `openssl genrsa -out private_key.pem 2048`

* Конвертируй в DER PKCS#8: `openssl pkcs8 -topk8 -inform PEM -outform DER -in private_key.pem -out private_key.der -nocrypt`

* Закодируй DER в base64: `base64 private_key.der > private_key.b64`

* Вставь содержимое base64 удалив пробелы - в поле "key" в `manifest.json`.

ID:
```bash
liefnpejhcabdhpfapmmngaabjioelja
```
