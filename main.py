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

