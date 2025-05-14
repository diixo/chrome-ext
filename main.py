from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

origins = [
    "http://localhost:3400",
    "http://127.0.0.1:3400",
    "null",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PageData(BaseModel):
    url: str
    content: str


@app.post("/receive-url")
async def receive_url(data: PageData):
    print(f"Received URL: {data.url}")
    print(f"Received Content:\n{data.content}")
    return {"status": "ok", "received_url": data.url, "content_length": len(data.content)}
