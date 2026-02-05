from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
import json
from pathlib import Path
from typing import List, Literal, Optional
import re

filepath = "db.json"
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from urllib.parse import urlsplit, urlunsplit

ALLOW_PREFIXES = (
    "https://dictionary.cambridge.org/dictionary/english/",
    "https://dictionary.cambridge.org/example/english/",
    "https://dictionary.cambridge.org/search/english/?q=",
    "https://dictionary.cambridge.org/grammar/british-grammar/",
    "https://dictionary.cambridge.org/thesaurus/",
    "https://dictionary.cambridge.org/collocation/english/",
    "https://dictionary.cambridge.org/topics/",
)

def normalize_url(u: str) -> str:
    # убираем фрагмент (#...), оставляем query
    s = urlsplit(u)
    return urlunsplit((s.scheme, s.netloc, s.path, s.query, ""))


def filter_str(s: str) -> str:
    import re
    if s is not None:
        s = re.sub(r"\s+([.,!?:;\)])", r"\1", s)   # пробелы перед пунктуацией и ')'
        s = re.sub(r"(\()\s+", r"\1", s)           # пробелы после '('
    return s



def load_links_fragment(path: str) -> list[str]:

    HREF_RE = re.compile(r'href="([^"]+)"')

    seen = set()
    out = []

    file_path = Path(path)
    if file_path.is_file():
        text = file_path.read_text(encoding="utf-8")
        links = HREF_RE.findall(text)

        # unique preserving order
        for u in links:
            seen.add(u)
            out.append(u)
    return out


def merge_preserve_order(loaded: list[str], incoming: list[str]) -> list[str]:
    seen = set(loaded)
    result = list(loaded)

    for u in incoming:
        if u not in seen:
            seen.add(u)
            result.append(u)

    return result


def write_new_urls(incoming_urls):

    output_name = "dictionary.cambridge.org-urls.html"
    seen = set()

    for u in incoming_urls:
        if not u:
            continue
        nu = normalize_url(u)

        if nu.startswith(ALLOW_PREFIXES) and nu not in seen:
            seen.add(nu)

    #####################

    loaded_urls = load_links_fragment(output_name)

    result_list = merge_preserve_order(loaded_urls, seen)

    print("result_urls:", len(result_list), "loaded:", len(loaded_urls))

    with open(output_name, "w", encoding="utf-8") as f:
        f.writelines(
            f'<a href="{u}" target="_blank" rel="noopener noreferrer">{u}</a><br>\n'
            for u in result_list
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


class Item(BaseModel):
    kind: Literal["def", "eg", "deg", "exm", "egli", "etc", "other"]
    html: str = Field(min_length=1)

class ScrapePayload(BaseModel):
    url: str
    items: List[Item]
    urls: Optional[List[str]] = []

class SelectionData(BaseModel):
    url: str
    selection_html: str


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    txt = soup.get_text(" ", strip=True)
    txt = txt.replace("=", "")
    txt = txt.replace("’", "'")
    txt = txt.replace("–", "-")
    return txt


@app.post("/parse-save")
async def scrape_ordered(payload: ScrapePayload):
    print(f"/parse-save items.sz={len(payload.items)}, urls.sz={len(payload.urls)}")

    # if not payload.items:
    #     raise HTTPException(status_code=400, detail="Empty items")

    data_set = dict()
    urls_set = set()

    out_path = Path("dictionary.cambridge.org-parsing.jsonl")

    if out_path.is_file():
        with out_path.open("r", encoding="utf-8") as fin:
            for line in fin:
                txt = line.strip()

                if not txt:
                    continue

                obj = json.loads(line)

                url = obj.get("url", None)

                example = obj.get("example", None)
                example = filter_str(example)
                if example is not None and example not in data_set:
                    data_set[example] = obj.get("ext", "")

                    if url is not None:
                        urls_set.add(url)

    ##########################################################################
    out_urls = Path("dictionary.cambridge.org-urls.jsonl")

    # converting
    if len(urls_set) > 0:
        with out_path.open("w", encoding="utf-8") as fin:
            for k, v in data_set.items():
                rec = {
                    "ext": v,
                    "example": k,
                }
                fin.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fin.flush()

        with out_urls.open("w", encoding="utf-8") as f:
            for u in urls_set:
                f.write(json.dumps({"url": u}, ensure_ascii=False) + "\n")
            f.flush()
    else:

        with out_urls.open("r", encoding="utf-8") as fin:
            for line in fin:
                txt = line.strip()

                if not txt:
                    continue

                obj = json.loads(line)

                url = obj.get("url", None)
                if url is not None:
                    urls_set.add(url)

    # append new items
    added_new = 0
    with out_path.open("a", encoding="utf-8") as f:

        for x in payload.items:
            example = html_to_text(x.html).strip()
            example = filter_str(example)

            if example not in data_set:
                added_new += 1
                rec = {
                    "ext": x.kind,
                    "example": example,
                }
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        f.flush()

    # append new url if added
    if added_new > 0:
        if payload.url not in urls_set:
            with out_urls.open("a", encoding="utf-8") as f:
                f.write(json.dumps({"url": payload.url}, ensure_ascii=False) + "\n")
                f.flush()

    urls_set.add(payload.url)
    urls_set.update(payload.urls)
    write_new_urls(urls_set)

    return {
        "ok": True,
        "url": payload.url,
        "added_new": str(added_new),
        "urls": str(len(urls_set)),
        "items_all": str(len(data_set) + added_new)
    }


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
