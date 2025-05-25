from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
import json
from pathlib import Path


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


filepath = "db.json"
dataset = dict()
path = Path(filepath)


if path.exists():
    fd = open(filepath, 'r', encoding='utf-8')
    dataset = json.load(fd)


def save_new_tags(dataset: dict, key: str, i_tags: list):
    if "tags" not in dataset:
        dataset["tags"] = dict()
    chapter = dataset["tags"]

    if key not in chapter:
        chapter[key] = []

    tags = chapter[key]
    tags_set = set(tags)
    for t in i_tags:
        if t not in tags_set: tags.append(t)
    chapter[key] = tags

    with open(filepath, 'w', encoding='utf-8') as fd:
        json.dump(dataset, fd, ensure_ascii=False, indent=2)


def save_new_item(dataset: dict, url: str, i_txt: list):
    if "content" not in dataset:
        dataset["content"] = dict()
    chapter = dataset["content"]

    if url not in chapter:
        chapter[url] = []

    txt = chapter[url]
    txt_set = set(txt)
    for t in i_txt:
        if t not in txt_set: txt.append(t)
    chapter[url] = txt

    with open(filepath, 'w', encoding='utf-8') as fd:
        json.dump(dataset, fd, ensure_ascii=False, indent=2)

"""
class PageData(BaseModel):
    url: str
    content: str

@app.get("/get-data")
async def get_data():
    data = ["Item 1", "Item 2", "Item 3", "Item 4"]
    return {"items": data}

@app.post("/receive-url")
async def receive_url(data: PageData):
    url = data.url.strip('/')
    print(f"Received URL: {url}")
    print(f"Received Content:\n{data.content}")
    return {"status": "ok", "received_url": data.url, "content_length": len(data.content)}
"""

class HtmlPage(BaseModel):
    url: str
    tag_name: str
    html: str

@app.post("/parse-html")
async def parse_html(data: HtmlPage):
    url = data.url.strip('/')
    print(f"Received URL: {url}")

    soup = BeautifulSoup(data.html, "html.parser")

    tag_name = ["h1"] if data.tag_name == "" else data.tag_name

    item_list = [item.get_text(strip=True) for item in soup.find_all(tag_name)]
    print(f"item_list.sz={len(item_list)}")
    print(item_list)

    save_new_item(dataset, url, item_list)

    return {
        "status": "ok",
        "received_url": url,
        "items_count": "items:" + str(len(item_list)),
    }


class SelectionTags(BaseModel):
    url: str
    tag_prompt: str
    selection_html: str


@app.post("/add-selection-tags")
async def add_selection_tags(data: SelectionTags):

    url = data.url.strip('/')
    print(f"Received URL: {url}")
    print(f"Received prompt: {data.tag_prompt}")
    #print(f"Received Selection HTML:\n{data.selection_html}")

    soup = BeautifulSoup(data.selection_html, 'html.parser')

    category = data.tag_prompt.strip()

    if category == "":
        tag_base = [h.get_text(strip=True) for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6',])]
        if len(tag_base) > 0:
            category = tag_base[0]
            print("category:", category)
        else:
            return { "status": "error", "tags_found": len(tags), "tags": [] }

    tags = [p.get_text(strip=True).lower() for p in soup.find_all(['li',])]

    print(f"Category:{category}\n{tags}")

    category = category.lower()
    save_new_tags(dataset, category, tags)

    return {
        "status": "ok",
        "tags_found": len(tags),
        "category": category
    }

