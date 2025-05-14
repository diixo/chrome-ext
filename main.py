from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup


app = FastAPI()

origins = [
    "http://localhost:3400",
    "http://127.0.0.1:3400",
    "null",
    "chrome-extension://*",
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


@app.get("/get-data")
async def get_data():
    data = ["Item 1", "Item 2", "Item 3", "Item 4"]
    return {"items": data}


@app.post("/receive-url")
async def receive_url(data: PageData):
    print(f"Received URL: {data.url}")
    print(f"Received Content:\n{data.content}")
    return {"status": "ok", "received_url": data.url, "content_length": len(data.content)}


class HtmlPage(BaseModel):
    url: str
    html: str

@app.post("/receive-html")
async def receive_html(data: HtmlPage):
    print(f"Received URL: {data.url}")

    soup = BeautifulSoup(data.html, "html.parser")

    h1_tags = [h1.get_text(strip=True) for h1 in soup.find_all("h1")]
    print("H1 Headers:", h1_tags)

    return {
        "status": "ok",
        "received_url": data.url,
        "h1_count": len(h1_tags),
        "h1_headers": h1_tags
    }


class SelectionData(BaseModel):
    url: str
    selection_html: str

@app.post("/receive-selection")
async def receive_selection(data: SelectionData):

    print(f"Received URL: {data.url}")
    print(f"Received Selection HTML:\n{data.selection_html}")

    #print(data.selection_html)

    soup = BeautifulSoup(data.selection_html, 'html.parser')

    headings = [h.get_text(strip=True) for h in soup.find_all(['h1', 'h2', 'h3', 'h4'])]

    paragraphs = [p.get_text(strip=True) for p in soup.find_all('p')]

    if (len(paragraphs) == 0):
        paragraphs = [d.get_text(strip=True) for d in soup.find_all('div')]

    #elements_text = [el.get_text(strip=True) for el in soup.find_all() if el.get_text(strip=True)]

    #all_text = soup.get_text(separator='\n', strip=True)

    print(f"Extracted Text:\n{paragraphs}")

    return {
        "status": "ok",
        "headings_found": len(headings),
        "paragraphs_found": len(paragraphs),
        "paragraphs": paragraphs
    }
