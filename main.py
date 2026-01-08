from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
import json
from pathlib import Path


filepath = "db.json"
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def save_new_tags(key: str, i_tags: list):

    dataset = dict()
    path = Path(filepath)

    if path.exists():
        fd = open(filepath, 'r', encoding='utf-8')
        dataset = json.load(fd)


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


def save_new_item(url: str, i_txt: list):
    dataset = dict()
    path = Path(filepath)

    if path.exists():
        fd = open(filepath, 'r', encoding='utf-8')
        dataset = json.load(fd)

    field = "dictionary.cambridge.org"
    if field not in dataset:
        dataset[field] = dict()
    chapter = dataset[field]

    if url not in chapter:
        chapter[url] = []

    items = chapter[url]  # list of dict's as items

    txt_set = set([d["example"] for d in items])
    # check dublicates
    for t in i_txt:
        if t not in txt_set:
            items.append({
                "example": t,
                "verb": "",
                "meaning": "",
                "verb-template": ""
                })
    chapter[url] = items

    with open(filepath, 'w', encoding='utf-8') as fd:
        json.dump(dataset, fd, ensure_ascii=False, indent=2)


class SelectionData(BaseModel):
    url: str
    selection_html: str


@app.post("/save-selection")
async def save_selection(data: SelectionData):

    url = data.url.strip('/')
    print(f"Received URL: {url}")

    print(f"Received Selection HTML:\n{data.selection_html}")

    soup = BeautifulSoup(data.selection_html, 'html.parser')

    seen = set()
    all_items = []
    for el in soup.select("li, span"):
        txt = el.get_text(" ", strip=True)
        if not txt:
            continue
        if txt in seen:
            continue
        seen.add(txt)

        if txt.find("More examples") < 0 and txt.find("Fewer examples") < 0:
            all_items.append(txt)

    save_new_item(url, all_items)

    #print(f"Extracted Text:\n{all_text}")

    return {
        "status": "ok",
        "all_text": all_items,
        "items_count": "items:" + str(len(all_items)),
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
        tag_base = [h.get_text(strip=True) for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'])]
        if len(tag_base) > 0:
            category = tag_base[0]
            print("category:", category)
        else:
            return { "status": "error", "tags_found": 0, "tags": [] }

    tags = [p.get_text(strip=True).lower() for p in soup.find_all(['li',])]

    print(f"Category:{category}\n{tags}")

    category = category.lower()
    save_new_tags(category, tags)

    return {
        "status": "ok",
        "tags_found": len(tags),
        "category": category
    }


if __name__ == "__main__":

    import uvicorn
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        reload=False,
    )
    server = uvicorn.Server(config)
    server.run()
