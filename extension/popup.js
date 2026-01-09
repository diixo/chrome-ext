
//const originUrl = 'https://viix.co'
const originUrl = 'http://127.0.0.1:8001';



function parseJwt(token)
{
  const base64Url = token.split('.')[1];
  const base64 = atob(base64Url);
  const jsonPayload = decodeURIComponent([...base64].map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}


function saveToken(user, email, token)
{
  //const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const payload = parseJwt(token);
  // payload.exp - unix time in seconds
  const expiresAt = new Date(payload.exp * 1000).toISOString();

  chrome.storage.local.set({
    "aiveex": { user, token, email, expiresAt },
  }, () => {
    console.log("Token was saved.");
    //alert(`Token was saved with expire-time: ${expiresAt}`);
  });
}


async function getStoredToken()
{
  return new Promise((resolve) => {
    chrome.storage.local.get("aiveex", (result) => {
      resolve(result.aiveex);
    });
  });
}


async function authenticate(statusEl, redirectUri)
{
  //chrome.tabs.create({ url: `${originUrl}/login` })

  chrome.identity.launchWebAuthFlow(
    {
      url: `${originUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`,
      interactive: true,
    },
    (responseUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        statusEl.textContent = "Authentication: undefined user";
        return;
      }

      const url = new URL(responseUrl);
      const token = url.searchParams.get("token");
      const email = url.searchParams.get("email");
      const user = url.searchParams.get("user");

      if (token && email && user) {
        console.log("Access Token:", token);
        console.log("Email:", email);
        statusEl.textContent = `${user}, ${email}`;
        saveToken(user, email, token);
      }
      else {
        statusEl.textContent = "Token not found in response";
      }
    }
  );
}


async function add_selection_tags()
{
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const prompt = document.getElementById('output').value;

  const [{ result: selectionHtml }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      if (range)
      {
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());
        return container.innerHTML;
      }
      return '';
    },
  });

  if (!selectionHtml) {
    alert('No text selected.');
    return;
  }

  const stored = await getStoredToken();

  try {
    const response = await fetch(`${originUrl}/add-selection-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${stored.token}`,
      },
      body: JSON.stringify({
        url: tab.url,
        tag_prompt: prompt,
        selection_html: selectionHtml,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === "ok")
    {
      document.getElementById('output').value = data.category;
      alert('Selection sent successfully!');
    }
    else
    {
      console.error('Failed to parse selection:', data);
      alert('Error: ' + (data.detail || response.status));
    }
  }
  catch (error)
  {
    console.error('Error sending selection:', error);
    alert('Request failed. See console.');
  }
}


async function search_ext()
{
  const statusEl = document.getElementById("status");

  const stored = await getStoredToken();

  if (stored && stored.token && new Date(stored.expiresAt).getTime() > Date.now())
  {
    console.log("Using stored token:", stored.token);
    statusEl.textContent = `${stored.user}, ${stored.email}`;
  }
  else
  {
    statusEl.textContent = "Authentication: undefined user";
    console.log("No valid token found, starting authentication...");
    return
  }

  const query = "aiveex search text";

  const response = await fetch(`${originUrl}/search-ext?query=${encodeURIComponent(query)}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${stored.token}`
    }
  });

  if (!response.ok) {
    console.error("Resoinse error:", response.status);
  }
  else {
    const data = await response.json();
    //const items = result.items;
    console.log("Resulted items:", data);
    document.getElementById('output').value = data
  }

}


document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById("status");
  if (!statusEl) {
    console.error("Element #status not found!");
    return;
  }

  const redirectUri = chrome.identity.getRedirectURL("provider_cb");

  const chromeExtIdEl = document.getElementById("chromeExtId");
  if (!chromeExtIdEl) {
    console.error("Element #status not found!");
  }
  else {
    const chromeUri = chrome.identity.getRedirectURL();
    chromeExtIdEl.textContent = "ID: " + new URL(chromeUri).host.split(".")[0]
  }

  stored = await getStoredToken();

  if (stored && stored.token && new Date(stored.expiresAt).getTime() > Date.now())
  {
    console.log("Using stored token:", stored.token);
    statusEl.textContent = `${stored.user}, ${stored.email}`;
  }
  else
  {
    statusEl.textContent = "Authentication: undefined user";
    console.log("No valid token found, starting authentication...");
    await authenticate(statusEl, redirectUri);
  }

  stored = await getStoredToken();

  // highlight "AI"
  function highlightAI() {
    document.body.innerHTML = document.body.innerHTML.replace(/(AI)/g, '<mark>$1</mark>');
  }

  // collect H1, H2, H3
  function collectHeaders() {
    return Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText).join('\n');
  }

  // highlight AI button
  /*
  document.getElementById('highlight').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightAI
    });
  });
  */


  document.getElementById('add-bookmark-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;
    const tag_txt = document.getElementById('output').value;

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title;
        return title;
        const meta = document.querySelector('meta[name="description"]');
        const description = meta?.content ?? null;
        return description ? `${title}: ${description}` : title;
      }
    });

    const stored = await getStoredToken();

    if (stored && stored.token && new Date(stored.expiresAt).getTime() > Date.now())
    {
      console.log("Using stored token:", stored.token);
      statusEl.textContent = `${stored.user}, ${stored.email}`;
    }
    else
    {
      statusEl.textContent = "Authentication: undefined user";
      alert('No valid user found for selection, starting authentication...!');
      await authenticate(statusEl, redirectUri);
      return;
    }

    try {
      const html_txt = result.result

      const response = await fetch(`${originUrl}/add-bookmark-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.token}`,
        },
        body: JSON.stringify({ url: currentUrl, tag_name: tag_txt, html: html_txt })
      });

      if (response.status == 200) {
        alert('Added page to Bookmark successfully!');
        document.getElementById('output').value = html_txt;
      }
      else {
        const data = await response.json();
        alert('Error: ' + (data.details || 'Unknown error'));
      }
    }
    catch (error)
    {
      console.error('Error sending URL:', error);
      alert('Error sending URL. See console.');
    }
  });


  /*
  document.getElementById('parse-save-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tag_name = document.getElementById('output').value;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => document.documentElement.outerHTML,
    }, async (results) => {
      if (results && results[0]) {
        const pageHtml = results[0].result;
        const pageUrl = tab.url;

        try {
          const response = await fetch(`${originUrl}/parse-save-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl, tag_name: tag_name, html: pageHtml })
          });

          const data = await response.json();
          if (response.ok)
          {
            document.getElementById('output').value = data.items_count
            alert('Page HTML sent successfully!');
          }
          else
          {
            alert('Failed to send HTML. Status: ' + response.status);
          }

        }
        catch (error)
        {
          console.error('Error sending HTML:', error);
          alert('Error sending HTML. See console.');
        }
      }
    });
  });
  */

document.getElementById('parse-save').addEventListener('click', async () => {
  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    // 1) Собираем данные ВНУТРИ страницы
    const [{ result: payload }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const nodes = Array.from(
          document.querySelectorAll("div.def.ddef_d.db, span.eg.deg, span.deg")
        );

        return {
          url: location.href,
          items: nodes.map((el, i) => ({
            kind:
              el.matches("div.def.ddef_d.db") ? "def" :
              el.matches("span.eg.deg")       ? "eg"  :
              el.matches("span.deg")          ? "deg" :
              "other",
            html: el.outerHTML,
          })),
        };
      },
    });

    if (!payload.items || payload.items.length === 0) {
      console.warn("Nothing found, skip sending");
      document.getElementById('output').value = "0";
      alert("Ничего не найдено на странице (0 элементов).");
      return;
    }

    // 2) Отправляем на FastAPI
    const res = await fetch(`${originUrl}/parse-save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(errText)
      throw new Error(`${res.status} ${res.statusText}\n${errText}`);
    }

    // Если ок — читаем JSON
    const data = await res.json();
    document.getElementById('output').value = data.received_sz;

    console.log("Sent OK:", data.received_sz);
    alert(`Sent: ${data.received_sz} items`);
  }
  catch (err) {
    console.error(err);
    alert("Error sending: " + (err?.message || err));
  }
});

  document.getElementById('save-selection').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result: selectionHtml }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';

        const range = sel.getRangeAt(0);
        const container = document.createElement('div');
        container.appendChild(range.cloneContents());

        let html = container.innerHTML;
        if (!sel.toString().trim()) return '';

        // если "голый текст" — экранируем (в твоём случае html уже содержит <a>, так что не трогаем)
        const hasTags = /<[^>]+>/.test(html);
        if (!hasTags) {
          const esc = (s) =>
            s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          html = esc(sel.toString());
        }

        // ВОТ ТУТ: всегда даём внешнюю границу
        return `<span class="sel-wrap">${html}</span>`;
      },
    });


    if (!selectionHtml) {
      alert('No text selected.');
      return;
    }

    const stored = await getStoredToken();

    if (stored && stored.token && new Date(stored.expiresAt).getTime() > Date.now())
    {
      console.log("Using stored token:", stored.token);
      statusEl.textContent = `${stored.user}, ${stored.email}`;
    }
    else
    {
      console.log("No valid user found for selection, starting authentication...");
      // alert('No valid user found for selection, starting authentication...!');
      // await authenticate(statusEl, redirectUri);
      // return;
    }

    try {
      const response = await fetch(`${originUrl}/save-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: tab.url,
          selection_html: selectionHtml,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "ok")
      {
        const resultText = data.all_text;
        document.getElementById('output').value = resultText;

        //alert('Selection sent successfully!');
      }
      else
      {
        console.error('Failed to parse selection:', data);
        alert('Error: ' + (data.detail || response.status));
      }
    }
    catch (error)
    {
      console.error('Error sending selection:', error);
      alert('Request failed. See console.');
    }
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", LogoutGoogle);
  }


  /*
  document.getElementById('add-selection-tags').addEventListener('click', add_selection_tags);
  */


  document.getElementById('open-main').addEventListener('click', () => {
    if (originUrl.startsWith('http://127.0.0.1') || originUrl.startsWith('http://localhost'))
    {
      targetUrl = 'http://127.0.0.1:8000';
    }
    else
    {
      targetUrl = 'https://viix.co';
    }
    chrome.tabs.create({ url: targetUrl });
    //chrome.tabs.create({ url: chrome.runtime.getURL('main.html') });
  });

  /*
  document.getElementById('search-ext').addEventListener('click', search_ext);
  */

});


/*
document.getElementById('highlight').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const walk = (node) => {
        if (node.nodeType === 3) { // Текстовый узел
          const replaced = node.nodeValue.replace(/(AI)/gi, '<span class="highlight">$1</span>');
          if (replaced !== node.nodeValue) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = replaced;
            node.replaceWith(...wrapper.childNodes);
          }
        } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          for (const child of node.childNodes) {
            walk(child);
          }
        }
      };

      walk(document.body);

      if (!document.getElementById('ai-highlight-style')) {
        const style = document.createElement('style');
        style.id = 'ai-highlight-style';
        style.textContent = `.highlight { background: yellow; color: black; }`;
        document.head.appendChild(style);
      }
    },
  });
});
*/

function LogoutGoogle()
{
  chrome.storage.local.get("aiveex", (result) => {
    const data = result.aiveex;

    if (!data) {
      console.log("User logged out already, or token is absent.");
      return;
    }

    chrome.storage.local.remove("aiveex", () => {
      if (chrome.runtime.lastError) {
        console.error("Token deleting error:", chrome.runtime.lastError);
        return;
      }

      console.log("Token was deleted. User logged out.");

      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent = "Logged out";
      }
    });
  });
}
